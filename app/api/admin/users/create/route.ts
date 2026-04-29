import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  getServerSession,
} from "@/lib/supabase-server";

/**
 * POST /api/admin/users/create
 * RÉSERVÉ DIRECTION — crée un compte utilisateur dans Supabase Auth + un
 * profil collaborateur dans la table `collaborateurs`.
 *
 * Body :
 *   {
 *     email: string,
 *     nom: string,
 *     pole?: string,
 *     avatar?: string,
 *     color?: string,
 *     role: "direction" | "admin" | "collaborateur",
 *     base?: number,
 *     sendInvite?: boolean   // si true : Supabase envoie un email d'invitation au lieu de définir un mot de passe
 *     password?: string      // si sendInvite === false : mot de passe initial
 *   }
 */
export async function POST(req: Request) {
  // 1. Vérifie que l'appelant est Direction
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (profile.role !== "direction") {
    return NextResponse.json({ error: "Accès réservé à la Direction" }, { status: 403 });
  }

  // 2. Validation du body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body.email as string)?.trim().toLowerCase();
  const nom = (body.nom as string)?.trim();
  const role = body.role as "direction" | "admin" | "collaborateur";
  const sendInvite = body.sendInvite !== false; // par défaut: envoi d'invite
  const password = body.password as string | undefined;

  if (!email || !nom || !["direction", "admin", "collaborateur"].includes(role)) {
    return NextResponse.json(
      { error: "Champs manquants ou invalides (email, nom, role)" },
      { status: 400 },
    );
  }

  if (!sendInvite && (!password || password.length < 8)) {
    return NextResponse.json(
      { error: "Mot de passe requis (8 caractères min) si sendInvite=false" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 3. Crée le compte auth
  let authUserId: string;
  if (sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });
    if (error || !data.user) {
      return NextResponse.json(
        { error: `Erreur invitation : ${error?.message ?? "inconnue"}` },
        { status: 502 },
      );
    }
    authUserId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return NextResponse.json(
        { error: `Erreur création : ${error?.message ?? "inconnue"}` },
        { status: 502 },
      );
    }
    authUserId = data.user.id;
  }

  // 4. Crée le profil collaborateur
  const { data: profileRow, error: profileError } = await admin
    .from("collaborateurs")
    .insert({
      auth_id: authUserId,
      nom,
      email,
      pole: (body.pole as string) ?? null,
      avatar: (body.avatar as string) ?? nom.slice(0, 2).toUpperCase(),
      color: (body.color as string) ?? "#999999",
      base_heures: typeof body.base === "number" ? body.base : 35,
      role,
      actif: true,
    })
    .select()
    .single();

  if (profileError) {
    // Si le profil échoue, supprime le compte auth pour cohérence
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return NextResponse.json(
      { error: `Erreur création profil : ${profileError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    sentInvite: sendInvite,
    user: {
      authId: authUserId,
      id: profileRow.id,
      email,
      nom,
      role,
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
