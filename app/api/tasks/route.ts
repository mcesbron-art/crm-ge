import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { canViewProject } from "@/lib/project-access";
import { getMyTaskIds } from "@/lib/task-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SELECT_FIELDS = "id, project_id, label, done, assigned_to, estimated_minutes, due_date, priority, task_type, start_date, end_date, stage";

type TaskRow = {
  id: string;
  project_id: string;
  label: string;
  done: boolean;
  assigned_to: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
  priority: string | null;
  task_type: string | null;
  start_date: string | null;
  end_date: string | null;
  stage: string;
  collaborateurs: { nom: string; avatar: string | null; color: string | null; pole: string | null } | null;
  projects: { name: string; client_name: string; status: string } | null;
};

async function attachMinutes(supabase: ReturnType<typeof createSupabaseServerClient>, taskIds: string[]) {
  const minutesByTask = new Map<string, number>();
  if (taskIds.length === 0) return minutesByTask;
  const { data } = await supabase
    .from("time_entries")
    .select("task_id, duration_minutes")
    .in("task_id", taskIds);
  for (const row of data ?? []) {
    const id = row.task_id as string | null;
    if (!id) continue;
    minutesByTask.set(id, (minutesByTask.get(id) ?? 0) + (row.duration_minutes as number));
  }
  return minutesByTask;
}

export type TaskCollaborator = { id: string; nom: string; avatar: string | null; color: string | null };

async function attachCollaborators(supabase: ReturnType<typeof createSupabaseServerClient>, taskIds: string[]) {
  const byTask = new Map<string, TaskCollaborator[]>();
  if (taskIds.length === 0) return byTask;
  const { data } = await supabase
    .from("task_collaborators")
    .select("task_id, collaborateurs(id, nom, avatar, color)")
    .in("task_id", taskIds);
  for (const row of data ?? []) {
    const c = row.collaborateurs as unknown as TaskCollaborator | null;
    if (!c) continue;
    const list = byTask.get(row.task_id as string) ?? [];
    list.push(c);
    byTask.set(row.task_id as string, list);
  }
  return byTask;
}

export type TaskWaitInfo = { reason: string; waitingFor: string | null; comment: string | null; followUpDate: string | null; startedAt: string };
export type TaskBillingInfo = { id: string; billingType: string; billingStatus: string; adminComment: string | null; requestedAt: string; updatedAt: string };

async function attachBilling(supabase: ReturnType<typeof createSupabaseServerClient>, taskIds: string[]) {
  const billingByTask = new Map<string, TaskBillingInfo>();
  if (taskIds.length === 0) return billingByTask;
  // La plus récente demande par tâche fait foi pour le badge synthétique de
  // la carte — l'historique complet (toutes les demandes) vit dans la vue
  // Admin (/api/billing), pas ici.
  const { data } = await supabase
    .from("task_billing_requests")
    .select("id, task_id, billing_type, billing_status, admin_comment, requested_at, updated_at")
    .in("task_id", taskIds)
    .order("requested_at", { ascending: false });
  for (const row of data ?? []) {
    const id = row.task_id as string;
    if (billingByTask.has(id)) continue;
    billingByTask.set(id, {
      id: row.id as string,
      billingType: row.billing_type as string,
      billingStatus: row.billing_status as string,
      adminComment: row.admin_comment as string | null,
      requestedAt: row.requested_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  return billingByTask;
}

export type TaskBatInfo = {
  id: string; version: number; status: string; sentAt: string;
  link: string | null; returnComment: string | null; rejectionReason: string | null;
};

async function attachBat(supabase: ReturnType<typeof createSupabaseServerClient>, taskIds: string[]) {
  const batByTask = new Map<string, TaskBatInfo>();
  if (taskIds.length === 0) return batByTask;
  // La révision la plus récente (par version) fait foi pour le badge
  // synthétique de la carte — l'historique complet vit dans le panneau de
  // détail (GET /api/tasks/[id]/bat).
  const { data } = await supabase
    .from("task_bat_revisions")
    .select("id, task_id, version, status, sent_at, link, return_comment, rejection_reason")
    .in("task_id", taskIds)
    .order("version", { ascending: false });
  for (const row of data ?? []) {
    const id = row.task_id as string;
    if (batByTask.has(id)) continue;
    batByTask.set(id, {
      id: row.id as string,
      version: row.version as number,
      status: row.status as string,
      sentAt: row.sent_at as string,
      link: row.link as string | null,
      returnComment: row.return_comment as string | null,
      rejectionReason: row.rejection_reason as string | null,
    });
  }
  return batByTask;
}

async function attachWaits(supabase: ReturnType<typeof createSupabaseServerClient>, taskIds: string[]) {
  const waitByTask = new Map<string, TaskWaitInfo>();
  if (taskIds.length === 0) return waitByTask;
  const { data } = await supabase
    .from("task_waits")
    .select("task_id, reason, waiting_for, comment, follow_up_date, started_at")
    .in("task_id", taskIds)
    .is("resolved_at", null);
  for (const row of data ?? []) {
    waitByTask.set(row.task_id as string, {
      reason: row.reason as string,
      waitingFor: row.waiting_for as string | null,
      comment: row.comment as string | null,
      followUpDate: row.follow_up_date as string | null,
      startedAt: row.started_at as string,
    });
  }
  return waitByTask;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("project_id");
  const mine = searchParams.get("mine");

  const supabase = createSupabaseServerClient();

  if (mine) {
    // "Voir toutes les tâches" / une personne précise n'est autorisé que pour
    // direction/admin, et vérifié sur le rôle de la session serveur — jamais
    // sur une valeur envoyée par le client, qui pourrait forcer le paramètre.
    const canSeeAll = session.role === "admin";
    const requestedAssignee = searchParams.get("assigned_to");

    let query = supabase
      .from("tasks")
      .select(`${SELECT_FIELDS}, collaborateurs!assigned_to(nom, avatar, color, pole), projects(name, client_name, status)`);

    if (canSeeAll && requestedAssignee === "all") {
      // pas de filtre assigned_to : toutes les tâches, tous collaborateurs
    } else if (canSeeAll && requestedAssignee) {
      // Inclut les tâches où requestedAssignee est assigné principal OU
      // collaborateur additionnel (task_collaborators) — pas uniquement
      // assigned_to, depuis l'introduction des collaborateurs additionnels.
      const ids = await getMyTaskIds(supabase, requestedAssignee);
      if (ids.length === 0) return NextResponse.json({ tasks: [] });
      query = query.in("id", ids);
    } else {
      const ids = await getMyTaskIds(supabase, session.id);
      if (ids.length === 0) return NextResponse.json({ tasks: [] });
      query = query.in("id", ids);
    }

    const { data, error } = await query
      .order("done", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as unknown as TaskRow[];
    const minutesByTask = await attachMinutes(supabase, rows.map(r => r.id));
    const waitByTask = await attachWaits(supabase, rows.map(r => r.id));
    const billingByTask = await attachBilling(supabase, rows.map(r => r.id));
    const batByTask = await attachBat(supabase, rows.map(r => r.id));
    const collabsByTask = await attachCollaborators(supabase, rows.map(r => r.id));

    const tasks = rows.map(r => ({
      id: r.id,
      label: r.label,
      done: r.done,
      projectId: r.project_id,
      projectName: r.projects?.name ?? "—",
      projectClient: r.projects?.client_name ?? "",
      projectStatus: r.projects?.status ?? "",
      assignedTo: r.assigned_to,
      assigneeNom: r.collaborateurs?.nom ?? null,
      assigneeColor: r.collaborateurs?.color ?? "#888",
      assigneePole: r.collaborateurs?.pole ?? null,
      collaborators: collabsByTask.get(r.id) ?? [],
      estimatedMinutes: r.estimated_minutes,
      dueDate: r.due_date,
      priority: r.priority ?? "Normale",
      taskType: r.task_type,
      startDate: r.start_date,
      endDate: r.end_date,
      stage: r.stage,
      totalMinutes: minutesByTask.get(r.id) ?? 0,
      waiting: waitByTask.get(r.id) ?? null,
      billing: billingByTask.get(r.id) ?? null,
      bat: batByTask.get(r.id) ?? null,
    }));

    return NextResponse.json({ tasks });
  }

  if (!projectId) return NextResponse.json({ error: "project_id ou mine requis" }, { status: 400 });

  // Un collaborateur ne peut lister les tâches d'un projet que s'il y a
  // lui-même au moins une tâche assignée (même règle que GET
  // /api/projets/[id]) — jamais un accès "large" au prétexte de connaître
  // déjà l'id du projet.
  if (!(await canViewProject(supabase, projectId, session))) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  let taskQuery = supabase
    .from("tasks")
    .select(`${SELECT_FIELDS}, collaborateurs!assigned_to(nom, avatar, color)`)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  // Même dans un projet auquel il a accès, un collaborateur ne voit que ses
  // propres tâches (assigné principal ou collaborateur additionnel) —
  // jamais celles assignées uniquement à un collègue sur ce même projet.
  if (!can(session.role, "view_all_tasks")) {
    const ids = await getMyTaskIds(supabase, session.id);
    if (ids.length === 0) return NextResponse.json({ tasks: [] });
    taskQuery = taskQuery.in("id", ids);
  }

  const { data, error } = await taskQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as TaskRow[];
  const minutesByTask = await attachMinutes(supabase, rows.map(r => r.id));
  const collabsByTask = await attachCollaborators(supabase, rows.map(r => r.id));

  const tasks = rows.map(r => ({
    id: r.id,
    label: r.label,
    done: r.done,
    assignedTo: r.assigned_to,
    assigneeNom: r.collaborateurs?.nom ?? null,
    assigneeColor: r.collaborateurs?.color ?? "#888",
    collaborators: collabsByTask.get(r.id) ?? [],
    estimatedMinutes: r.estimated_minutes,
    dueDate: r.due_date,
    priority: r.priority ?? "Normale",
    taskType: r.task_type,
    startDate: r.start_date,
    endDate: r.end_date,
    stage: r.stage,
    totalMinutes: minutesByTask.get(r.id) ?? 0,
  }));

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "create_task")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { project_id, label, assigned_to, estimated_minutes, due_date, priority, task_type, start_date, end_date } = body;

  if (typeof project_id !== "string" || !project_id) {
    return NextResponse.json({ error: "project_id requis" }, { status: 400 });
  }
  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "label requis" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id,
      label: label.trim(),
      assigned_to: typeof assigned_to === "string" && assigned_to ? assigned_to : null,
      estimated_minutes: typeof estimated_minutes === "number" && estimated_minutes > 0 ? Math.round(estimated_minutes) : null,
      due_date: typeof due_date === "string" && due_date ? due_date : null,
      priority: typeof priority === "string" && priority ? priority : "Normale",
      task_type: typeof task_type === "string" && task_type ? task_type : null,
      start_date: typeof start_date === "string" && start_date ? start_date : null,
      end_date: typeof end_date === "string" && end_date ? end_date : null,
    })
    .select(`${SELECT_FIELDS}, collaborateurs!assigned_to(nom, avatar, color)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = data as unknown as TaskRow;
  return NextResponse.json({
    task: {
      id: row.id,
      label: row.label,
      done: row.done,
      assignedTo: row.assigned_to,
      assigneeNom: row.collaborateurs?.nom ?? null,
      assigneeColor: row.collaborateurs?.color ?? "#888",
      collaborators: [],
      estimatedMinutes: row.estimated_minutes,
      dueDate: row.due_date,
      priority: row.priority ?? "Normale",
      taskType: row.task_type,
      startDate: row.start_date,
      endDate: row.end_date,
      stage: row.stage,
      totalMinutes: 0,
    },
  }, { status: 201 });
}
