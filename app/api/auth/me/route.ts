import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

/**
 * GET /api/auth/me
 * Renvoie l'utilisateur connecté ou 401.
 */
export async function GET() {
  const user = await getServerSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
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
