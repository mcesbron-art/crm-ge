/**
 * Authentification côté serveur — UTILISATION SERVER-SIDE UNIQUEMENT.
 *
 * Ne JAMAIS importer ce fichier depuis un composant client.
 * Liste des utilisateurs autorisés + helper getServerSession().
 */

import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./session";

export type ServerUser = {
  id: number;
  nom: string;
  email: string;
  pole: string;
  avatar: string;
  color: string;
  role: "direction" | "admin" | "collaborateur";
  base: number;
  actif: boolean;
};

/**
 * Utilisateurs autorisés à se connecter.
 * Pour ajouter un utilisateur : éditer cette liste + générer son hash bcrypt
 * via `node scripts/hash-passwords.mjs` et l'ajouter dans USER_PASSWORDS_JSON
 * (variable d'environnement Vercel).
 */
export const SERVER_USERS: ServerUser[] = [
  { id: 0, nom: "Maryline",  email: "maryline@groupe-echo.fr",  pole: "Direction",                      avatar: "MC", color: "#C5A55A", role: "direction",     base: 35, actif: true },
  { id: 1, nom: "Noémie",    email: "noemie@groupe-echo.fr",    pole: "Graphisme / Photo / Vidéo",      avatar: "N",  color: "#8E24AA", role: "collaborateur", base: 35, actif: true },
  { id: 2, nom: "Amandine",  email: "amandine@groupe-echo.fr",  pole: "Web / SEO / Contenu",            avatar: "A",  color: "#1E88E5", role: "collaborateur", base: 35, actif: true },
  { id: 3, nom: "Jérémy",    email: "jeremy@groupe-echo.fr",    pole: "Social Media / Vidéo",           avatar: "J",  color: "#43A047", role: "collaborateur", base: 35, actif: true },
  { id: 4, nom: "Marcellin", email: "marcellin@groupe-echo.fr", pole: "SEO / SEA / Sites standards",    avatar: "M",  color: "#FB8C00", role: "collaborateur", base: 35, actif: true },
  { id: 5, nom: "Arthur",    email: "arthur@groupe-echo.fr",    pole: "Sites complexes / Ads",          avatar: "Ar", color: "#E53935", role: "collaborateur", base: 39, actif: true },
  { id: 6, nom: "Fanny",     email: "fanny@groupe-echo.fr",     pole: "Planning / Production",          avatar: "F",  color: "#00897B", role: "admin",         base: 35, actif: true },
];

export function findUserByEmail(email: string): ServerUser | undefined {
  const e = email.trim().toLowerCase();
  return SERVER_USERS.find((u) => u.email.toLowerCase() === e && u.actif);
}

export function getPasswordHash(email: string): string | null {
  const e = email.trim().toLowerCase();
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(process.env.USER_PASSWORDS_JSON ?? "{}");
  } catch {
    return null;
  }
  // Normalise les clés en minuscules
  const norm: Record<string, string> = {};
  for (const k of Object.keys(parsed)) norm[k.toLowerCase()] = parsed[k];
  return norm[e] ?? null;
}

/**
 * Récupère l'utilisateur connecté depuis le cookie de session.
 * À utiliser dans les Server Components, Route Handlers et Server Actions.
 *
 * Retourne null si non connecté.
 */
export async function getServerSession(): Promise<ServerUser | null> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.userId && session.userId !== 0) return null;
  const user = SERVER_USERS.find((u) => u.id === session.userId && u.actif);
  return user ?? null;
}

/**
 * Variante qui throw (utile dans les routes API où on veut renvoyer 401 directement).
 */
export async function requireServerSession(): Promise<ServerUser> {
  const user = await getServerSession();
  if (!user) {
    throw new AuthError("Non authentifié");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
