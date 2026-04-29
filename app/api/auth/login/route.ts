import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { sessionOptions, type SessionData } from "@/lib/session";
import { findUserByEmail, getPasswordHash } from "@/lib/auth-server";

/**
 * POST /api/auth/login
 * Body : { email, password }
 *
 * Vérifie le mot de passe (bcrypt) et crée une session si OK.
 *
 * Réponses :
 *   200 { ok: true, user: {...} }
 *   400 { error: "Champs manquants" }
 *   401 { error: "Identifiants invalides" }
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

  // Petit délai constant pour éviter le timing attack (différencier user inconnu vs mauvais MDP)
  await new Promise((r) => setTimeout(r, 300));

  const user = findUserByEmail(email);
  const hash = user ? getPasswordHash(user.email) : null;

  // Toujours appeler bcrypt.compare même si user inconnu, pour temps constant
  const dummyHash = "$2a$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz12345";
  const valid = await bcrypt.compare(password, hash ?? dummyHash);

  if (!user || !hash || !valid) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  // Crée la session (cookie chiffré HttpOnly)
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.userId = user.id;
  session.email = user.email;
  session.role = user.role;
  session.name = user.nom;
  session.loggedInAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      pole: user.pole,
      avatar: user.avatar,
      color: user.color,
      base: user.base,
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
