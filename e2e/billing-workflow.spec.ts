import { test, expect, type Page } from "@playwright/test";
import { E2E_COLLAB_EMAIL, E2E_ADMIN_EMAIL, E2E_PASSWORD, E2E_TASK_LABEL } from "./global-setup";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  // Sans cette attente, un clic trop rapide sur "Se connecter" peut arriver
  // avant l'hydratation React : le <form> retombe alors sur une soumission
  // GET native du navigateur (les <input> n'ont pas d'attribut name, d'où
  // une redirection vers "/login?" vide plutôt que l'appel fetch attendu).
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("prenom@groupe-echo.fr").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  // Le login est un fetch + router.push/router.refresh côté client (pas une
  // navigation "load" classique) — waitForURL({waitUntil:"load"}) par défaut
  // n'est pas fiable ici. expect(page).toHaveURL réessaie en interne.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Parcours simplifié du workflow de facturation : la facture elle-même se
 * fait dans Axonaut — le CRM ne fait que suivre un statut d'avancement et
 * un commentaire comptable optionnel.
 *
 * Collaborateur envoie une tâche en facturation (type seul) → admin ouvre
 * la demande, fait avancer le statut (pastille cliquable, enregistrement
 * immédiat) et ajoute un commentaire (son propre bouton d'enregistrement)
 * → collaborateur voit la mise à jour → admin efface le commentaire
 * (disparaît côté collaborateur) et fait avancer le statut une seconde fois.
 *
 * Données de test provisionnées par ./global-setup.ts (comptes + tâche
 * assignée), réinitialisées à chaque run.
 */
test("collaborateur envoie en facturation, admin suit le statut, collaborateur voit l'avancement", async ({ browser }) => {
  const collabContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const collab = await collabContext.newPage();
  const admin = await adminContext.newPage();

  // 1. Collaborateur : envoi en facturation (type "acompte").
  await login(collab, E2E_COLLAB_EMAIL, E2E_PASSWORD);
  await collab.goto("/mes-taches");
  await collab.getByText(E2E_TASK_LABEL, { exact: true }).click();
  await collab.getByRole("button", { name: "Envoyer en facturation" }).click();
  const billingModal = collab.getByRole("dialog", { name: "Envoyer en facturation" });
  await billingModal.getByRole("radio", { name: /facture d'acompte/i }).click();
  await billingModal.getByRole("button", { name: "Envoyer en facturation" }).click();
  await expect(collab.getByText("Tâche envoyée en facturation.")).toBeVisible();
  await collab.keyboard.press("Escape");
  await expect(collab.getByText("À traiter")).toBeVisible();

  // 2. Admin : ouvre la demande, fait avancer le statut à "Facture intermédiaire"
  // (clic sur la pastille = enregistrement immédiat) puis ajoute un commentaire
  // comptable (son propre bouton, séparé du changement de statut).
  await login(admin, E2E_ADMIN_EMAIL, E2E_PASSWORD);
  await admin.goto("/facturation");
  await admin.getByText(E2E_TASK_LABEL, { exact: true }).click();
  const drawer = admin.getByRole("dialog", { name: "Détail de la demande de facturation" });
  await drawer.getByText("Facture intermédiaire", { exact: true }).click();
  await expect(drawer.getByTestId("billing-status-badge")).toHaveText("Facture intermédiaire");

  await drawer.getByPlaceholder(/précision utile sur la facturation/i).fill("La facture intermédiaire a été réalisée dans Axonaut.");
  await drawer.getByText("Enregistrer le commentaire", { exact: true }).click();
  await expect(drawer.getByText("Enregistrer le commentaire", { exact: true })).toHaveCount(0);
  await drawer.getByRole("button", { name: "Fermer" }).click();

  // 3. Collaborateur : voit le nouveau statut et le commentaire sur sa tâche.
  await collab.reload();
  await expect(collab.getByText("Facture intermédiaire", { exact: true })).toBeVisible();
  await expect(collab.getByText("La facture intermédiaire a été réalisée dans Axonaut.")).toBeVisible();

  // 4. Admin : efface le commentaire, passe le statut à "Facture totale".
  await admin.reload();
  await admin.getByText(E2E_TASK_LABEL, { exact: true }).click();
  const drawer2 = admin.getByRole("dialog", { name: "Détail de la demande de facturation" });
  await drawer2.getByPlaceholder(/précision utile sur la facturation/i).fill("");
  await drawer2.getByText("Enregistrer le commentaire", { exact: true }).click();
  await expect(drawer2.getByText("Enregistrer le commentaire", { exact: true })).toHaveCount(0);
  await drawer2.getByText("Facture totale", { exact: true }).click();
  await expect(drawer2.getByTestId("billing-status-badge")).toHaveText("Facture totale");
  await drawer2.getByRole("button", { name: "Fermer" }).click();

  // 5. Collaborateur : voit le statut final, le commentaire a disparu (vide).
  await collab.reload();
  await expect(collab.getByText("Facture totale", { exact: true })).toBeVisible();
  await expect(collab.getByText("La facture intermédiaire a été réalisée dans Axonaut.")).toHaveCount(0);

  await collabContext.close();
  await adminContext.close();
});
