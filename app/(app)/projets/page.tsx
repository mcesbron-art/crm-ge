import { redirect } from "next/navigation";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { fetchProjectAggregates } from "@/lib/project-time-aggregates";
import { getAssignedProjectIds } from "@/lib/project-access";
import { can } from "@/lib/permissions";
import ProjetsClient, { type Collab, type InitialStatusRow } from "./ProjetsClient";

export const dynamic = "force-dynamic";

const DB_STATUSES = [
  "brief",
  "a_faire",
  "en_cours",
  "attente_element",
  "validation_client",
  "bat_envoye",
  "a_facturer",
  "termine",
] as const;

const PAGE_SIZE = 12;

function defaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

export default async function ProjetsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const canSeeAll = can(session.role, "view_all_projects");

  const supabase = createSupabaseServerClient();
  const from = defaultFrom();

  // Un collaborateur ne voit que les projets où il a au moins une tâche
  // assignée, dès le rendu serveur initial — jamais un filtre côté client
  // (même règle que GET /api/projets).
  const assignedProjectIds = canSeeAll ? null : await getAssignedProjectIds(supabase, session.id);
  const noProjectsAssigned = !canSeeAll && assignedProjectIds!.length === 0;

  const [collabsResult, ...statusResults] = await Promise.all([
    supabase
      .from("collaborateurs")
      .select("id, nom, color, avatar")
      .eq("actif", true)
      .order("nom"),

    ...DB_STATUSES.map((status) => {
      if (noProjectsAssigned) return Promise.resolve({ status, data: [], total: 0 });
      let q = supabase
        .from("projects")
        .select(
          "id, name, client_name, status, assigned_to, start_date, due_date, axonaut_contract_id, axonaut_quotation_id, created_via, created_at, project_type",
          { count: "exact" },
        )
        .eq("status", status)
        .eq("archived", false)
        .gte("created_at", from);
      if (!canSeeAll) q = q.in("id", assignedProjectIds!);
      return q
        .order("due_date",   { ascending: true,  nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1)
        .then((r) => ({ status, data: r.data ?? [], total: r.count ?? 0 }));
    }),
  ]);

  let manualCount = 0;
  if (!noProjectsAssigned) {
    let manualCountQuery = supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("created_via", "manual")
      .eq("archived", false);
    if (!canSeeAll) manualCountQuery = manualCountQuery.in("id", assignedProjectIds!);
    manualCount = (await manualCountQuery).count ?? 0;
  }

  const allIds = statusResults.flatMap(r => r.data.map(p => p.id as string));
  const aggregates = await fetchProjectAggregates(supabase, allIds);
  const enrichedStatusResults = statusResults.map(r => ({
    ...r,
    data: r.data.map(p => {
      const agg = aggregates.get(p.id as string);
      return { ...p, total_minutes: agg?.total_minutes ?? 0, tasks_done: agg?.tasks_done ?? 0, tasks_total: agg?.tasks_total ?? 0 };
    }),
  }));

  return (
    <ProjetsClient
      initialStatusData={enrichedStatusResults as InitialStatusRow[]}
      collaborateurs={(collabsResult.data ?? []) as Collab[]}
      defaultFrom={from}
      manualCount={manualCount ?? 0}
    />
  );
}
