import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Callback du lien "mot de passe oublié" — l'échange du code PKCE doit se
 * faire ici, côté serveur, avec le MÊME client (cookies via next/headers)
 * qui a servi à appeler resetPasswordForEmail() dans /api/auth/forgot.
 *
 * Avant ce fix, l'échange se faisait côté navigateur sur /reset-password
 * (createSupabaseBrowserClient().exchangeCodeForSession(code)) : ce client
 * lit le "code verifier" PKCE via document.cookie, qui ne voit pas toujours
 * le cookie posé par l'appel serveur initial (chemin de cookie, timing) —
 * d'où l'erreur "PKCE code verifier not found in storage" observée en
 * tentant de réinitialiser un mot de passe. Même schéma que /auth/callback
 * (OAuth Google), qui fonctionne déjà correctement.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/reset-password?error=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/reset-password?error=exchange_failed`);
  }

  // La session est maintenant posée dans les cookies — /reset-password la
  // détecte via getSession() côté navigateur, sans code dans l'URL.
  return NextResponse.redirect(`${origin}/reset-password`);
}
