import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * POST /api/auth/logout
 * Détruit la session Supabase.
 */
export async function POST() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
