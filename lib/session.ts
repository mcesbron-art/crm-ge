/**
 * Configuration des sessions iron-session.
 *
 * Une session est un cookie HttpOnly + Secure + SameSite=Lax,
 * **chiffré** côté serveur avec SESSION_SECRET. Le client ne peut pas
 * le lire ni le modifier (juste le transporter).
 *
 * Durée : 7 jours, prolongé à chaque requête authentifiée.
 */

import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: number;
  email?: string;
  role?: "direction" | "admin" | "collaborateur";
  name?: string;
  loggedInAt?: string; // ISO date — utile pour audit
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "INSECURE-DEV-ONLY-CHANGE-IN-VERCEL-32-CHARS",
  cookieName: "crm-ge-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  },
};
