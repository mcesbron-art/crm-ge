import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/admin/users/[id]/resend-invite
 * RÉSERVÉ ADMIN — renvoie l'email d'invitation Supabase Auth à un
 * collaborateur qui ne s'est encore jamais connecté.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: collab, error } = await admin.from("collaborateurs").select("email").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!collab) return NextResponse.json({ error: "Collaborateur introuvable" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(collab.email as string, {
    redirectTo: `${appUrl}/reset-password`,
  });
  if (inviteErr) return NextResponse.json({ error: `Erreur invitation : ${inviteErr.message}` }, { status: 502 });

  return NextResponse.json({ ok: true });
}
