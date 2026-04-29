import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * POST /api/auth/login
 * Body : { email, password }
 *
 * Connecte l'utilisateur via Supabase Auth.
 * Le cookie de session est posé automatiquement par le SDK SSR.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Message neutre pour ne pas révéler si l'email existe ou non (anti-enum)
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  // Vérifie que le profil collaborateur existe et est actif
  const { data: profile } = await supabase
    .from("collaborateurs")
    .select("id, nom, role, actif")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.actif) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Compte désactivé ou profil manquant" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: data.user.email,
      nom: profile.nom,
      role: profile.role,
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
