import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORIES = ["rh", "com", "process", "perso"] as const;
const MAX_SIZE = 52_428_800;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Client admin (bypass RLS) : filtrage explicite, comme /api/tickets.
  let query = supabase
    .from("documents")
    .select("id, name, category, visibility, mime_type, file_size, created_at, uploaded_by, recipient_id, collaborateurs!uploaded_by(nom, color)");

  if (!can(session.role, "view_all_documents")) {
    query = query.or(`visibility.eq.commun,uploaded_by.eq.${session.id},recipient_id.eq.${session.id}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documents = (data ?? []).map(row => {
    const uploader = row.collaborateurs as unknown as { nom: string; color: string | null } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      visibility: row.visibility as string,
      mimeType: row.mime_type as string,
      fileSize: row.file_size as number,
      createdAt: row.created_at as string,
      uploadedBy: row.uploaded_by as string,
      uploaderNom: uploader?.nom ?? "Direction",
      uploaderColor: uploader?.color ?? "#8C846F",
      recipientId: row.recipient_id as string | null,
    };
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = form.get("name") as string | null;
  const category = form.get("category") as string | null;
  const visibility = (form.get("visibility") as string | null) ?? "commun";
  const recipientId = form.get("recipient_id") as string | null;

  if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  if (!name || !name.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (visibility !== "commun" && visibility !== "personnel") {
    return NextResponse.json({ error: "Visibilité invalide" }, { status: 400 });
  }
  if (visibility === "personnel" && !recipientId) {
    return NextResponse.json({ error: "Destinataire requis pour un document personnel" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (50 Mo max)" }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });

  const requiredPermission = visibility === "personnel" ? "upload_personal_document" : "upload_common_document";
  if (!can(session.role, requiredPermission)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${session.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadErr) return NextResponse.json({ error: `Upload échoué : ${uploadErr.message}` }, { status: 500 });

  const { data, error } = await admin
    .from("documents")
    .insert({
      name: name.trim(),
      category,
      visibility,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: session.id,
      recipient_id: visibility === "personnel" ? recipientId : null,
    })
    .select("id")
    .single();

  if (error) {
    await admin.storage.from("documents").remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id as string }, { status: 201 });
}
