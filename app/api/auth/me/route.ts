import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-server";

/**
 * GET /api/auth/me
 * Renvoie le profil collaborateur connecté ou 401.
 */
export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      email: profile.email,
      nom: profile.nom,
      pole: profile.pole,
      avatar: profile.avatar,
      color: profile.color,
      role: profile.role,
      base: profile.base,
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
