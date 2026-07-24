import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { TASK_PRIORITY_COLOR } from "@/lib/task-taxonomy";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_COLOR } from "@/lib/absence-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Même vocabulaire/couleurs que /api/tickets et /tickets (app/(app)/tickets/page.tsx),
// dupliqué ici pour ne pas coupler le dashboard à une route non partagée.
const TICKET_STATUT_FR: Record<string, string> = { ouvert: "Nouveau", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé" };
const TICKET_STATUS_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  "Nouveau":  { color: "#B08D32", bg: "#F6EFDD", dot: "#C9A24E" },
  "En cours": { color: "#2563EB", bg: "#E6EEFB", dot: "#2563EB" },
  "Résolu":   { color: "#1F8A5B", bg: "#E4F3EC", dot: "#1F8A5B" },
  "Fermé":    { color: "#6E6A5E", bg: "#EFEDE8", dot: "#6E6A5E" },
};
const TASK_PRIORITY_BG: Record<string, string> = {
  Urgente: "#FCE4E4", Haute: "#FBEAE0", Normale: "#E6EEFB", Basse: "#F0EFEA",
};
function ticketRef(row: { axonaut_ticket_id: number | null; id: string; created_via: string }): string {
  if (row.created_via === "axonaut" && row.axonaut_ticket_id) return `#AX-${row.axonaut_ticket_id}`;
  return `#TKT-${row.id.slice(0, 8).toUpperCase()}`;
}
function taskRef(id: string): string {
  return `#TSK-${id.slice(0, 8).toUpperCase()}`;
}
function fmtShort(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function dueInfo(dueDate: string | null, today: string, tomorrow: string): { label: string; color: string; weight: number } {
  if (!dueDate) return { label: "—", color: "#5C5A52", weight: 500 };
  if (dueDate < today) return { label: fmtShort(dueDate), color: "#DC2626", weight: 700 };
  if (dueDate === today) return { label: "Auj.", color: "#C2410C", weight: 700 };
  if (dueDate === tomorrow) return { label: "Demain", color: "#5C5A52", weight: 500 };
  return { label: fmtShort(dueDate), color: "#5C5A52", weight: 500 };
}

type ProjectRow = { id: string; name: string };
type TaskRow = { id: string; project_id: string; label: string; done: boolean; due_date: string | null; assigned_to: string | null; priority: string | null };
type CollabRow = { id: string; nom: string; color: string | null; avatar: string | null };
type TicketRow = { id: string; assigned_to: string | null; statut: string; titre: string; client_name: string | null; created_at: string; created_via: string; axonaut_ticket_id: number | null };
type TicketCollabRow = { ticket_id: string; collaborateur_id: string };
type TaskCollabRow = { task_id: string; collaborateur_id: string };
type MyTimeRow = { date: string; duration_minutes: number };
type MyOvertimeRow = { id: string; date: string; hours: number; status: string; project: { name: string; client_name: string } | null };

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}
// Attention : ne PAS utiliser toISOString().slice(0,10) ici — pour un Date
// construit à minuit local (cas de mondayOf/weekDayDates), la conversion en
// UTC recule d'un jour dans tout fuseau horaire positif (France incluse),
// ce qui désynchronise ces libellés des vraies dates "YYYY-MM-DD" stockées
// en base (colonnes DATE, comparées telles quelles côté SQL).
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Format compact "7h30" / "8h00" — utilisé par les widgets Temps passé /
// Heures supplémentaires, distinct du formatMinutes "7 h 30 min" utilisé
// ailleurs dans l'app.
function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}
function fmtHoursNum(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PROJECT_ACCENTS = ["#2563EB", "#16A34A", "#C9A24E", "#7C3AED", "#C2410C", "#BE185D"];

// Un seul et même dashboard "personnel" pour tout le monde — Admin ou
// Collaborateur voit ses propres tâches/tickets assignés, son temps passé et
// ses heures supplémentaires. Les indicateurs globaux (projets actifs,
// entonnoir de production, alertes) ont été retirés de cette page à la
// demande explicite de l'utilisateur (remplacement complet, pas de vue
// séparée par rôle).
export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const weekStart = mondayOf(new Date());
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

  const [{ data: projects }, { data: tasks }, { data: myTime }, { data: collabs }, { data: tickets }, { data: ticketCollabs }, { data: taskCollabs }, { data: myOvertimeRaw }] = await Promise.all([
    supabase.from("projects").select("id, name"),
    supabase.from("tasks").select("id, project_id, label, done, due_date, assigned_to, priority"),
    // Temps passé — toujours celui du visiteur lui-même, limité à la semaine
    // affichée par le widget (pas besoin des saisies de toute l'équipe ici).
    supabase.from("time_entries").select("date, duration_minutes").eq("collaborateur_id", session.id).gte("date", isoDate(weekStart)).lte("date", isoDate(weekEnd)),
    supabase.from("collaborateurs").select("id, nom, color, avatar").eq("actif", true),
    supabase.from("tickets").select("id, assigned_to, statut, titre, client_name, created_at, created_via, axonaut_ticket_id"),
    supabase.from("ticket_collaborators").select("ticket_id, collaborateur_id"),
    supabase.from("task_collaborators").select("task_id, collaborateur_id"),
    // Heures supplémentaires — toujours celles du visiteur lui-même (admin
    // ou collaborateur), jamais celles d'un collègue : c'est un widget
    // personnel affiché sur son propre dashboard.
    supabase.from("overtime_declarations").select("id, date, hours, status, project:projects(name, client_name)").eq("collaborateur_id", session.id).order("date", { ascending: false }),
  ]);

  const projectRows = (projects ?? []) as ProjectRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const myTimeRows = (myTime ?? []) as MyTimeRow[];
  const collabRows = (collabs ?? []) as CollabRow[];
  const ticketRows = (tickets ?? []) as TicketRow[];
  const ticketCollabRows = (ticketCollabs ?? []) as TicketCollabRow[];
  const taskCollabRows = (taskCollabs ?? []) as TaskCollabRow[];
  const myOvertimeRows = (myOvertimeRaw ?? []) as unknown as MyOvertimeRow[];

  const collabById = new Map(collabRows.map(c => [c.id, c]));
  const projectById = new Map(projectRows.map(p => [p.id, p]));

  // ── Mes tâches / mes tickets — un collaborateur (ou un admin) peut être
  // rattaché à une tâche/un ticket soit comme assigné principal, soit comme
  // collaborateur additionnel (task_collaborators / ticket_collaborators).
  const myId = session.id;
  const myTaskIds = new Set([
    ...taskRows.filter(t => t.assigned_to === myId).map(t => t.id),
    ...taskCollabRows.filter(tc => tc.collaborateur_id === myId).map(tc => tc.task_id),
  ]);
  const myTicketIds = new Set([
    ...ticketRows.filter(t => t.assigned_to === myId).map(t => t.id),
    ...ticketCollabRows.filter(tc => tc.collaborateur_id === myId).map(tc => tc.ticket_id),
  ]);

  const myTasksNotDone = taskRows.filter(t => myTaskIds.has(t.id) && !t.done);
  const myOpenTicketsList = ticketRows.filter(t => myTicketIds.has(t.id) && t.statut !== "resolu" && t.statut !== "ferme");
  const dueTodayTasks = myTasksNotDone.filter(t => t.due_date === today).length;

  const VIS = 5;
  const tasksSorted = [...myTasksNotDone].sort((a, b) => (a.due_date ?? "9999") < (b.due_date ?? "9999") ? -1 : 1);
  const taskItems = tasksSorted.slice(0, VIS).map(t => {
    const proj = projectById.get(t.project_id);
    const owner = t.assigned_to ? collabById.get(t.assigned_to) : null;
    const due = dueInfo(t.due_date, today, tomorrow);
    const priority = t.priority ?? "Normale";
    return {
      id: t.id, ref: taskRef(t.id), priority,
      prioColor: TASK_PRIORITY_COLOR[priority] ?? "#2563EB", prioBg: TASK_PRIORITY_BG[priority] ?? "#E6EEFB",
      title: t.label, project: proj?.name ?? "—",
      due: due.label, dueColor: due.color, dueWeight: due.weight,
      ownerName: owner?.nom ?? session.nom, ownerColor: owner?.color ?? session.color ?? "#8C8B83",
    };
  });

  const ticketsSorted = [...myOpenTicketsList].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  const ticketItems = ticketsSorted.slice(0, VIS).map(tk => {
    const owner = tk.assigned_to ? collabById.get(tk.assigned_to) : null;
    const statusLabel = TICKET_STATUT_FR[tk.statut] ?? "Nouveau";
    const style = TICKET_STATUS_STYLE[statusLabel] ?? TICKET_STATUS_STYLE["Nouveau"];
    return {
      id: tk.id, ref: ticketRef(tk), status: statusLabel,
      statusColor: style.color, statusBg: style.bg, statusDot: style.dot,
      title: tk.titre, client: tk.client_name ?? "Client inconnu",
      due: fmtShort(tk.created_at), dueColor: "#5C5A52", dueWeight: 500,
      ownerName: owner?.nom ?? session.nom, ownerColor: owner?.color ?? session.color ?? "#8C8B83",
    };
  });

  // ── Temps passé (semaine en cours) ──
  const weekDayDates = Array.from({ length: 7 }, (_, i) => isoDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)));
  const minutesByDay = new Map<string, number>();
  for (const e of myTimeRows) minutesByDay.set(e.date, (minutesByDay.get(e.date) ?? 0) + e.duration_minutes);

  const dailyTargetMinutes = Math.round(((session.base || 35) / 5) * 60);
  const RING_CIRC = 2 * Math.PI * 27;
  const timeDays = weekDayDates.map((d, i) => {
    const isWeekend = i >= 5;
    const minutes = minutesByDay.get(d) ?? 0;
    const isFuture = d > today;
    const logged: boolean | null = isWeekend || isFuture ? null : minutes > 0;
    const ratio = logged === null ? 0 : Math.min(1, minutes / dailyTargetMinutes);
    const dash = logged === false ? 3 : Math.round(ratio * RING_CIRC);
    let hoursColor: string, statusDot: string, statusColor: string, statusLabel: string, ringColor: string;
    if (logged === true) {
      hoursColor = "#16150F"; statusDot = "#3FBF77"; statusColor = "#1F8A5B"; statusLabel = "Saisi";
      ringColor = ratio >= 1 ? "#1F9D57" : "#C9A24E";
    } else if (logged === false) {
      hoursColor = "#C2410C"; statusDot = "#D08A4A"; statusColor = "#C2410C"; statusLabel = "Manquant"; ringColor = "#E4B08A";
    } else {
      hoursColor = "#C7C5BB"; statusDot = "#D6D4CB"; statusColor = "#A6A498"; statusLabel = "—"; ringColor = "#EDEBE2";
    }
    return {
      label: DAY_LABELS[i], date: new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      hours: logged === null ? "—" : fmtHM(minutes), hoursColor, statusDot, statusColor, statusLabel, dash, ringColor,
    };
  });
  const weekTotalMinutes = weekDayDates.reduce((s, d) => s + (minutesByDay.get(d) ?? 0), 0);
  const missingCount = timeDays.filter((d, i) => i < 5 && d.statusLabel === "Manquant").length;

  // ── Heures supplémentaires ──
  // Le système ne suit que le statut de validation (en_attente / validée /
  // refusée) des heures déclarées — il n'existe aucune notion de "récupérées"
  // (consommées) dans le schéma actuel, donc les 3 cartes reflètent
  // honnêtement les 3 statuts réels plutôt qu'un solde disponible/consommé
  // fictif.
  const accentByProject = new Map<string, string>();
  function accentFor(name: string): string {
    if (!accentByProject.has(name)) accentByProject.set(name, PROJECT_ACCENTS[accentByProject.size % PROJECT_ACCENTS.length]);
    return accentByProject.get(name)!;
  }
  const overtimeByStatus: Record<string, number> = { attente: 0, validee: 0, refusee: 0 };
  for (const o of myOvertimeRows) overtimeByStatus[o.status] = (overtimeByStatus[o.status] ?? 0) + o.hours;

  const personal = {
    weekLabel: `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
    weekTotal: fmtHM(weekTotalMinutes),
    timeDays,
    hasMissingDays: missingCount > 0,
    missingCount,
    overtime: {
      balance: fmtHoursNum(overtimeByStatus.validee ?? 0),
      pending: fmtHoursNum(overtimeByStatus.attente ?? 0),
      refused: fmtHoursNum(overtimeByStatus.refusee ?? 0),
      rows: myOvertimeRows.slice(0, 4).map(o => {
        const style = REQUEST_STATUS_COLOR[o.status] ?? REQUEST_STATUS_COLOR.attente;
        const projectName = o.project?.name ?? "—";
        return {
          id: o.id, project: projectName, client: o.project?.client_name ?? "",
          accent: accentFor(projectName), hours: `+${fmtHoursNum(o.hours)}`,
          statusLabel: REQUEST_STATUS_LABEL[o.status] ?? o.status,
          statusColor: style.color, statusBg: style.bg,
        };
      }),
    },
  };

  return NextResponse.json({
    kpi: {
      tasksCount: myTasksNotDone.length,
      ticketsOpen: myOpenTicketsList.length,
      dueToday: dueTodayTasks,
    },
    tasks: taskItems,
    moreTasks: Math.max(0, tasksSorted.length - VIS),
    tickets: ticketItems,
    moreTickets: Math.max(0, ticketsSorted.length - VIS),
    personal,
  });
}
