import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/users
 * RÉSERVÉ ADMIN — liste complète des collaborateurs (actifs et inactifs)
 * pour la page Administration, enrichie avec :
 *   - la dernière connexion / confirmation (Supabase Auth, pas stockée
 *     dans `collaborateurs`) → sert à distinguer un compte "en attente"
 *     (jamais connecté) d'un compte actif ou désactivé ;
 *   - le nombre de projets sur lesquels le collaborateur a au moins une
 *     tâche assignée (même règle que lib/project-access.ts).
 */
export async function GET() {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const { data: collabs, error } = await admin
    .from("collaborateurs")
    .select("id, auth_id, nom, email, pole, poste, avatar, avatar_url, color, role, actif, base_heures, created_at")
    .order("nom", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Supabase Auth ne fait pas partie de la table `collaborateurs` — on
  // récupère last_sign_in_at par pagination (même pattern que
  // e2e/global-setup.ts::ensureAuthUser) puis on joint par auth_id.
  const authById = new Map<string, { lastSignInAt: string | null; emailConfirmedAt: string | null }>();
  for (let page = 1; ; page++) {
    const { data, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    for (const u of data.users) {
      authById.set(u.id, { lastSignInAt: u.last_sign_in_at ?? null, emailConfirmedAt: u.email_confirmed_at ?? null });
    }
    if (data.users.length < 200) break;
  }

  const { data: taskRows } = await admin.from("tasks").select("project_id, assigned_to");
  const projectsByCollab = new Map<string, Set<string>>();
  for (const row of taskRows ?? []) {
    const collabId = row.assigned_to as string | null;
    const projectId = row.project_id as string | null;
    if (!collabId || !projectId) continue;
    if (!projectsByCollab.has(collabId)) projectsByCollab.set(collabId, new Set());
    projectsByCollab.get(collabId)!.add(projectId);
  }

  const users = (collabs ?? []).map(c => {
    const auth = authById.get(c.auth_id as string) ?? null;
    const status: "active" | "inactive" | "pending" = !auth?.lastSignInAt
      ? "pending"
      : c.actif ? "active" : "inactive";
    return {
      id: c.id as string,
      nom: c.nom as string,
      email: c.email as string,
      pole: (c.pole as string | null) ?? "",
      poste: (c.poste as string | null) ?? "",
      avatar: (c.avatar as string | null) ?? (c.nom as string).slice(0, 2).toUpperCase(),
      avatarUrl: (c.avatar_url as string | null) ?? null,
      color: (c.color as string | null) ?? "#8C6D2F",
      role: c.role as "admin" | "collaborateur",
      actif: c.actif as boolean,
      baseHeures: (c.base_heures as number | null) ?? 35,
      status,
      lastSignInAt: auth?.lastSignInAt ?? null,
      createdAt: c.created_at as string,
      projectCount: projectsByCollab.get(c.id as string)?.size ?? 0,
    };
  });

  return NextResponse.json({ users });
}
