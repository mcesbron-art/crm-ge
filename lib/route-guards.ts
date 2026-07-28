import "server-only";

import { redirect } from "next/navigation";
import { getServerSession, type SessionProfile } from "@/lib/supabase-server";
import { can, type Permission } from "@/lib/permissions";

/**
 * Garde d'accès serveur pour les segments réservés (app/(app)/*\/layout.tsx).
 * S'exécute avant tout rendu de page — Next.js réévalue les layouts serveur
 * à chaque navigation (y compris via <Link>), donc ce garde s'applique aussi
 * bien au premier chargement qu'à une navigation côté client. Aucun flash de
 * contenu protégé possible : la redirection a lieu avant que la page ne soit
 * envoyée au navigateur.
 */

export async function requireSession(): Promise<SessionProfile> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionProfile> {
  const session = await requireSession();
  if (!can(session.role, permission)) redirect("/dashboard");
  return session;
}
