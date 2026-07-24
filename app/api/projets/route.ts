import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { fetchProjectAggregates } from "@/lib/project-time-aggregates";
import { getAssignedProjectIds } from "@/lib/project-access";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { searchParams } = req.nextUrl;

  const status   = searchParams.get("status");
  const from     = searchParams.get("from");      // YYYY-MM-DD or null → no date filter
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const collab   = searchParams.get("collab");    // UUID or null
  const q        = searchParams.get("q");         // recherche libre (nom / client)
  const pageSize = Math.min(50, parseInt(searchParams.get("page_size") ?? String(PAGE_SIZE), 10));
  const offset   = (page - 1) * pageSize;

  const types = searchParams.getAll("type");

  let query = supabase
    .from("projects")
    .select(
      "id, name, client_name, status, assigned_to, start_date, due_date, axonaut_contract_id, axonaut_quotation_id, created_via, created_at, project_type",
      { count: "exact" },
    )
    .eq("archived", false);

  // Un collaborateur ne voit que les projets où il a au moins une tâche
  // assignée — jamais un id envoyé par le client, toujours session.id, et le
  // paramètre `collab` est ignoré pour ce rôle (il ne peut filtrer que sur
  // lui-même, implicitement, via ses tâches).
  if (!can(session.role, "view_all_projects")) {
    const assignedIds = await getAssignedProjectIds(supabase, session.id);
    if (assignedIds.length === 0) return NextResponse.json({ data: [], total: 0 });
    query = query.in("id", assignedIds);
  } else if (collab) {
    query = query.eq("assigned_to", collab);
  }

  if (status)        query = query.eq("status", status);
  if (from)          query = query.gte("created_at", from);
  if (types.length)  query = query.in("project_type", types);
  if (q?.trim())     query = query.or(`name.ilike.%${q.trim()}%,client_name.ilike.%${q.trim()}%`);

  query = query
    .order("due_date",   { ascending: true,  nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const aggregates = await fetchProjectAggregates(supabase, rows.map(p => p.id as string));
  const enriched = rows.map(p => {
    const agg = aggregates.get(p.id as string);
    return { ...p, total_minutes: agg?.total_minutes ?? 0, tasks_done: agg?.tasks_done ?? 0, tasks_total: agg?.tasks_total ?? 0 };
  });

  return NextResponse.json({ data: enriched, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "create_project")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();

  const body = await req.json();
  const { name, client_name, assigned_to, start_date, due_date } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name requis" }, { status: 400 });

  const insert: Record<string, unknown> = {
    name:        name.trim(),
    client_name: (client_name || "Client à définir").trim(),
    status:      "brief",
    created_via: "manual",
  };
  if (assigned_to) insert.assigned_to = assigned_to;
  if (start_date)  insert.start_date  = start_date;
  if (due_date)    insert.due_date    = due_date;

  const { data, error } = await supabase.from("projects").insert(insert).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
