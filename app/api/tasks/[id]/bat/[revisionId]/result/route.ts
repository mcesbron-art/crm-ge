import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { TASK_BAT_NEXT_STAGES } from "@/lib/task-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEXT_STAGE_VALUES = new Set<string>(TASK_BAT_NEXT_STAGES.map(s => s.value));

// Enregistre le retour client (validé/refusé) sur une révision de BAT en
// attente — même permission que POST /bat : assigné à la tâche, ou admin.
// Si validé et que "facturation" est choisi comme prochaine
// étape, la tâche NE PASSE PAS en colonne Facturation ici : c'est au
// client d'enchaîner sur POST /api/tasks/[id]/billing (modale de type de
// facture) pour respecter l'invariant "Facturation n'est atteinte que via
// une vraie demande" posé en migration 025/026.
export async function POST(req: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (session.role !== "admin" && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const { data: revision, error: revErr } = await supabase
    .from("task_bat_revisions")
    .select("id, task_id, status")
    .eq("id", params.revisionId)
    .maybeSingle();
  if (revErr || !revision || revision.task_id !== params.id) {
    return NextResponse.json({ error: "Révision de BAT introuvable" }, { status: 404 });
  }
  if (revision.status !== "waiting_feedback") {
    return NextResponse.json({ error: "Cette révision a déjà un résultat enregistré" }, { status: 409 });
  }

  const body = await req.json();
  const { status, comment, rejection_reason, next_stage } = body;

  if (status !== "validated" && status !== "rejected") {
    return NextResponse.json({ error: "Résultat invalide" }, { status: 400 });
  }
  if (status === "rejected" && (typeof rejection_reason !== "string" || !rejection_reason.trim())) {
    return NextResponse.json({ error: "Les modifications demandées sont obligatoires en cas de refus" }, { status: 400 });
  }
  if (status === "validated" && (typeof next_stage !== "string" || !NEXT_STAGE_VALUES.has(next_stage))) {
    return NextResponse.json({ error: "Prochaine étape invalide" }, { status: 400 });
  }

  const { data: updated, error } = await supabase.rpc("record_bat_result", {
    p_revision_id: params.revisionId,
    p_collaborateur_id: session.id,
    p_status: status,
    p_return_comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    p_rejection_reason: status === "rejected" ? rejection_reason.trim() : null,
    p_next_stage: status === "validated" ? next_stage : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ revision: updated });
}
