import "server-only";
import type { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

/**
 * Une tâche est accessible (saisie de temps, modification des champs hors
 * réassignation) par son assigné principal (tasks.assigned_to), par un
 * collaborateur additionnel (task_collaborators — migration 032), ou par un
 * rôle avec view_all_tasks (admin). Centralisé ici car réutilisé par
 * plusieurs routes (saisie de temps, édition de tâche, liste des tâches).
 *
 * Les actions de décision (BAT, demande de facturation, mise en attente)
 * restent volontairement réservées au seul assigné principal + admin — ne
 * pas utiliser ce helper pour ces routes-là.
 */
export async function canAccessTask(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  taskId: string,
  session: { id: string; role: "admin" | "collaborateur" },
): Promise<boolean> {
  if (can(session.role, "view_all_tasks")) return true;
  const { data: task } = await supabase.from("tasks").select("assigned_to").eq("id", taskId).maybeSingle();
  if (task?.assigned_to === session.id) return true;
  const { data: collab } = await supabase
    .from("task_collaborators")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("collaborateur_id", session.id)
    .maybeSingle();
  return !!collab;
}

/** Ids des tâches où collaborateurId est assigné principal OU collaborateur additionnel. */
export async function getMyTaskIds(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  collaborateurId: string,
): Promise<string[]> {
  const [{ data: own }, { data: collab }] = await Promise.all([
    supabase.from("tasks").select("id").eq("assigned_to", collaborateurId),
    supabase.from("task_collaborators").select("task_id").eq("collaborateur_id", collaborateurId),
  ]);
  const ids = new Set<string>();
  for (const r of own ?? []) ids.add(r.id as string);
  for (const r of collab ?? []) ids.add(r.task_id as string);
  return Array.from(ids);
}
