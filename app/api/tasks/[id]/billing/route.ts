import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { TASK_BILLING_TYPES } from "@/lib/task-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BILLING_TYPE_VALUES = new Set<string>(TASK_BILLING_TYPES.map(t => t.value));

// Envoie une tâche en facturation — même permission que /stage et
// /wait : assigné à la tâche, ou rôle avec view_all_tasks. Le
// collaborateur ne choisit que le type de facture ; le reste (montant,
// n° facture, statut de traitement) est réservé à direction/admin
// (manage_billing) depuis l'onglet Facturation. Écrit via la fonction
// transactionnelle create_billing_request (migration 025) : la ligne
// task_billing_requests et le passage de tasks.stage à 'facturation'
// doivent réussir ensemble.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (!can(session.role, "view_all_tasks") && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const body = await req.json();
  const { billing_type } = body;

  if (typeof billing_type !== "string" || !BILLING_TYPE_VALUES.has(billing_type)) {
    return NextResponse.json({ error: "Type de facture invalide" }, { status: 400 });
  }

  const { data: requestId, error } = await supabase.rpc("create_billing_request", {
    p_task_id: params.id,
    p_billing_type: billing_type,
    p_collaborateur_id: session.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    billingRequestId: requestId,
    billingType: billing_type,
    billingStatus: "a_facturer",
  }, { status: 201 });
}
