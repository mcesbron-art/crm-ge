import { test, expect, type Page } from "@playwright/test";
import { E2E_COLLAB_EMAIL, E2E_PASSWORD, E2E_BAT_TASK_LABEL } from "./global-setup";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  // Voir billing-workflow.spec.ts pour le détail de cette précaution
  // (soumission native du <form> si le clic arrive avant l'hydratation).
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("prenom@groupe-echo.fr").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Parcours BAT (bon à tirer) : le collaborateur envoie une v1, enregistre
 * un refus (retour en "À faire", motif obligatoire) — puis envoie une v2,
 * enregistre une validation avec prochaine étape "Attente de diffusion".
 * L'historique conserve les deux révisions séparément.
 *
 * "Enregistrer l'envoi du BAT" ne vit que dans le panneau de détail
 * (TaskTimeModal) — il faut rouvrir la tâche à chaque envoi. "Enregistrer
 * le retour client" est en revanche une action rapide directement sur la
 * carte Kanban une fois une révision en attente.
 *
 * Données de test provisionnées par ./global-setup.ts (tâche BAT dédiée,
 * séparée de celle du scénario facturation), réinitialisées à chaque run.
 */
test("collaborateur envoie un BAT, refus puis renvoi et validation", async ({ page }) => {
  await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
  await page.goto("/mes-taches");

  // 1. Envoi de la v1.
  await page.getByText(E2E_BAT_TASK_LABEL, { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer l'envoi du BAT" }).click();
  const sendModal1 = page.getByRole("dialog", { name: "Enregistrer l'envoi du BAT" });
  await sendModal1.getByRole("button", { name: "Enregistrer l'envoi" }).click();
  await expect(page.getByText("Envoi du BAT enregistré.")).toBeVisible();
  await page.keyboard.press("Escape"); // referme le panneau de détail sous-jacent
  await expect(page.getByText("En attente de retour", { exact: true })).toBeVisible();
  await expect(page.getByText("Version 1", { exact: false })).toBeVisible();

  // 2. Retour client : refus avec motif obligatoire (action rapide sur la carte).
  await page.getByText("Enregistrer le retour client", { exact: true }).click();
  const resultModal1 = page.getByRole("dialog", { name: "Enregistrer le retour client" });
  await expect(resultModal1.getByRole("button", { name: "Enregistrer" })).toBeDisabled(); // rien coché
  await resultModal1.getByText("BAT refusé ❌", { exact: true }).click();
  await expect(resultModal1.getByRole("button", { name: "Enregistrer" })).toBeDisabled(); // motif pas encore rempli
  await resultModal1.getByPlaceholder(/agrandir le logo/i).fill("Corriger le numéro de téléphone et agrandir le logo.");
  await expect(resultModal1.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  await resultModal1.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("BAT refusé — tâche renvoyée en À faire.")).toBeVisible();

  // 3. Renvoi (v2) — on rouvre la tâche, "Enregistrer l'envoi du BAT" est
  // de retour car aucune révision n'est plus en attente (v1 est résolue).
  await page.getByText(E2E_BAT_TASK_LABEL, { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer l'envoi du BAT" }).click();
  const sendModal2 = page.getByRole("dialog", { name: "Enregistrer l'envoi du BAT" });
  await sendModal2.getByRole("button", { name: "Enregistrer l'envoi" }).click();
  await expect(page.getByText("Envoi du BAT enregistré.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Version 2", { exact: false })).toBeVisible();

  // 4. Retour client v2 : validé, prochaine étape "Attente de diffusion".
  await page.getByText("Enregistrer le retour client", { exact: true }).click();
  const resultModal2 = page.getByRole("dialog", { name: "Enregistrer le retour client" });
  await resultModal2.getByText("BAT validé ✅", { exact: true }).click();
  await resultModal2.getByText("Attente de diffusion", { exact: true }).click();
  await resultModal2.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("BAT validé — tâche envoyée en Attente de diffusion.")).toBeVisible();

  // 5. La tâche a bien été déplacée (statut sélectionné dans le panneau de
  // détail — plus robuste qu'un repérage de colonne par position dans le
  // DOM du Kanban) et l'historique montre la dernière révision (v2).
  await page.getByText(E2E_BAT_TASK_LABEL, { exact: true }).click();
  await expect(page.locator("#task-time-stage")).toHaveValue("attente_diffusion");
  const timeModal = page.getByRole("dialog", { name: E2E_BAT_TASK_LABEL });
  await expect(timeModal.getByText("Version 2", { exact: false })).toBeVisible();
});
