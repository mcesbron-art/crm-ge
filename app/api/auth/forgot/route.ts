import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * POST /api/auth/forgot
 * Body : { email }
 *
 * Demande à Supabase d'envoyer un email de réinitialisation à l'utilisateur.
 * Le lien dans l'email pointe vers /auth/reset-callback (à configurer dans
 * Supabase Authentication > URL Configuration > Redirect URLs), qui échange
 * le code PKCE côté serveur avant de rediriger vers /reset-password — voir
 * app/auth/reset-callback/route.ts pour le pourquoi (le faire côté
 * navigateur cassait avec "PKCE code verifier not found in storage").
 *
 * Réponse toujours 200 (anti-enumeration) — le message ne révèle pas si l'email existe.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // resetPasswordForEmail envoie un email avec un lien magique vers redirectTo
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-callback`,
  });

  // Message neutre — pas d'erreur même si l'email n'existe pas (anti-enum)
  return NextResponse.json({
    ok: true,
    message:
      "Si cet email correspond à un compte existant, un lien de réinitialisation vous a été envoyé.",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
