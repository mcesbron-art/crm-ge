import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { TASK_STAGES } from "@/lib/task-taxonomy";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGE_VALUES = new Set<string>(TASK_STAGES.map(s => s.value));

// Route dédiée (plutôt que le PATCH générique /api/tasks/[id], qui ne
// vérifie aucune permission) : le déplacement d'une carte sur le Kanban de
// production doit être réservé à l'assigné (ou direction/admin) et laisse
// une trace dans task_events — même règle que POST /api/tasks/[id]/time-entry.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("assigned_to, stage")
    .eq("id", params.id)
    .maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (!can(session.role, "view_all_tasks") && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const body = await req.json();
  const { stage } = body;
  if (typeof stage !== "string" || !STAGE_VALUES.has(stage)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  // "Facturation" ne se rejoint que via l'envoi dédié (type de facture
  // requis, POST /api/tasks/[id]/billing) — jamais par un déplacement de
  // statut brut, sinon une tâche pourrait atterrir dans cette colonne sans
  // aucune demande de facturation associée.
  if (stage === "facturation") {
    return NextResponse.json({ error: "Utiliser l'envoi en facturation dédié (type de facture requis)" }, { status: 400 });
  }
  // Même principe : "BAT envoyé" ne se rejoint que via l'envoi dédié
  // (POST /api/tasks/[id]/bat), qui crée la révision correspondante —
  // jamais par un déplacement de statut brut.
  if (stage === "bat_envoye") {
    return NextResponse.json({ error: "Utiliser l'envoi de BAT dédié" }, { status: 400 });
  }

  if (stage === task.stage) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("tasks").update({ stage }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Un déplacement manuel hors "Attente d'éléments" (plutôt que le bouton
  // "Éléments reçus") doit quand même clore l'attente active, pour ne
  // jamais laisser une ligne task_waits orpheline marquée active.
  if (task.stage === "attente_elements" && stage !== "attente_elements") {
    await supabase.from("task_waits").update({ resolved_at: new Date().toISOString() }).eq("task_id", params.id).is("resolved_at", null);
  }

  // Best-effort : une trace d'historique manquante n'invalide pas le
  // déplacement, qui a déjà réussi (pas de RPC transactionnelle ici, voir
  // le plan de cette phase pour la justification).
  await supabase.from("task_events").insert({
    task_id: params.id,
    collaborateur_id: session.id,
    action: "stage_changed",
    old_value: task.stage,
    new_value: stage,
  });

  return NextResponse.json({ ok: true });
}
