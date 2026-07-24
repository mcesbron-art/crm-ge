import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { DOCUMENT_CATEGORIES } from "@/lib/document-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_VALUES = new Set<string>(DOCUMENT_CATEGORIES.map(c => c.value));

// Modifier/supprimer un document (métadonnées ou fichier) est réservé à
// direction/admin (manage_documents) — les seuls rôles qui peuvent aussi en
// ajouter (upload_common_document/upload_personal_document), donc pas de cas
// "propriétaire d'un upload qu'il ne peut pas éditer" à gérer.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_documents")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin.from("documents").select("visibility, recipient_id").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const body = await req.json();
  const { name, category, visibility, recipient_id } = body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    update.name = name.trim();
  }
  if (category !== undefined) {
    if (typeof category !== "string" || !CATEGORY_VALUES.has(category)) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    update.category = category;
  }

  const nextVisibility = visibility !== undefined ? visibility : existing.visibility;
  const nextRecipient = recipient_id !== undefined ? recipient_id : existing.recipient_id;
  if (visibility !== undefined) {
    if (visibility !== "commun" && visibility !== "personnel") return NextResponse.json({ error: "Visibilité invalide" }, { status: 400 });
    update.visibility = visibility;
  }
  if (recipient_id !== undefined) update.recipient_id = recipient_id || null;
  if (nextVisibility === "personnel" && !nextRecipient) {
    return NextResponse.json({ error: "Destinataire requis pour un document personnel" }, { status: 400 });
  }
  if (nextVisibility === "commun") update.recipient_id = null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const { error } = await admin.from("documents").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_documents")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: doc } = await admin.from("documents").select("file_path").eq("id", params.id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  // Le fichier orphelin en cas d'échec du storage n'est pas bloquant : on
  // retire quand même la ligne, pour ne jamais laisser une entrée fantôme
  // invisible/inutilisable si le storage a un souci transitoire.
  await admin.storage.from("documents").remove([doc.file_path]);

  const { error } = await admin.from("documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
