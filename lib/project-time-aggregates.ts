import type { createSupabaseServerClient } from "@/lib/supabase-server";

export type ProjectAggregate = {
  total_minutes: number;
  tasks_done: number;
  tasks_total: number;
  estimated_minutes_total: number;
  assignee_ids: string[];
};

/**
 * Une seule requête groupée sur time_entries + une sur tasks pour tous les
 * project_id demandés — évite le N+1 quand on affiche une liste de cards.
 */
export async function fetchProjectAggregates(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  projectIds: string[],
): Promise<Map<string, ProjectAggregate>> {
  const map = new Map<string, ProjectAggregate>();
  if (projectIds.length === 0) return map;
  for (const id of projectIds) map.set(id, { total_minutes: 0, tasks_done: 0, tasks_total: 0, estimated_minutes_total: 0, assignee_ids: [] });

  const [{ data: timeRows }, { data: taskRows }] = await Promise.all([
    supabase.from("time_entries").select("project_id, duration_minutes").in("project_id", projectIds),
    supabase.from("tasks").select("project_id, done, estimated_minutes, assigned_to").in("project_id", projectIds),
  ]);

  for (const row of timeRows ?? []) {
    const agg = map.get(row.project_id as string);
    if (agg) agg.total_minutes += row.duration_minutes as number;
  }
  for (const row of taskRows ?? []) {
    const agg = map.get(row.project_id as string);
    if (!agg) continue;
    agg.tasks_total += 1;
    if (row.done) agg.tasks_done += 1;
    if (row.estimated_minutes) agg.estimated_minutes_total += row.estimated_minutes as number;
    const assignee = row.assigned_to as string | null;
    if (assignee && !agg.assignee_ids.includes(assignee)) agg.assignee_ids.push(assignee);
  }
  return map;
}
