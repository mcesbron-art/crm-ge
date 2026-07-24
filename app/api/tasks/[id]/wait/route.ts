import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { TASK_WAIT_REASONS } from "@/lib/task-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REASON_VALUES = new Set<string>(TASK_WAIT_REASONS.map(r => r.value));

// Démarre une attente d'éléments sur une tâche — même permission que
// /stage et /time-entry (assigné, ou rôle avec view_all_tasks). Écrit via
// la fonction transactionnelle start_task_wait (migration 024) : la ligne
// task_waits et le changement de tasks.stage doivent réussir ensemble.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to, stage").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (!can(session.role, "view_all_tasks") && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const body = await req.json();
  const { reason, waiting_for, comment, follow_up_date } = body;

  if (typeof reason !== "string" || !REASON_VALUES.has(reason)) {
    return NextResponse.json({ error: "Motif invalide" }, { status: 400 });
  }
  if (follow_up_date !== undefined && follow_up_date !== null && (typeof follow_up_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(follow_up_date))) {
    return NextResponse.json({ error: "Date de relance invalide" }, { status: 400 });
  }

  const { data: existingWait } = await supabase.from("task_waits").select("id").eq("task_id", params.id).is("resolved_at", null).maybeSingle();
  if (existingWait) return NextResponse.json({ error: "Une attente est déjà active sur cette tâche" }, { status: 409 });

  const { data: waitId, error } = await supabase.rpc("start_task_wait", {
    p_task_id: params.id,
    p_reason: reason,
    p_waiting_for: typeof waiting_for === "string" && waiting_for.trim() ? waiting_for.trim() : null,
    p_comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    p_follow_up_date: follow_up_date || null,
    p_collaborateur_id: session.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ waitId }, { status: 201 });
}
