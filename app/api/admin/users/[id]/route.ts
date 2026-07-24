import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = ["admin", "collaborateur"];

/**
 * PATCH /api/admin/users/[id]
 * RÉSERVÉ ADMIN — modifie le rôle, le pôle ou le statut actif/inactif
 * d'un collaborateur (table `collaborateurs`, params.id = son id, pas
 * son auth_id).
 *
 * Un admin ne peut ni se rétrograder ni se désactiver lui-même — sinon un
 * admin seul aux commandes pourrait se retrouver bloqué hors de
 * l'Administration sans personne pour l'y réintégrer.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const isSelf = params.id === profile.id;

  const update: Record<string, unknown> = {};
  if (typeof body.role === "string") {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }
    if (isSelf && body.role !== "admin") {
      return NextResponse.json({ error: "Vous ne pouvez pas retirer vos propres droits administrateur" }, { status: 403 });
    }
    update.role = body.role;
  }
  if (typeof body.pole === "string") {
    update.pole = body.pole.trim() || null;
  }
  if (typeof body.actif === "boolean") {
    if (isSelf && body.actif === false) {
      return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 403 });
    }
    update.actif = body.actif;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("collaborateurs")
    .update(update)
    .eq("id", params.id)
    .select("id, nom, email, pole, role, actif")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Collaborateur introuvable" }, { status: 404 });

  return NextResponse.json({ user: data });
}
