import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("file_path, visibility, uploaded_by, recipient_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const canView =
    doc.visibility === "commun" ||
    doc.uploaded_by === session.id ||
    doc.recipient_id === session.id ||
    can(session.role, "view_all_documents");

  if (!canView) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const { data: signed, error: signErr } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 60);

  if (signErr || !signed) return NextResponse.json({ error: "Échec de la génération du lien" }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
