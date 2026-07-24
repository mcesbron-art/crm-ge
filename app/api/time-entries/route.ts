import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { canViewProject } from "@/lib/project-access";
import { canAccessTask } from "@/lib/task-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("project_id");
  const taskId = req.nextUrl.searchParams.get("task_id");
  if (!projectId && !taskId) return NextResponse.json({ error: "project_id ou task_id requis" }, { status: 400 });

  const supabase = createSupabaseServerClient();

  // Même règle d'accès que /api/tasks : un collaborateur ne peut consulter
  // les temps saisis que sur un projet/une tâche auquel il a lui-même accès
  // (comme assigné principal ou collaborateur additionnel — aucune
  // vérification n'existait ici auparavant).
  if (taskId) {
    if (!(await canAccessTask(supabase, taskId, session))) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
  } else if (!(await canViewProject(supabase, projectId as string, session))) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  let query = supabase
    .from("time_entries")
    .select("id, project_id, task_id, collaborateur_id, date, duration_minutes, duration_seconds, note, created_at, collaborateurs(nom, avatar, color), tasks(label)");
  query = taskId ? query.eq("task_id", taskId) : query.eq("project_id", projectId as string);
  // Un collaborateur ne voit que ses propres saisies de temps, jamais
  // celles d'un collègue sur le même projet.
  if (!can(session.role, "view_all_tasks")) query = query.eq("collaborateur_id", session.id);

  const { data, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data ?? []).map(row => {
    const collab = row.collaborateurs as unknown as { nom: string; avatar: string | null; color: string | null } | null;
    const task = row.tasks as unknown as { label: string } | null;
    return {
      id: row.id as string,
      date: row.date as string,
      durationMinutes: row.duration_minutes as number,
      durationSeconds: (row.duration_seconds as number | null) ?? (row.duration_minutes as number) * 60,
      note: row.note as string | null,
      collaborateurId: row.collaborateur_id as string,
      collaborateurNom: collab?.nom ?? "Inconnu",
      collaborateurColor: collab?.color ?? "#888",
      taskId: row.task_id as string | null,
      taskLabel: task?.label ?? null,
      canDelete: row.collaborateur_id === session.id,
    };
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { project_id, task_id, date, duration_minutes, duration_seconds, note } = body;

  // duration_seconds (précis, saisi via le panneau tâche) est prioritaire ;
  // duration_minutes (formulaire projet, sans les secondes) reste accepté
  // pour ne pas casser ce formulaire — dans ce cas duration_seconds est
  // dérivé pour garder les deux colonnes cohérentes.
  let seconds: number;
  if (typeof duration_seconds === "number" && Number.isFinite(duration_seconds) && duration_seconds > 0) {
    seconds = Math.round(duration_seconds);
  } else if (typeof duration_minutes === "number" && Number.isFinite(duration_minutes) && duration_minutes > 0) {
    seconds = Math.round(duration_minutes) * 60;
  } else {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }
  const minutes = Math.ceil(seconds / 60);

  const supabase = createSupabaseServerClient();

  // project_id est dérivé de la tâche côté serveur quand task_id est fourni :
  // le client (page /mes-taches) n'a pas besoin de connaître le projet parent.
  let resolvedProjectId: string | null = typeof project_id === "string" && project_id ? project_id : null;
  if (typeof task_id === "string" && task_id) {
    // Ne pas se contenter de résoudre le projet : vérifier que l'appelant a
    // le droit de logger du temps sur CETTE tâche (assigné principal,
    // collaborateur additionnel, ou admin) — sinon n'importe quel
    // collaborateur pourrait saisir du temps sur la tâche de n'importe qui.
    if (!(await canAccessTask(supabase, task_id, session))) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
    const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("project_id").eq("id", task_id).single();
    if (taskErr || !taskRow) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    resolvedProjectId = taskRow.project_id as string;
  }
  if (!resolvedProjectId) {
    return NextResponse.json({ error: "project_id ou task_id requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      project_id: resolvedProjectId,
      task_id: typeof task_id === "string" && task_id ? task_id : null,
      collaborateur_id: session.id,
      date: typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10),
      duration_minutes: minutes,
      duration_seconds: seconds,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id as string }, { status: 201 });
}
