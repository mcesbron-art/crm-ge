import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Helpers Supabase côté serveur — UTILISATION SERVER-SIDE UNIQUEMENT.
 * Ne JAMAIS importer ces fonctions depuis un Client Component.
 */

/**
 * Client Supabase serveur — lit/écrit les cookies de session pour gérer l'auth.
 * À utiliser dans :
 *   - Server Components
 *   - Route Handlers (app/api/.../route.ts)
 *   - Server Actions
 *
 * Utilise la clé publishable (anon) + cookies de session.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Set appelé depuis un Server Component (lecture seule) — ignoré.
          }
        },
      },
    },
  );
}

/**
 * Client Supabase ADMIN — utilise la clé secrète (service_role).
 * Bypass tous les RLS, donc à utiliser AVEC PRÉCAUTION et UNIQUEMENT après
 * avoir vérifié les permissions de l'utilisateur connecté.
 *
 * Cas d'usage :
 *   - Créer un compte utilisateur (admin only)
 *   - Réinitialiser le mot de passe d'un utilisateur (admin only)
 *   - Lire des données protégées par RLS (avec garde-fou)
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante. Configurer la variable d'environnement.",
    );
  }

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Récupère l'utilisateur Supabase connecté ou null.
 */
export async function getSupabaseUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Récupère le profil collaborateur (avec rôle, pôle, etc.) de l'utilisateur connecté.
 * Joint auth.users avec la table public.collaborateurs (via auth_id).
 *
 * Retourne null si non connecté ou pas de profil collaborateur.
 */
export type SessionProfile = {
  authId: string;
  id: string;       // UUID du collaborateur
  email: string;
  nom: string;
  pole: string | null;
  avatar: string | null;
  color: string | null;
  role: "direction" | "admin" | "collaborateur";
  base: number;
  actif: boolean;
};

export async function getServerSession(): Promise<SessionProfile | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Récupère le profil collaborateur lié au compte auth
  const { data: profile, error } = await supabase
    .from("collaborateurs")
    .select("id, email, nom, pole, avatar, color, base_heures, role, actif")
    .eq("auth_id", user.id)
    .eq("actif", true)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    authId: user.id,
    id: profile.id,
    email: profile.email,
    nom: profile.nom,
    pole: profile.pole,
    avatar: profile.avatar,
    color: profile.color,
    role: profile.role as "direction" | "admin" | "collaborateur",
    base: Number(profile.base_heures),
    actif: profile.actif,
  };
}
