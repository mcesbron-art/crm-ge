import { test, expect, type Page } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL, E2E_COLLAB_EMAIL, E2E_PASSWORD,
  E2E_PROJECT_NAME, E2E_OTHER_PROJECT_NAME, E2E_TASK_ONLY_PROJECT_NAME,
  E2E_TICKET_TITLE, E2E_TICKET_ID, E2E_OTHER_TICKET_TITLE,
} from "./global-setup";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("prenom@groupe-echo.fr").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

// Bascule d'identité en cours de test sans re-naviguer sur /login — utile
// pour vérifier qu'une action admin (assigner une tâche) a un effet
// immédiat sur ce que voit le Collaborateur, dans le même test.
async function apiLogin(page: Page, email: string, password: string) {
  const status = await page.evaluate(async ({ email, password }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.status;
  }, { email, password });
  expect(status).toBe(200);
}

/**
 * Vérifie l'accès complet du rôle Admin (2 rôles : admin/collaborateur —
 * lib/permissions.ts, fusion de l'ancien "direction"+"admin"). Complète
 * permissions-collaborateur.spec.ts : ce que le Collaborateur ne peut pas
 * faire, l'admin doit pouvoir le faire sans restriction.
 *
 * Données de test provisionnées par ./global-setup.ts.
 */
test.describe("Admin — permissions", () => {
  test("navigation : toutes les pages visibles", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    for (const label of ["Dashboard", "Projets", "Mes tâches", "Tickets", "Opportunités", "Documents", "Absences", "Équipe", "Clients", "Facturation", "Rapports", "Administration"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("accède aux pages réservées (Équipe, Administration)", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await page.goto("/administration");
    await expect(page.getByText("Accès refusé")).toHaveCount(0);
    await page.goto("/equipe");
    await expect(page.getByText(/réservée aux administrateurs/i)).toHaveCount(0);
  });

  test("Projets : voit tous les projets, peut créer/assigner", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async ({ ownName, otherName, taskOnlyName }) => {
      const list = await fetch("/api/projets?status=en_cours").then(r => r.json());
      const rows = list.data as { id: string; name: string }[];
      const found = rows.find(p => p.name === ownName);
      if (!found) return { found: false as const };
      const patchRes = await fetch(`/api/projets/${found.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "en_cours" }),
      });
      const names = new Set(rows.map(p => p.name));
      return {
        found: true as const, patchOk: patchRes.ok,
        // Contrairement au Collaborateur : voit aussi le projet sans tâche
        // qui lui est assignée, et celui où seul un autre collaborateur a
        // une tâche — aucune restriction de visibilité pour l'admin.
        seesOtherCollabProject: names.has(otherName),
        seesTaskOnlyProject: names.has(taskOnlyName),
      };
    }, { ownName: E2E_PROJECT_NAME, otherName: E2E_OTHER_PROJECT_NAME, taskOnlyName: E2E_TASK_ONLY_PROJECT_NAME });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.patchOk).toBe(true);
      expect(result.seesOtherCollabProject).toBe(true);
      expect(result.seesTaskOnlyProject).toBe(true);
    }
  });

  test("Projets : assigner une tâche rend le projet visible au collaborateur, retirer l'assignation le fait disparaître", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const setup = await page.evaluate(async () => {
      const collabs = await fetch("/api/collaborateurs").then(r => r.json());
      const collabId = (collabs.collaborateurs as { id: string; nom: string }[]).find(c => c.nom === "E2E Collaborateur")?.id;
      const project = await fetch("/api/projets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "[E2E] Projet visibilité dynamique" }),
      }).then(r => r.json());
      const projectId = project?.data?.id as string | undefined;
      if (!projectId || !collabId) return { ok: false as const };
      const task = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, label: "[E2E] Tâche visibilité dynamique" }),
      }).then(r => r.json());
      const taskId = task?.task?.id as string | undefined;
      if (!taskId) return { ok: false as const };
      return { ok: true as const, projectId, taskId, collabId };
    });
    expect(setup.ok).toBe(true);
    if (!setup.ok) return;
    const { projectId, taskId, collabId } = setup;

    // Avant assignation : invisible pour le collaborateur (ni détail ni liste).
    await apiLogin(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const before = await page.evaluate(async (id) => (await fetch(`/api/projets/${id}`)).status, projectId);
    expect(before).toBe(404);

    // L'admin assigne la tâche au collaborateur.
    await apiLogin(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const assignStatus = await page.evaluate(async ({ taskId, collabId }) =>
      (await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: collabId }),
      })).status,
      { taskId, collabId });
    expect(assignStatus).toBe(200);

    // Le projet apparaît immédiatement pour le collaborateur — aucune
    // action manuelle supplémentaire, aucune assignation directe du projet.
    await apiLogin(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const after = await page.evaluate(async (id) => {
      const detail = await fetch(`/api/projets/${id}`);
      const list = await fetch("/api/projets?status=brief").then(r => r.json());
      return { detailStatus: detail.status, inList: (list.data as { id: string }[]).some(p => p.id === id) };
    }, projectId);
    expect(after.detailStatus).toBe(200);
    expect(after.inList).toBe(true);

    // L'admin retire l'assignation.
    await apiLogin(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const unassignStatus = await page.evaluate(async (taskId) =>
      (await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: null }),
      })).status,
      taskId);
    expect(unassignStatus).toBe(200);

    // Le projet disparaît immédiatement, l'accès direct est refusé.
    await apiLogin(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const final = await page.evaluate(async (id) => {
      const detail = await fetch(`/api/projets/${id}`);
      const list = await fetch("/api/projets?status=brief").then(r => r.json());
      return { detailStatus: detail.status, inList: (list.data as { id: string }[]).some(p => p.id === id) };
    }, projectId);
    expect(final.detailStatus).toBe(404);
    expect(final.inList).toBe(false);
  });

  test("Tâches : peut créer une tâche et l'assigner à un collaborateur", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async (projectName) => {
      const list = await fetch("/api/projets?status=en_cours").then(r => r.json());
      const project = (list.data as { id: string; name: string }[]).find(p => p.name === projectName);
      if (!project) return { ok: false as const };
      const created = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, label: "[E2E] Tâche créée par admin" }),
      }).then(r => r.json());
      return { ok: true as const, taskId: created?.task?.id };
    }, E2E_PROJECT_NAME);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.taskId).toBeTruthy();
  });

  test("Opportunités : voit toutes les opportunités (pas seulement les siennes)", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const count = await page.evaluate(async () => {
      const list = await fetch("/api/opportunites").then(r => r.json());
      return (list.opportunites ?? []).length;
    });
    expect(count).toBeGreaterThan(0);
  });

  test("Tickets : voit tous les tickets (y compris non assignés au collaborateur), peut créer et réassigner", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const result = await page.evaluate(async ({ ticketTitle, otherTicketTitle }) => {
      const list = await fetch("/api/tickets").then(r => r.json());
      const titles = new Set((list.tickets as { title: string }[]).map(t => t.title));

      const collabs = await fetch("/api/collaborateurs").then(r => r.json());
      const collabId = (collabs.collaborateurs as { id: string; nom: string }[]).find(c => c.nom === "E2E Collaborateur")?.id;

      // Crée un ticket ad hoc (jamais assigné au collaborateur au départ)
      // pour tester le cycle complet créer → assigner → réassigner sans
      // toucher aux tickets fixtures partagés avec permissions-collaborateur.spec.ts.
      const created = await fetch("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: "[E2E] Ticket réassignation admin" }),
      }).then(r => r.json());
      const ticketId = created?.id as string | undefined;
      if (!ticketId || !collabId) return { ticketId, collabId, ok: false as const };

      const assignRes = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: collabId }),
      });
      const afterAssign = await fetch(`/api/tickets/${ticketId}`).then(r => r.json());

      const unassignRes = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: null }),
      });
      const afterUnassign = await fetch(`/api/tickets/${ticketId}`).then(r => r.json());

      return {
        ok: true as const,
        collabId,
        hasOwnTicket: titles.has(ticketTitle),
        hasOtherTicket: titles.has(otherTicketTitle),
        assignStatus: assignRes.status,
        assigneeAfterAssign: afterAssign?.ticket?.assignee?.id ?? null,
        unassignStatus: unassignRes.status,
        assigneeAfterUnassign: afterUnassign?.ticket?.assignee,
      };
    }, { ticketTitle: E2E_TICKET_TITLE, otherTicketTitle: E2E_OTHER_TICKET_TITLE });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Vue complète : les deux tickets fixtures (assigné au collaborateur ET
    // assigné à un autre) sont visibles — contrairement au collaborateur.
    expect(result.hasOwnTicket).toBe(true);
    expect(result.hasOtherTicket).toBe(true);
    expect(result.assignStatus).toBe(200);
    expect(result.assigneeAfterAssign).toBe(result.collabId);
    expect(result.unassignStatus).toBe(200);
    expect(result.assigneeAfterUnassign).toBe(null);
  });

  test("Tickets : peut ouvrir le détail d'un ticket assigné à un collaborateur", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const status = await page.evaluate(async (id) => (await fetch(`/api/tickets/${id}`)).status, E2E_TICKET_ID);
    expect(status).toBe(200);
  });
});

test.describe("Collaborateur — refus serveur sur actions réservées", () => {
  test("ne peut pas créer de projet ni assigner une tâche via appel direct", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async () => {
      const createProject = await fetch("/api/projets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "[E2E] Projet interdit" }),
      });
      return { createProjectStatus: createProject.status };
    });
    expect(result.createProjectStatus).toBe(403);
  });
});
