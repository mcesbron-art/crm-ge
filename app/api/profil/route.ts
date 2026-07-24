import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Met à jour les informations personnelles du collaborateur CONNECTÉ.
 * Volontairement restreint à son propre profil (pas d'id dans l'URL) et aux
 * champs non sensibles — email, pôle et rôle ne sont pas éditables ici.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { nom, telephone, bio, poste } = body;

  const update: Record<string, unknown> = {};
  if (nom !== undefined) {
    if (typeof nom !== "string" || !nom.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }
    update.nom = nom.trim();
  }
  if (telephone !== undefined) update.telephone = typeof telephone === "string" ? telephone.trim() || null : null;
  if (bio !== undefined) update.bio = typeof bio === "string" ? bio.trim() || null : null;
  if (poste !== undefined) update.poste = typeof poste === "string" ? poste.trim() || null : null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  // RLS sur collaborateurs ne permet l'écriture qu'au rôle "admin" : on
  // utilise le client admin, mais la cible (session.id) vient uniquement de
  // la session authentifiée, jamais de l'input client — impossible de modifier
  // le profil de quelqu'un d'autre.
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("collaborateurs")
    .update(update)
    .eq("id", session.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
