import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export async function PATCH(req: Request, { params }: { params: { id: string; ticketId: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { statut } = body;

  const supabase = createSupabaseServerClient();
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