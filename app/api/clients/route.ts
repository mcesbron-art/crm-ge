import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getServerSession,
} from "@/lib/supabase-server";

/**
 * GET  /api/clients   — liste tous les clients actifs (pour le sélecteur)
 * POST /api/clients   — crée un nouveau client (depuis l'UI Opportunités si client absent)
 */

export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, nom, secteur, contact_nom, contact_email, contact_phone, adresse, notes, actif")
    .eq("actif", true)
    .order("nom", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(req: Request) {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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
    .from("clients")
    .insert({
      nom,
      secteur:       (body.secteur as string)?.trim() || null,
      contact_nom:   (body.contact_nom as string)?.trim() || null,
      contact_email: (body.contact_email as string)?.trim() || null,
      contact_phone: (body.contact_phone as string)?.trim() || null,
      adresse:       (body.adresse as string)?.trim() || null,
      notes:         (body.notes as string)?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ client: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
