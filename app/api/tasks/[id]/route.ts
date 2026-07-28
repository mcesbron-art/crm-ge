import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { canAccessTask } from "@/lib/task-access";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { label, done, assigned_to, collaborator_ids, estimated_minutes, due_date, priority, task_type, start_date, end_date } = body;

  // Réassigner (assigné principal ou collaborateurs additionnels) est une
  // décision de gestion réservée à assign_task (admin) — tous les autres
  // champs restent modifiables par l'assigné principal, un collaborateur
  // additionnel (task_collaborators), ou un rôle avec view_all_tasks, pour
  // fermer la possibilité de modifier/cocher la tâche d'un autre sans
  // autorisation.
  if ((assigned_to !== undefined || collaborator_ids !== undefined) && !can(session.role, "assign_task")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const otherFieldsTouched = [label, done, estimated_minutes, due_date, priority, task_type, start_date, end_date].some(v => v !== undefined);
  const checkSupabase = createSupabaseServerClient();
  if (otherFieldsTouched && !can(session.role, "view_all_tasks")) {
    if (!(await canAccessTask(checkSupabase, params.id, session))) {
      return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
    }
  }

  let previousAssignee: string | null = null;
  if (assigned_to !== undefined) {
    const { data: existing } = await checkSupabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
    previousAssignee = (existing?.assigned_to as string | null) ?? null;
  }

  const update: Record<string, unknown> = {};
  if (label !== undefined) {
    if (typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "label invalide" }, { status: 400 });
    }
    update.label = label.trim();
  }
  if (done !== undefined) update.done = !!done;
  if (assigned_to !== undefined) update.assigned_to = typeof assigned_to === "string" && assigned_to ? assigned_to : null;
  if (estimated_minutes !== undefined) {
    update.estimated_minutes = typeof estimated_minutes === "number" && estimated_minutes > 0 ? Math.round(estimated_minutes) : null;
  }
  if (due_date !== undefined) update.due_date = typeof due_date === "string" && due_date ? due_date : null;
  if (priority !== undefined) update.priority = typeof priority === "string" && priority ? priority : "Normale";
  if (task_type !== undefined) update.task_type = typeof task_type === "string" && task_type ? task_type : null;
  if (start_date !== undefined) update.start_date = typeof start_date === "string" && start_date ? start_date : null;
  if (end_date !== undefined) update.end_date = typeof end_date === "string" && end_date ? end_date : null;

  if (collaborator_ids !== undefined && (!Array.isArray(collaborator_ids) || !collaborator_ids.every((c: unknown) => typeof c === "string"))) {
    return NextResponse.json({ error: "Collaborateurs invalides" }, { status: 400 });
  }

  if (Object.keys(update).length === 0 && collaborator_ids === undefined) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("tasks").update(update).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (assigned_to !== undefined && update.assigned_to !== previousAssignee) {
    await supabase.from("task_events").insert({
      task_id: params.id,
      collaborateur_id: session.id,
      action: "assigned",
      old_value: previousAssignee,
      new_value: (update.assigned_to as string | null) ?? null,
    });

    const newAssignee = update.assigned_to as string | null;
    if (newAssignee && newAssignee !== session.id) {
      const { data: task } = await supabase.from("tasks").select("label, project_id").eq("id", params.id).maybeSingle();
      await createNotification({
        recipientId: newAssignee,
        type: "task_assigned",
        entityType: "task",
        entityId: params.id,
        title: "Nouvelle tâche assignée",
        body: `${session.nom} vous a assigné la tâche « ${task?.label ?? ""} »`,
        link: task?.project_id ? `/projets?open=${task.project_id}` : "/mes-taches",
      });
    }
  }

  if (collaborator_ids !== undefined) {
    const { error: delErr } = await supabase.from("task_collaborators").delete().eq("task_id", params.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (collaborator_ids.length > 0) {
      const rows = (collaborator_ids as string[]).map((collaborateur_id: string) => ({ task_id: params.id, collaborateur_id }));
      const { error: insErr } = await supabase.from("task_collaborators").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

// Supprimer une tâche est réservé à l'admin — jamais à l'assigné lui-même,
// même sur sa propre tâche (spec permissions).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "view_all_tasks")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
