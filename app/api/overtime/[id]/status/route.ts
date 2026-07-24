import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Valider/refuser une déclaration d'heures sup. — réservé à direction/admin
// (manage_absences).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_absences")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body;
  if (status !== "validee" && status !== "refusee") {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("overtime_declarations")
    .update({ status, processed_by: session.id, processed_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
