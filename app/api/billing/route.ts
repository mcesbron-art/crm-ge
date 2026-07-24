import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestRow = {
  id: string;
  task_id: string;
  billing_type: string;
  billing_status: string;
  admin_comment: string | null;
  requested_at: string;
  processed_at: string | null;
  tasks: { label: string; due_date: string | null; stage: string; projects: { name: string; client_name: string } | null } | null;
  requester: { id: string; nom: string; color: string | null } | null;
  processor: { nom: string } | null;
};

// Vue Admin "Demandes de facturation" — centralise toutes les demandes
// envoyées par les collaborateurs, tous projets confondus. La facture
// elle-même se fait dans Axonaut ; cette page ne suit qu'un statut et un
// commentaire comptable optionnel. Filtres simples (status/type/
// collaborateur/dates) appliqués côté requête ; client/projet/recherche
// restent côté client après fetch, comme le fait déjà /facturation sur les
// factures Axonaut (cf. app/(app)/facturation/page.tsx).
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "view_billing")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const collaborateurId = searchParams.get("collaborateur_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("task_billing_requests")
    .select(`
      id, task_id, billing_type, billing_status, admin_comment, requested_at, processed_at,
      tasks(label, due_date, stage, projects(name, client_name)),
      requester:collaborateurs!task_billing_requests_requested_by_fkey(id, nom, color),
      processor:collaborateurs!task_billing_requests_processed_by_fkey(nom)
    `);

  if (status) query = query.eq("billing_status", status);
  if (type) query = query.eq("billing_type", type);
  if (collaborateurId) query = query.eq("requested_by", collaborateurId);
  if (dateFrom) query = query.gte("requested_at", dateFrom);
  if (dateTo) query = query.lte("requested_at", dateTo);

  const { data, error } = await query.order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as RequestRow[];
  const requests = rows.map(r => ({
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
  }));

  return NextResponse.json({ requests });
}
