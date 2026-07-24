import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getServerSession,
} from "@/lib/supabase-server";

/**
 * GET  /api/commerciaux   — liste tous les commerciaux actifs
 * POST /api/commerciaux   — crée un nouveau commercial (Admin uniquement)
 */

export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commerciaux")
    .select("id, nom, email, collaborateur_id, actif")
    .eq("actif", true)
    .order("nom", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ commerciaux: data ?? [] });
}

export async function POST(req: Request) {
  const profile = await getServerSession();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Réservé aux administrateurs" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const nom = (body.nom as string)?.trim();
  if (!nom) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commerciaux")
    .insert({
      nom,
      email: (body.email as string)?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ commercial: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
