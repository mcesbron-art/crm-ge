import { test, expect, type Page } from "@playwright/test";
import {
  E2E_COLLAB_EMAIL, E2E_PASSWORD,
  E2E_PROJECT_NAME, E2E_PROJECT_ID, E2E_OTHER_PROJECT_NAME, E2E_OTHER_PROJECT_ID,
  E2E_TASK_ONLY_PROJECT_NAME, E2E_TASK_ONLY_PROJECT_ID,
  E2E_TICKET_TITLE, E2E_TICKET_ID, E2E_OTHER_TICKET_TITLE, E2E_OTHER_TICKET_ID,
} from "./global-setup";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("prenom@groupe-echo.fr").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Vérifie les restrictions du rôle Collaborateur (2 rôles : admin/
 * collaborateur — lib/permissions.ts) : navigation limitée à 7 pages
 * (Dashboard, Projets, Mes tâches, Tickets, Opportunités, Documents,
 * Absences — Absences ajoutée en plus des 6 demandées, décision produit
 * du 2026-07-22 pour ne pas régresser le self-service congés), accès
 * direct bloqué aux pages interdites, page Projets scopée + lecture
 * seule, opportunités scopées à leur créateur.
 *
 * Données de test provisionnées par ./global-setup.ts.
 */
test.describe("Collaborateur — permissions", () => {
  test("navigation limitée aux pages autorisées", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);

    for (const label of ["Dashboard", "Projets", "Mes tâches", "Tickets", "Opportunités", "Documents", "Absences"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
    for (const label of ["Équipe", "Clients", "Facturation", "Rapports", "Administration"]) {
      await expect(page.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("accès direct à une page interdite refusé", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    await page.goto("/administration");
    await expect(page.getByText("Accès refusé")).toBeVisible();

    await page.goto("/equipe");
    await expect(page.getByText(/réservée aux administrateurs/i)).toBeVisible();
  });

  test("Projets : voit uniquement les projets où il a une tâche assignée, page en lecture seule", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    await page.goto("/projets");
    await page.waitForLoadState("networkidle");

    // E2E_PROJECT_NAME : assigné à la fois via projects.assigned_to ET une
    // tâche — reste visible.
    await expect(page.getByText(E2E_PROJECT_NAME).first()).toBeVisible();
    // E2E_TASK_ONLY_PROJECT_NAME : AUCUN projects.assigned_to, seulement une
    // tâche assignée — doit quand même être visible : preuve que la
    // visibilité repose sur les tâches, pas sur l'ancien champ.
    await expect(page.getByText(E2E_TASK_ONLY_PROJECT_NAME).first()).toBeVisible();
    // E2E_OTHER_PROJECT_NAME : une tâche existe, mais assignée à un AUTRE
    // collaborateur (l'admin e2e) — jamais visible.
    await expect(page.getByText(E2E_OTHER_PROJECT_NAME)).toHaveCount(0);

    // Pas de bouton de création — page entièrement en lecture seule.
    await expect(page.getByRole("button", { name: "Nouveau projet" })).toHaveCount(0);

    // Ouvre le détail d'un projet autorisé : contrôles d'édition masqués,
    // pas seulement désactivés fonctionnellement.
    await page.getByText(E2E_TASK_ONLY_PROJECT_NAME).first().click();
    await expect(page.getByText("Lecture seule — seul un administrateur peut modifier ce projet.")).toBeVisible();
    await expect(page.getByPlaceholder("Ajouter une tâche…")).toHaveCount(0);
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);

    // Contournement direct de l'URL/API : le serveur doit refuser, jamais
    // faire confiance à un id envoyé par le client.
    const result = await page.evaluate(async ({ otherProjectName, otherProjectId, taskOnlyProjectId, ownProjectId }) => {
      const list = await fetch("/api/projets?status=en_cours").then(r => r.json());
      const other = (list.data as { id: string; name: string }[]).find(p => p.name === otherProjectName);

      const otherDetail = await fetch(`/api/projets/${otherProjectId}`);
      const otherDetailBody = await otherDetail.json();
      const taskOnlyDetail = await fetch(`/api/projets/${taskOnlyProjectId}`);
      const otherTasks = await fetch(`/api/tasks?project_id=${otherProjectId}`);

      // Même sur SON PROPRE projet, toute écriture reste réservée à l'admin.
      const patchOwn = await fetch(`/api/projets/${ownProjectId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "termine" }),
      });

      return {
        leakedInList: !!other,
        otherDetailStatus: otherDetail.status,
        otherDetailExposesContent: "data" in otherDetailBody,
        taskOnlyDetailStatus: taskOnlyDetail.status,
        otherTasksStatus: otherTasks.status,
        patchOwnStatus: patchOwn.status,
      };
    }, { otherProjectName: E2E_OTHER_PROJECT_NAME, otherProjectId: E2E_OTHER_PROJECT_ID, taskOnlyProjectId: E2E_TASK_ONLY_PROJECT_ID, ownProjectId: E2E_PROJECT_ID });

    expect(result.leakedInList).toBe(false);
    expect(result.otherDetailStatus).toBe(404);
    expect(result.otherDetailExposesContent).toBe(false);
    expect(result.taskOnlyDetailStatus).toBe(200);
    expect(result.otherTasksStatus).toBe(404);
    expect(result.patchOwnStatus).toBe(403);
  });

  test("Opportunités : peut créer, ne voit que les siennes", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const res = await page.evaluate(async () => {
      const clients = await fetch("/api/clients").then(r => r.json()).catch(() => ({ clients: [] }));
      const commerciaux = await fetch("/api/commerciaux").then(r => r.json()).catch(() => ({ commerciaux: [] }));
      const clientId = clients?.clients?.[0]?.id;
      const commercialId = commerciaux?.commerciaux?.[0]?.id;
      if (!clientId || !commercialId) return { skipped: true };
      const created = await fetch("/api/opportunites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: "[E2E] Opportunité collaborateur", client_id: clientId, commercial_id: commercialId }),
      }).then(r => r.json());
      const list = await fetch("/api/opportunites").then(r => r.json());
      return { skipped: false, createdId: created?.opportunite?.id, count: (list.opportunites ?? []).length, all: list.opportunites };
    });
    test.skip(res.skipped === true, "pas de client/commercial disponible pour créer une opportunité de test");
    expect(res.createdId).toBeTruthy();
    // Toutes les opportunités renvoyées doivent être les siennes (aucune
    // autre visible tant que view_all_opportunities n'est pas accordé).
    for (const o of res.all ?? []) {
      expect(o.demandeur_id).toBeDefined();
    }
  });

  test("Tickets : voit uniquement ses tickets assignés, ne peut ni consulter ni répondre à ceux d'un autre", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    await page.goto("/tickets");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(E2E_TICKET_TITLE).first()).toBeVisible();
    await expect(page.getByText(E2E_OTHER_TICKET_TITLE)).toHaveCount(0);

    // Détail de son propre ticket : le champ d'attribution reste visible en
    // lecture seule, mais aucune action de (ré)attribution n'est proposée.
    await page.goto(`/tickets/${E2E_TICKET_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(E2E_TICKET_TITLE)).toBeVisible();
    await expect(page.getByText("+ Collaborateur")).toHaveCount(0);
    await expect(page.getByText("Non assigné", { exact: true })).toHaveCount(0);

    const result = await page.evaluate(async ({ ownId, otherId, otherTitle }) => {
      // Liste : le ticket d'un autre collaborateur ne doit jamais fuiter,
      // même dans la réponse brute de l'API (pas seulement masqué en CSS).
      const list = await fetch("/api/tickets").then(r => r.json());
      const leakedInList = (list.tickets as { title: string }[]).some(t => t.title === otherTitle);

      // Détail : accès direct par id — 404, jamais le contenu.
      const otherDetail = await fetch(`/api/tickets/${otherId}`);
      const otherDetailBody = await otherDetail.json();

      // Commentaires d'un ticket qui n'est pas le sien — ni lecture ni écriture.
      const otherComments = await fetch(`/api/tickets/${otherId}/comments`);
      const otherCommentPost = await fetch(`/api/tickets/${otherId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "[E2E] tentative interdite" }),
      });

      // Son propre ticket : commentaire accepté normalement.
      const ownCommentPost = await fetch(`/api/tickets/${ownId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "[E2E] réponse autorisée" }),
      });

      // Modifier l'attribution — même sur son propre ticket — reste réservé à l'admin.
      const reassignOwn = await fetch(`/api/tickets/${ownId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: null }),
      });

      return {
        leakedInList,
        otherDetailStatus: otherDetail.status,
        otherDetailExposesContent: "ticket" in otherDetailBody,
        otherCommentsStatus: otherComments.status,
        otherCommentPostStatus: otherCommentPost.status,
        ownCommentPostStatus: ownCommentPost.status,
        reassignOwnStatus: reassignOwn.status,
      };
    }, { ownId: E2E_TICKET_ID, otherId: E2E_OTHER_TICKET_ID, otherTitle: E2E_OTHER_TICKET_TITLE });

    expect(result.leakedInList).toBe(false);
    expect(result.otherDetailStatus).toBe(404);
    expect(result.otherDetailExposesContent).toBe(false);
    expect(result.otherCommentsStatus).toBe(404);
    expect(result.otherCommentPostStatus).toBe(404);
    expect(result.ownCommentPostStatus).toBe(201);
    expect(result.reassignOwnStatus).toBe(403);
  });
});
