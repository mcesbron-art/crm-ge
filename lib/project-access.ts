import "server-only";
import type { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

/**
 * Un Collaborateur voit un projet dès qu'au moins une de ses tâches lui est
 * assignée — comme assigné principal (tasks.assigned_to) OU comme
 * collaborateur additionnel (task_collaborators, migration 032) —
 * indépendamment de projects.assigned_to, qui désigne le propriétaire
 * unique du projet (notifications facturation/BAT), pas l'équipe qui y
 * travaille. Centralisé ici car réutilisé par la page Projets, l'API
 * liste/détail, et l'API tâches d'un projet.
 */
export async function getAssignedProjectIds(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  collaborateurId: string,
): Promise<string[]> {
  const [{ data: own }, { data: collabTasks }] = await Promise.all([
    supabase.from("tasks").select("project_id").eq("assigned_to", collaborateurId),
    supabase.from("task_collaborators").select("task_id").eq("collaborateur_id", collaborateurId),
  ]);
  const ids = new Set<string>();
  for (const r of own ?? []) if (r.project_id) ids.add(r.project_id as string);

  const collabTaskIds = (collabTasks ?? []).map(r => r.task_id as string);
  if (collabTaskIds.length > 0) {
    const { data: collabProjects } = await supabase.from("tasks").select("project_id").in("id", collabTaskIds);
    for (const r of collabProjects ?? []) if (r.project_id) ids.add(r.project_id as string);
  }

  return Array.from(ids);
}

export async function canViewProject(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  projectId: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<boolean> {
  if (can(session.role, "view_all_projects")) return true;
  const { data: own } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .eq("assigned_to", session.id)
    .limit(1)
    .maybeSingle();
  if (own) return true;

  const { data: collabTasks } = await supabase.from("task_collaborators").select("task_id").eq("collaborateur_id", session.id);
  const collabTaskIds = (collabTasks ?? []).map(r => r.task_id as string);
  if (collabTaskIds.length === 0) return false;

  const { data: match } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .in("id", collabTaskIds)
    .limit(1)
    .maybeSingle();
  return !!match;
}
