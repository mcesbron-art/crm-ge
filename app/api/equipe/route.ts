import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PALETTE = ["#7C3AED", "#0E7C66", "#2563EB", "#BE185D", "#C2410C", "#B08D32", "#0F766E", "#9333EA"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toIso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

/**
 * GET /api/equipe
 * RÉSERVÉ ADMIN — vue d'ensemble de la charge de l'équipe cette semaine :
 * heures loggées (time_entries), tâches actives/en retard (tasks),
 * projets actifs, absences validées, et une grille de planning
 * lundi→vendredi construite à partir des saisies de temps réelles.
 */
export async function GET() {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(profile.role, "view_all_pages")) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const monday = mondayOf(new Date());
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { day: ["Lun", "Mar", "Mer", "Jeu", "Ven"][i], date: String(d.getDate()), iso: toIso(d) };
  });
  const weekStart = weekDays[0].iso;
  const weekEnd = weekDays[weekDays.length - 1].iso;
  const today = toIso(new Date());

  const [{ data: collabs, error: collabsErr }, { data: tasks }, { data: entries }, { data: absences }, { data: projects }] = await Promise.all([
    admin.from("collaborateurs").select("id, nom, email, pole, avatar, avatar_url, color, role, actif, base_heures").eq("actif", true).order("nom"),
    admin.from("tasks").select("id, project_id, assigned_to, done, due_date"),
    admin.from("time_entries").select("collaborateur_id, project_id, date, duration_minutes").gte("date", weekStart).lte("date", weekEnd),
    admin.from("absences").select("collaborateur_id, start_date, end_date").eq("status", "validee").lte("start_date", weekEnd).gte("end_date", weekStart),
    admin.from("projects").select("id, name"),
  ]);
  if (collabsErr) return NextResponse.json({ error: collabsErr.message }, { status: 500 });

  const projectName = new Map((projects ?? []).map(p => [p.id as string, p.name as string]));

  const members = (collabs ?? []).map(c => {
    const id = c.id as string;
    const myTasks = (tasks ?? []).filter(t => t.assigned_to === id);
    const activeTasks = myTasks.filter(t => !t.done);
    const overdueTasks = activeTasks.filter(t => t.due_date && (t.due_date as string) < today);
    const activeProjectIds = Array.from(new Set(activeTasks.map(t => t.project_id as string).filter(Boolean)));
    const activeProjects = activeProjectIds.map(pid => ({ id: pid, name: projectName.get(pid) ?? "—" }));

    const projectColor = new Map<string, string>();
    activeProjectIds.forEach((pid, i) => projectColor.set(pid, PALETTE[i % PALETTE.length]));

    const myEntries = (entries ?? []).filter(e => e.collaborateur_id === id);
    const weekMinutes = myEntries.reduce((s, e) => s + (e.duration_minutes as number), 0);
    const baseHeures = (c.base_heures as number | null) ?? 35;
    const load = baseHeures > 0 ? Math.round((weekMinutes / 60 / baseHeures) * 100) : 0;

    const myLeaves = (absences ?? []).filter(a => a.collaborateur_id === id);
    const isOnLeave = (iso: string) => myLeaves.some(a => (a.start_date as string) <= iso && iso <= (a.end_date as string));

    const planning = weekDays.map(wd => {
      if (isOnLeave(wd.iso)) return { onLeave: true, blocks: [] as { projectId: string; projectName: string; minutes: number; color: string }[] };
      const dayEntries = myEntries.filter(e => e.date === wd.iso);
      const byProject = new Map<string, number>();
      for (const e of dayEntries) {
        const pid = e.project_id as string;
        byProject.set(pid, (byProject.get(pid) ?? 0) + (e.duration_minutes as number));
      }
      const blocks = [...byProject.entries()].map(([pid, minutes]) => ({
        projectId: pid, projectName: projectName.get(pid) ?? "—", minutes,
        color: projectColor.get(pid) ?? PALETTE[0],
      }));
      return { onLeave: false, blocks };
    });

    return {
      id, nom: c.nom as string, email: c.email as string, pole: (c.pole as string | null) ?? "",
      avatar: (c.avatar as string | null) ?? (c.nom as string).slice(0, 2).toUpperCase(),
      avatarUrl: (c.avatar_url as string | null) ?? null, color: (c.color as string | null) ?? "#8C6D2F",
      role: c.role as "admin" | "collaborateur", baseHeures, weekMinutes, load,
      activeTasksCount: activeTasks.length, overdueTasksCount: overdueTasks.length,
      activeProjects, isOnLeaveToday: isOnLeave(today), planning,
    };
  });

  const withLoad = members.filter(m => m.baseHeures > 0);
  const teamStats = {
    avgLoad: withLoad.length ? Math.round(withLoad.reduce((s, m) => s + m.load, 0) / withLoad.length) : 0,
    overdueTotal: members.reduce((s, m) => s + m.overdueTasksCount, 0),
    activeTasksTotal: members.reduce((s, m) => s + m.activeTasksCount, 0),
    activeProjectsTotal: new Set(members.flatMap(m => m.activeProjects.map(p => p.id))).size,
    overloadedCount: members.filter(m => m.load > 100).length,
  };

  return NextResponse.json({ weekDays, members, teamStats });
}
