import { test, expect, type Page } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL, E2E_COLLAB_EMAIL, E2E_PASSWORD,
  E2E_PROJECT_ID, E2E_TICKET_TITLE, E2E_OTHER_TICKET_TITLE, E2E_AXONAUT_COMPANY_ID,
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
 * Vérifie qu'il n'existe plus aucun mécanisme de bascule manuelle de vue
 * (ancien PreviewBar "Vue Admin"/"Vue Collaborateur", supprimé), et que le
 * rôle authentifié (table collaborateurs, jamais une valeur client) reste
 * l'unique source de vérité malgré toute tentative de contournement :
 * localStorage, sessionStorage, query params, appel direct d'API.
 */
test.describe("Séparation des rôles — sécurité", () => {
  test("Admin : aucun bouton de bascule de vue visible", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await expect(page.getByText("Vue Admin")).toHaveCount(0);
    await expect(page.getByText("Vue Collaborateur")).toHaveCount(0);
  });

  test("Collaborateur : tampering localStorage/sessionStorage sans effet", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    await page.evaluate(() => {
      localStorage.setItem("previewMode", "real");
      localStorage.setItem("role", "admin");
      sessionStorage.setItem("effectiveRole", "admin");
    });
    await page.goto("/administration");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Collaborateur : query param de rôle sans effet", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    for (const qs of ["?role=admin", "?viewAs=admin", "?as=admin", "?mode=admin"]) {
      await page.goto(`/administration${qs}`);
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test("Collaborateur : notify-facturation refusé même sur son propre projet assigné", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const status = await page.evaluate(async (projectId) => {
      const res = await fetch(`/api/projets/${projectId}/notify-facturation`, { method: "POST" });
      return res.status;
    }, E2E_PROJECT_ID);
    expect(status).toBe(403);
  });

  test("Collaborateur : GET /api/clients/[id]/tickets scopé par assignation", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async (companyId) => {
      const res = await fetch(`/api/clients/${companyId}/tickets`);
      const body = await res.text();
      return { status: res.status, body };
    }, E2E_AXONAUT_COMPANY_ID);
    const d = JSON.parse(result.body);
    expect(result.status, result.body).toBe(200);
    const titles = (d.tickets as { titre: string }[]).map(t => t.titre);
    expect(titles).toContain(E2E_TICKET_TITLE);
    expect(titles).not.toContain(E2E_OTHER_TICKET_TITLE);
  });

  test("Admin : GET /api/clients/[id]/tickets voit tous les tickets de la société", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async (companyId) => {
      const res = await fetch(`/api/clients/${companyId}/tickets`);
      const body = await res.text();
      return { status: res.status, body };
    }, E2E_AXONAUT_COMPANY_ID);
    const d = JSON.parse(result.body);
    expect(result.status, result.body).toBe(200);
    const titles = (d.tickets as { titre: string }[]).map(t => t.titre);
    expect(titles).toContain(E2E_TICKET_TITLE);
    expect(titles).toContain(E2E_OTHER_TICKET_TITLE);
  });

  test("Collaborateur : données Axonaut financières (factures/devis société) refusées", async ({ page }) => {
    await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
    const result = await page.evaluate(async () => {
      const [companies, invoices, quotations] = await Promise.all([
        fetch("/api/axonaut/companies"),
        fetch("/api/axonaut/companies/1/invoices"),
        fetch("/api/axonaut/companies/1/quotations"),
      ]);
      return { companies: companies.status, invoices: invoices.status, quotations: quotations.status };
    });
    expect(result.companies).toBe(403);
    expect(result.invoices).toBe(403);
    expect(result.quotations).toBe(403);
  });
});
