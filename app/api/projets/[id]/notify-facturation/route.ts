import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Marque le projet comme "Terminé" depuis la colonne "À facturer" — plus
// d'email à la comptable ici (cf. historique) : elle suit les demandes de
// facturation par tâche directement dans la page Facturation.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Même règle que PATCH /api/projets/[id] : modifier un projet (y compris
  // son statut) est réservé à update_project — le Collaborateur a une page
  // Projets entièrement en lecture seule.
  if (!can(session.role, "update_project")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("projects")
    .update({ status: "termine" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
