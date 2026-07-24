import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  // La RLS ("time_entries delete") ne laisse déjà supprimer que ses propres
  // saisies ; le filtre collaborateur_id ici sert juste à distinguer un 404
  // (saisie inexistante) d'un refus RLS silencieux (0 ligne affectée).
  const { data, error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", params.id)
    .eq("collaborateur_id", session.id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Saisie introuvable ou non autorisée" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
