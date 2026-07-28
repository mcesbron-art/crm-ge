import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { getMyTaskIds } from "@/lib/task-access";
import { getAssignedProjectIds } from "@/lib/project-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIMIT_PER_CATEGORY = 5;

type SearchResult = {
  type: "client" | "ticket" | "tache" | "projet";
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

/**
 * Recherche globale (Cmd+K), transversale à 4 entités. Important : RLS ne
 * filtre PAS la visibilité ici (policies "auth.uid() IS NOT NULL" partout,
 * voir migrations 001/006/014) — le scoping par utilisateur est répliqué
 * explicitement ci-dessous, exactement comme le font déjà les listes
 * existantes (app/api/tickets/route.ts, lib/task-access.ts,
 * lib/project-access.ts), pour ne pas faire fuiter des tickets/tâches/
 * projets qui ne concernent pas l'utilisateur courant.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = createSupabaseServerClient();
  const escaped = q.replace(/[%_]/g, m => `\\${m}`);

  const [clients, tickets, taches, projets] = await Promise.all([
    searchClients(supabase, escaped),
    searchTickets(supabase, escaped, session),
    searchTaches(supabase, escaped, session),
    searchProjets(supabase, escaped, session),
  ]);

  return NextResponse.json({ results: [...clients, ...tickets, ...taches, ...projets] });
}

async function searchClients(supabase: ReturnType<typeof createSupabaseServerClient>, q: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("clients")
    .select("id, nom, secteur")
    .eq("actif", true)
    .ilike("nom", `%${q}%`)
    .limit(LIMIT_PER_CATEGORY);

  return (data ?? []).map(row => ({
    type: "client" as const,
    id: row.id as string,
    label: row.nom as string,
    sublabel: (row.secteur as string | null) ?? "",
    url: `/clients/${row.id}`,
  }));
}

async function searchTickets(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  q: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<SearchResult[]> {
  let allowedIds: string[] | null = null;
  if (!can(session.role, "view_all_tickets")) {
    const [{ data: assignedRows }, { data: collabRows }] = await Promise.all([
      supabase.from("tickets").select("id").eq("assigned_to", session.id),
      supabase.from("ticket_collaborators").select("ticket_id").eq("collaborateur_id", session.id),
    ]);
    allowedIds = Array.from(new Set([
      ...(assignedRows ?? []).map(r => r.id as string),
      ...(collabRows ?? []).map(r => r.ticket_id as string),
    ]));
    if (allowedIds.length === 0) return [];
  }

  let query = supabase
    .from("tickets")
    .select("id, titre, client_name")
    .or(`titre.ilike.%${q}%,client_name.ilike.%${q}%`)
    .limit(LIMIT_PER_CATEGORY);
  if (allowedIds) query = query.in("id", allowedIds);

  const { data } = await query;

  return (data ?? []).map(row => ({
    type: "ticket" as const,
    id: row.id as string,
    label: (row.titre as string) ?? "",
    sublabel: (row.client_name as string | null) ?? "",
    url: `/tickets/${row.id}`,
  }));
}

async function searchTaches(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  q: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<SearchResult[]> {
  let allowedIds: string[] | null = null;
  if (!can(session.role, "view_all_tasks")) {
    allowedIds = await getMyTaskIds(supabase, session.id);
    if (allowedIds.length === 0) return [];
  }

  let query = supabase
    .from("tasks")
    .select("id, label, project_id, projects(name)")
    .ilike("label", `%${q}%`)
    .limit(LIMIT_PER_CATEGORY);
  if (allowedIds) query = query.in("id", allowedIds);

  const { data } = await query;

  return (data ?? []).map(row => {
    const project = row.projects as unknown as { name: string } | null;
    return {
      type: "tache" as const,
      id: row.id as string,
      label: (row.label as string) ?? "",
      sublabel: project?.name ?? "",
      url: row.project_id ? `/projets?open=${row.project_id}` : "/mes-taches",
    };
  });
}

async function searchProjets(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  q: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<SearchResult[]> {
  let allowedIds: string[] | null = null;
  if (!can(session.role, "view_all_projects")) {
    allowedIds = await getAssignedProjectIds(supabase, session.id);
    if (allowedIds.length === 0) return [];
  }

  let query = supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("archived", false)
    .or(`name.ilike.%${q}%,client_name.ilike.%${q}%`)
    .limit(LIMIT_PER_CATEGORY);
  if (allowedIds) query = query.in("id", allowedIds);

  const { data } = await query;

  return (data ?? []).map(row => ({
    type: "projet" as const,
    id: row.id as string,
    label: (row.name as string) ?? "",
    sublabel: (row.client_name as string | null) ?? "",
    url: `/projets?open=${row.id}`,
  }));
}
