import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getServerSession,
} from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { OpportunityStatus } from "@/lib/opportunites-types";

/**
 * GET  /api/opportunites
 * Renvoie toutes les opportunités enrichies (avec client, commercial, demandeur).
 * Un collaborateur ne voit que celles qu'il a créées (demandeur_id) —
 * jamais un filtre envoyé par le client.
 *
 * POST /api/opportunites
 * Crée une nouvelle opportunité. Le demandeur est automatiquement l'utilisateur connecté.
 */

export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("opportunites")
    .select(
      `
      id, titre, description, montant_estime, statut, resultat_date, notes,
      created_at, updated_at,
      client_id, commercial_id, demandeur_id,
      client:clients(id, nom, contact_nom, contact_email, contact_phone),
      commercial:commerciaux(id, nom, email),
      demandeur:collaborateurs!opportunites_demandeur_id_fkey(id, nom, email)
    `,
    );

  if (!can(profile.role, "view_all_opportunities")) {
    query = query.eq("demandeur_id", profile.id);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ opportunites: data ?? [] });
}

export async function POST(req: Request) {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!can(profile.role, "create_opportunity")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const titre         = (body.titre as string)?.trim();
  const description   = (body.description as string)?.trim() || null;
  const client_id     = body.client_id as string;
  const commercial_id = body.commercial_id as string;
  const montant       = body.montant_estime as number | undefined;
  const notes         = (body.notes as string)?.trim() || null;
  const statut        = (body.statut as OpportunityStatus) ?? "demande";

  if (!titre || !client_id || !commercial_id) {
    return NextResponse.json(
      { error: "Champs requis : titre, client_id, commercial_id" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("opportunites")
    .insert({
      titre,
      description,
      client_id,
      commercial_id,
      demandeur_id: profile.id,
      montant_estime: typeof montant === "number" && montant > 0 ? montant : null,
      statut,
      notes,
    })
    .select(
      `
      id, titre, description, montant_estime, statut, resultat_date, notes,
      created_at, updated_at,
      client_id, commercial_id, demandeur_id,
      client:clients(id, nom, contact_nom, contact_email, contact_phone),
      commercial:commerciaux(id, nom, email),
      demandeur:collaborateurs!opportunites_demandeur_id_fkey(id, nom, email)
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ opportunite: data });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
