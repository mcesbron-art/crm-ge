import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  getServerSession,
} from "@/lib/supabase-server";

/**
 * POST /api/admin/users/reset-password
 * RÉSERVÉ ADMIN — propose 2 modes :
 *
 * Mode A — { email, sendEmail: true }   (recommandé)
 *   Supabase envoie un email de réinitialisation à l'utilisateur.
 *   L'utilisateur définit lui-même son nouveau mot de passe.
 *
 * Mode B — { email, newPassword: "..." }
 *   L'admin définit directement un mot de passe (à transmettre en main propre).
 *   L'utilisateur peut ensuite le changer via "Mot de passe oublié" s'il le souhaite.
 */
export async function POST(req: Request) {
  // 1. Vérifie que l'appelant est Admin
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  // 2. Validation
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body.email as string)?.trim().toLowerCase();
  const sendEmail = body.sendEmail === true;
  const newPassword = body.newPassword as string | undefined;

  if (!email) {
    return NextResponse.json({ error: "Email manquant" }, { status: 400 });
  }
  if (!sendEmail && (!newPassword || newPassword.length < 8)) {
    return NextResponse.json(
      { error: "newPassword requis (8 caractères min) si sendEmail=false" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 3. Récupère l'auth_id depuis la table collaborateurs
  const { data: target, error: lookupError } = await admin
    .from("collaborateurs")
    .select("auth_id, nom, email")
    .eq("email", email)
    .single();

  if (lookupError || !target?.auth_id) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (sendEmail) {
    // Mode A : envoi de l'email de reset
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });
    if (error) {
      return NextResponse.json(
        { error: `Erreur envoi email : ${error.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "email",
      message: `Un email de réinitialisation a été envoyé à ${email}.`,
    });
  }

  // Mode B : mise à jour directe du mot de passe via admin API
  const { error: updateError } = await admin.auth.admin.updateUserById(
    target.auth_id,
    { password: newPassword! },
  );
  if (updateError) {
    return NextResponse.json(
      { error: `Erreur mise à jour : ${updateError.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "direct",
    message: `Mot de passe défini pour ${target.nom}. Transmettez-le en main propre.`,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
