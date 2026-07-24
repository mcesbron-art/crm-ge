import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { TASK_BILLING_STATUSES } from "@/lib/task-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_VALUES = new Set<string>(TASK_BILLING_STATUSES.map(s => s.value));

const SELECT = `
  id, task_id, billing_type, billing_status, admin_comment, requested_at, processed_at,
  tasks(label, due_date, stage, projects(name, client_name)),
  requester:collaborateurs!task_billing_requests_requested_by_fkey(id, nom, color),
  processor:collaborateurs!task_billing_requests_processed_by_fkey(nom)
`;

type RequestRow = {
  id: string; task_id: string; billing_type: string; billing_status: string;
  admin_comment: string | null;
  requested_at: string; processed_at: string | null;
  tasks: { label: string; due_date: string | null; stage: string; projects: { name: string; client_name: string } | null } | null;
  requester: { id: string; nom: string; color: string | null } | null;
  processor: { nom: string } | null;
};

function toResponseShape(r: RequestRow) {
  return {
    id: r.id,
    taskId: r.task_id,
    taskLabel: r.tasks?.label ?? "—",
    taskDueDate: r.tasks?.due_date ?? null,
    taskStage: r.tasks?.stage ?? null,
    projectName: r.tasks?.projects?.name ?? "—",
    projectClient: r.tasks?.projects?.client_name ?? "",
    billingType: r.billing_type,
    billingStatus: r.billing_status,
    adminComment: r.admin_comment,
    requestedBy: r.requester,
    requestedAt: r.requested_at,
    processedByNom: r.processor?.nom ?? null,
    processedAt: r.processed_at,
  };
}

type EventRow = {
  id: string; action: string; old_value: string | null; new_value: string | null;
  comment: string | null; created_at: string;
  collaborateurs: { nom: string; color: string | null } | null;
};

// Détail + historique d'une demande de facturation — réservé à
// direction/admin (manage_billing) : le besoin du collaborateur est déjà
// couvert par le badge synthétique sur sa carte de tâche (GET /api/tasks
// ?mine=1), pas besoin d'un second chemin de lecture ici.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_billing")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("task_billing_requests").select(SELECT).eq("id", params.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Demande de facturation introuvable" }, { status: 404 });

  const { data: events } = await supabase
    .from("task_events")
    .select("id, action, old_value, new_value, comment, created_at, collaborateurs(nom, color)")
    .eq("billing_request_id", params.id)
    .order("created_at", { ascending: true });

  const rows = (events ?? []) as unknown as EventRow[];

  return NextResponse.json({
    request: toResponseShape(data as unknown as RequestRow),
    events: rows.map(e => ({
      id: e.id,
      action: e.action,
      oldValue: e.old_value,
      newValue: e.new_value,
      comment: e.comment,
      createdAt: e.created_at,
      actorNom: e.collaborateurs?.nom ?? "—",
      actorColor: e.collaborateurs?.color ?? "#888",
    })),
  });
}

// Mise à jour du statut de facturation et du commentaire comptable —
// réservée à direction/admin. La facture elle-même (montant, n°, date) est
// créée dans Axonaut, pas ici : ce PATCH ne fait que refléter où en est le
// traitement. Body partiel fusionné avec l'état actuel avant d'appeler
// update_billing_request (migration 026), qui reçoit l'état cible complet
// et journalise un événement par champ effectivement modifié.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_billing")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: current, error: curErr } = await supabase
    .from("task_billing_requests")
    .select("billing_status, admin_comment")
    .eq("id", params.id)
    .maybeSingle();
  if (curErr || !current) return NextResponse.json({ error: "Demande de facturation introuvable" }, { status: 404 });

  const body = await req.json();
  const billingStatus = "billing_status" in body ? body.billing_status : current.billing_status;
  if (typeof billingStatus !== "string" || !STATUS_VALUES.has(billingStatus)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  const adminComment = "admin_comment" in body ? body.admin_comment : current.admin_comment;

  const { data: updated, error } = await supabase.rpc("update_billing_request", {
    p_request_id: params.id,
    p_collaborateur_id: session.id,
    p_billing_status: billingStatus,
    p_admin_comment: typeof adminComment === "string" && adminComment.trim() ? adminComment.trim() : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ request: updated });
}
