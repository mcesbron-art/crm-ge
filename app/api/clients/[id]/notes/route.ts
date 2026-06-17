import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes_client")
    .select("*, collaborateurs!created_by(nom, avatar, color)")
    .eq("axonaut_company_id", Number(params.id))
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { contenu } = body;
  if (!contenu?.trim()) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes_client")
    .insert({
      axonaut_company_id: Number(params.id),
      contenu: contenu.trim(),
      created_by: profile.authId,
    })
    .select("*, collaborateurs!created_by(nom, avatar, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;