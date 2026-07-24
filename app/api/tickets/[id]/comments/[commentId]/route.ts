import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Seul l'auteur peut supprimer sa propre note interne.
  const { data, error } = await supabase
    .from("ticket_comments")
    .delete()
    .eq("id", params.commentId)
    .eq("author_id", session.id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Note introuvable ou non autorisée" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
