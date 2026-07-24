import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_DOMAIN = "@groupe-echo.fr";

/**
 * Callback OAuth (Google) — appelé par Supabase après authentification.
 * Échange le code contre une session, puis applique les mêmes règles
 * d'accès que la connexion email/mot de passe (cf. /api/auth/login) :
 * domaine autorisé + profil collaborateur actif.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const email = data.user.email ?? "";
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=domain`);
  }

  const { data: profile } = await supabase
    .from("collaborateurs")
    .select("id, actif")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.actif) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=profile`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
