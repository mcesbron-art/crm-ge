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
// Projet volontairement NON assigné au collaborateur e2e — sert à vérifier
// permissions-collaborateur.spec.ts (page Projets scopée à l'assignation).
export const E2E_OTHER_PROJECT_NAME = "[E2E] Projet non assigné";

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
  await ensureCollaborateur(supabase, adminAuthId, E2E_ADMIN_EMAIL, "E2E Admin", "admin");

  const { data: existingProject } = await supabase.from("projects").select("id").eq("name", E2E_PROJECT_NAME).maybeSingle();
  const projectId = existingProject?.id ?? (await supabase
    .from("projects")
    .insert({ name: E2E_PROJECT_NAME, client_name: "[E2E] Client test", status: "en_cours", created_via: "manual", assigned_to: collabId })
    .select("id")
    .single()).data?.id;
  if (!projectId) throw new Error("Impossible de créer le projet de test e2e");
  // Repart d'un état propre : un run précédent (billing/bat-workflow) a pu
  // réassigner le projet — le scoping collaborateur (app/api/projets/route.ts)
  // filtre sur projects.assigned_to, pas sur les tâches qu'il contient.
  await supabase.from("projects").update({ assigned_to: collabId }).eq("id", projectId);

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

  // Projet non assigné (assigned_to null) — utilisé pour vérifier que le
  // Collaborateur ne le voit ni dans sa liste ni en accès direct.
  const { data: existingOther } = await supabase.from("projects").select("id").eq("name", E2E_OTHER_PROJECT_NAME).maybeSingle();
  if (!existingOther) {
    const { error } = await supabase
      .from("projects")
      .insert({ name: E2E_OTHER_PROJECT_NAME, client_name: "[E2E] Autre client", status: "en_cours", created_via: "manual", assigned_to: null });
    if (error) throw error;
  } else {
    await supabase.from("projects").update({ assigned_to: null }).eq("id", existingOther.id);
  }
}
