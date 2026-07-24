import { createClient } from "@supabase/supabase-js";

/**
 * Provisionne les comptes et données nécessaires au scénario
 * billing-workflow.spec.ts : un compte "collaborateur" et un compte "admin"
 * (rôles réels de lib/permissions.ts), plus un projet + une tâche assignée
 * au collaborateur. Idempotent — peut être relancé sans accumulation.
 *
 * Nécessite SUPABASE_SERVICE_ROLE_KEY (même clé que le reste de l'app,
 * lib/supabase-server.ts) pour créer les comptes Supabase Auth et
 * contourner RLS. Écrit dans le MÊME projet Supabase que le développement
 * (aucun environnement de test séparé n'existe dans ce repo) — les
 * comptes/données créés sont préfixés "E2E" pour rester identifiables.
 */

export const E2E_COLLAB_EMAIL = process.env.E2E_COLLAB_EMAIL ?? "e2e-collab@groupe-echo.fr";
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@groupe-echo.fr";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "E2eTest-2026!";
export const E2E_TASK_LABEL = "[E2E] Tâche facturation";
export const E2E_BAT_TASK_LABEL = "[E2E] Tâche BAT";
export const E2E_PROJECT_NAME = "[E2E] Projet facturation";
export const E2E_PROJECT_ID = "e2e00000-0000-4000-8000-000000000101";
// Projet avec une tâche assignée à l'admin e2e (jamais au collaborateur) —
// sert à vérifier que le Collaborateur ne voit pas un projet où seul un
// AUTRE collaborateur a une tâche (permissions-collaborateur.spec.ts).
export const E2E_OTHER_PROJECT_NAME = "[E2E] Projet non assigné";
export const E2E_OTHER_PROJECT_ID = "e2e00000-0000-4000-8000-000000000102";
// Projet SANS projects.assigned_to (jamais assigné directement) mais avec
// une tâche assignée au collaborateur — prouve que la visibilité repose
// bien sur les tâches assignées, pas sur projects.assigned_to.
export const E2E_TASK_ONLY_PROJECT_NAME = "[E2E] Projet visible via tâche uniquement";
export const E2E_TASK_ONLY_PROJECT_ID = "e2e00000-0000-4000-8000-000000000103";
export const E2E_TICKET_TITLE = "[E2E] Ticket collaborateur";
// Ticket assigné à l'admin e2e, jamais au collaborateur — sert à vérifier
// que le scoping tickets (assigned_to + ticket_collaborators) est étanche.
export const E2E_OTHER_TICKET_TITLE = "[E2E] Ticket non assigné au collaborateur";
// IDs fixes (au lieu de laisser Postgres générer un uuid) pour que les specs
// puissent cibler directement /api/tickets/<id> sans dépendre d'un lookup
// admin préalable — un collaborateur qui devine/connaît cet id est
// justement le scénario que le scoping doit bloquer.
export const E2E_TICKET_ID = "e2e00000-0000-4000-8000-000000000001";
export const E2E_OTHER_TICKET_ID = "e2e00000-0000-4000-8000-000000000002";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis pour le setup e2e");
  return createClient(url, key);
}

async function ensureAuthUser(supabase: ReturnType<typeof adminClient>, email: string, password: string): Promise<string> {
  const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created?.user) return created.user.id;
  if (error && !/already.*registered|already exists/i.test(error.message)) throw error;

  // Utilisateur déjà créé lors d'un run précédent — le retrouver par email.
  let page = 1;
  for (;;) {
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw listErr;
    const found = data.users.find(u => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page++;
  }
  throw new Error(`Impossible de retrouver l'utilisateur Auth ${email}`);
}

async function ensureCollaborateur(
  supabase: ReturnType<typeof adminClient>,
  authId: string, email: string, nom: string, role: "collaborateur" | "admin"
): Promise<string> {
  const { data: existing } = await supabase.from("collaborateurs").select("id").eq("auth_id", authId).maybeSingle();
  if (existing) {
    await supabase.from("collaborateurs").update({ role, actif: true }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("collaborateurs")
    .insert({ auth_id: authId, email, nom, role, actif: true, color: "#8C6D2F" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export default async function globalSetup() {
  const supabase = adminClient();

  const collabAuthId = await ensureAuthUser(supabase, E2E_COLLAB_EMAIL, E2E_PASSWORD);
  const adminAuthId = await ensureAuthUser(supabase, E2E_ADMIN_EMAIL, E2E_PASSWORD);
  const collabId = await ensureCollaborateur(supabase, collabAuthId, E2E_COLLAB_EMAIL, "E2E Collaborateur", "collaborateur");
  const adminId = await ensureCollaborateur(supabase, adminAuthId, E2E_ADMIN_EMAIL, "E2E Admin", "admin");

  const projectId = E2E_PROJECT_ID;
  const { error: projectErr } = await supabase.from("projects").upsert({
    id: projectId, name: E2E_PROJECT_NAME, client_name: "[E2E] Client test",
    status: "en_cours", created_via: "manual", assigned_to: collabId,
  });
  if (projectErr) throw projectErr;

  const { data: existingTask } = await supabase.from("tasks").select("id").eq("project_id", projectId).eq("label", E2E_TASK_LABEL).maybeSingle();
  let taskId = existingTask?.id as string | undefined;
  if (!taskId) {
    const { data, error } = await supabase
      .from("tasks")
      .insert({ project_id: projectId, label: E2E_TASK_LABEL, assigned_to: collabId, stage: "a_faire", priority: "Normale" })
      .select("id")
      .single();
    if (error) throw error;
    taskId = data.id;
  } else {
    // Repart d'un état propre à chaque run : réassignée, en "a_faire".
    await supabase.from("tasks").update({ assigned_to: collabId, stage: "a_faire", done: false }).eq("id", taskId);
  }

  // Idempotence : purge les demandes de facturation et l'historique d'un run précédent.
  await supabase.from("task_events").delete().eq("task_id", taskId);
  await supabase.from("task_billing_requests").delete().eq("task_id", taskId);
  // Idem pour le chrono (timer-sidebar.spec.ts) : repart sans chrono actif/en
  // pause laissé par un run précédent.
  await supabase.from("task_timers").delete().eq("task_id", taskId);

  // Tâche séparée pour le scénario BAT — pour ne pas interférer avec l'état
  // (stage, task_billing_requests) laissé par billing-workflow.spec.ts sur
  // la tâche ci-dessus.
  const { data: existingBatTask } = await supabase.from("tasks").select("id").eq("project_id", projectId).eq("label", E2E_BAT_TASK_LABEL).maybeSingle();
  let batTaskId = existingBatTask?.id as string | undefined;
  if (!batTaskId) {
    const { data, error } = await supabase
      .from("tasks")
      .insert({ project_id: projectId, label: E2E_BAT_TASK_LABEL, assigned_to: collabId, stage: "a_faire", priority: "Normale" })
      .select("id")
      .single();
    if (error) throw error;
    batTaskId = data.id;
  } else {
    await supabase.from("tasks").update({ assigned_to: collabId, stage: "a_faire", done: false }).eq("id", batTaskId);
  }
  await supabase.from("task_events").delete().eq("task_id", batTaskId);
  await supabase.from("task_bat_revisions").delete().eq("task_id", batTaskId);

  // Projet avec une tâche assignée à l'ADMIN e2e (jamais au collaborateur) —
  // vérifie que le Collaborateur ne voit pas un projet où seul un autre
  // collaborateur a une tâche, même si le projet en a plusieurs.
  const { error: otherProjectErr } = await supabase.from("projects").upsert({
    id: E2E_OTHER_PROJECT_ID, name: E2E_OTHER_PROJECT_NAME, client_name: "[E2E] Autre client",
    status: "en_cours", created_via: "manual", assigned_to: null,
  });
  if (otherProjectErr) throw otherProjectErr;

  const otherTaskLabel = "[E2E] Tâche autre collaborateur";
  const { data: existingOtherTask } = await supabase.from("tasks").select("id").eq("project_id", E2E_OTHER_PROJECT_ID).eq("label", otherTaskLabel).maybeSingle();
  if (!existingOtherTask) {
    const { error } = await supabase.from("tasks").insert({ project_id: E2E_OTHER_PROJECT_ID, label: otherTaskLabel, assigned_to: adminId, stage: "a_faire", priority: "Normale" });
    if (error) throw error;
  } else {
    await supabase.from("tasks").update({ assigned_to: adminId }).eq("id", existingOtherTask.id);
  }

  // Projet SANS projects.assigned_to, mais avec une tâche assignée au
  // collaborateur — prouve que la visibilité repose sur les tâches
  // assignées et non sur projects.assigned_to (règle historique).
  const { error: taskOnlyProjectErr } = await supabase.from("projects").upsert({
    id: E2E_TASK_ONLY_PROJECT_ID, name: E2E_TASK_ONLY_PROJECT_NAME, client_name: "[E2E] Client test",
    status: "en_cours", created_via: "manual", assigned_to: null,
  });
  if (taskOnlyProjectErr) throw taskOnlyProjectErr;

  const taskOnlyLabel = "[E2E] Tâche visibilité seule";
  const { data: existingTaskOnlyTask } = await supabase.from("tasks").select("id").eq("project_id", E2E_TASK_ONLY_PROJECT_ID).eq("label", taskOnlyLabel).maybeSingle();
  if (!existingTaskOnlyTask) {
    const { error } = await supabase.from("tasks").insert({ project_id: E2E_TASK_ONLY_PROJECT_ID, label: taskOnlyLabel, assigned_to: collabId, stage: "a_faire", priority: "Normale" });
    if (error) throw error;
  } else {
    await supabase.from("tasks").update({ assigned_to: collabId }).eq("id", existingTaskOnlyTask.id);
  }

  // Ticket assigné au collaborateur e2e — doit apparaître dans sa liste.
  const { error: ticketErr } = await supabase.from("tickets").upsert({
    id: E2E_TICKET_ID, titre: E2E_TICKET_TITLE, client_name: "[E2E] Client test",
    statut: "ouvert", created_via: "manual", assigned_to: collabId,
  });
  if (ticketErr) throw ticketErr;

  // Ticket assigné à l'admin e2e (jamais au collaborateur, ni en
  // ticket_collaborators) — vérifie l'étanchéité du scoping.
  const { error: otherTicketErr } = await supabase.from("tickets").upsert({
    id: E2E_OTHER_TICKET_ID, titre: E2E_OTHER_TICKET_TITLE, client_name: "[E2E] Autre client",
    statut: "ouvert", created_via: "manual", assigned_to: adminId,
  });
  if (otherTicketErr) throw otherTicketErr;
  await supabase.from("ticket_collaborators").delete().eq("ticket_id", E2E_OTHER_TICKET_ID).eq("collaborateur_id", collabId);
  await supabase.from("ticket_comments").delete().eq("ticket_id", E2E_OTHER_TICKET_ID);
}
