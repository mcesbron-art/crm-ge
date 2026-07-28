import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { canViewTicket } from "@/lib/ticket-access";

export async function PATCH(req: Request, { params }: { params: { id: string; ticketId: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Même règle que PATCH /api/tickets/[id] : un collaborateur ne peut agir
  // que sur un ticket qui lui est assigné (ou dont il est collaborateur
  // additionnel) — cette route "par client" ne doit pas offrir un accès plus
  // large que la route ticket principale.
  if (!(await canViewTicket(supabase, params.ticketId, profile))) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { statut } = body;

  const { data, error } = await supabase
    .from("tickets")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("id", params.ticketId)
    .eq("axonaut_company_id", Number(params.id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
