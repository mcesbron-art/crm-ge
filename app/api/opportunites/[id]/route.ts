import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getServerSession,
} from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { OpportunityStatus } from "@/lib/opportunites-types";

const VALID_STATUS: OpportunityStatus[] = ["demande", "contacte", "devis", "negociation", "gagne", "perdu"];

/**
 * PATCH /api/opportunites/[id]   — modifier (statut, montant, notes…),
 *   réservé à l'admin ou au créateur (demandeur_id) de l'opportunité.
 * DELETE /api/opportunites/[id]  — supprimer, réservé à l'admin ou au
 *   créateur (demandeur_id) — même règle que PATCH.
 */

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabaseCheck = createSupabaseServerClient();
  if (!can(profile.role, "view_all_opportunities")) {
    const { data: existing } = await supabaseCheck.from("opportunites").select("demandeur_id").eq("id", params.id).maybeSingle();
    if (!existing || existing.demandeur_id !== profile.id) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.titre === "string")          patch.titre = body.titre.trim();
  if (typeof body.description === "string")    patch.description = body.description.trim() || null;
  if (typeof body.client_id === "string")      patch.client_id = body.client_id;
  if (typeof body.commercial_id === "string")  patch.commercial_id = body.commercial_id;
  if (typeof body.montant_estime === "number") patch.montant_estime = body.montant_estime;
  if (typeof body.notes === "string")          patch.notes = body.notes.trim() || null;

  if (typeof body.statut === "string") {
    if (!VALID_STATUS.includes(body.statut as OpportunityStatus)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    patch.statut = body.statut;
    // Date de résultat auto-renseignée pour gagne/perdu
    if (body.statut === "gagne" || body.statut === "perdu") {
      patch.resultat_date = new Date().toISOString().slice(0, 10);
    } else if (body.statut !== "negociation") {
      patch.resultat_date = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("opportunites")
    .update(patch)
    .eq("id", params.id)
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  if (!can(profile.role, "view_all_opportunities")) {
    const { data: existing } = await supabase.from("opportunites").select("demandeur_id").eq("id", params.id).maybeSingle();
    if (!existing || existing.demandeur_id !== profile.id) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 });
    }
  }

  const { error } = await supabase.from("opportunites").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
