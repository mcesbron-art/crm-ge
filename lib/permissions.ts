/**
 * Source de vérité unique pour les permissions par rôle — remplace les
 * comparaisons `role === "..."` éparpillées dans les pages et les routes API.
 * Utilisable aussi bien côté client (lib/auth-context.tsx) que côté serveur
 * (session.role dans les routes app/api/**\/route.ts).
 *
 * Deux rôles seulement (voir supabase/migrations/030_roles_two_tier.sql) :
 * "admin" a un accès total et sans exception, "collaborateur" est limité
 * aux ressources qui le concernent (assignation/création propre — vérifiée
 * au cas par cas dans les routes via une comparaison d'id, pas ici).
 */

export type Role = "admin" | "collaborateur";

export type Permission =
  | "view_all_pages"
  | "manage_users"
  | "manage_roles"
  | "view_all_projects"
  | "view_assigned_projects"
  | "create_project"
  | "update_project"
  | "assign_project"
  | "view_all_tasks"
  | "view_assigned_tasks"
  | "create_task"
  | "update_assigned_tasks"
  | "assign_task"
  | "view_all_tickets"
  | "view_assigned_tickets"
  | "create_ticket"
  | "manage_ticket_assignment"
  | "create_opportunity"
  | "view_all_opportunities"
  | "view_own_opportunities"
  | "manage_billing"
  | "view_billing"
  | "manage_absences"
  | "manage_documents"
  | "upload_common_document"
  | "upload_personal_document"
  | "view_all_documents"
  | "view_common_documents"
  | "view_own_documents";

// Ce que le Collaborateur peut faire — tout le reste (create_project,
// assign_task, manage_billing, manage_users, view_all_*, ...) est donc
// implicitement réservé à admin via can() ci-dessous, sans avoir à tenir
// une seconde liste "ADMIN" en synchronisation.
const COLLABORATEUR: Permission[] = [
  "view_assigned_projects",
  "view_assigned_tasks", "update_assigned_tasks",
  "view_assigned_tickets", "create_ticket",
  "create_opportunity", "view_own_opportunities",
  "manage_absences",
  "view_common_documents", "view_own_documents",
];

const COLLABORATEUR_SET = new Set<Permission>(COLLABORATEUR);

/**
 * admin = aucune restriction fonctionnelle (spec : "Aucune restriction
 * fonctionnelle ne doit être appliquée à ce rôle"). Implémenté directement
 * plutôt que via une liste exhaustive, pour ne jamais désynchroniser une
 * permission ajoutée plus tard.
 */
export function can(role: Role, permission: Permission): boolean {
  if (role === "admin") return true;
  return COLLABORATEUR_SET.has(permission);
}
