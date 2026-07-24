import { test, expect, type Page } from "@playwright/test";
import { E2E_COLLAB_EMAIL, E2E_PASSWORD, E2E_TASK_LABEL, E2E_PROJECT_NAME } from "./global-setup";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  // cf. billing-workflow.spec.ts : attendre l'hydratation avant de soumettre.
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("prenom@groupe-echo.fr").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/** Clique Arrêter/Réinitialiser et attend la fin de l'appel réseau
 *  correspondant — le contexte évitent sinon une requête encore en vol
 *  qui laisserait le chrono actif en base au moment où le test suivant démarre
 *  (setActiveTimer(null) est optimiste côté client, cf. lib/timer-context.tsx). */
async function clickAndWaitApi(page: Page, locator: ReturnType<Page["getByRole"]>, urlPart: string) {
  await Promise.all([
    page.waitForResponse(r => r.url().includes(urlPart) && r.request().method() === "POST"),
    locator.click(),
  ]);
}

async function startTimerFromMesTaches(page: Page) {
  await page.goto("/mes-taches");
  // Scopé à <main> : si un run précédent a laissé le chrono actif, le
  // libellé de la tâche apparaît aussi dans la sidebar/mini-barre.
  await page.locator("main").getByText(E2E_TASK_LABEL, { exact: true }).click();
  const modal = page.getByRole("dialog", { name: E2E_TASK_LABEL });
  // La modale s'ouvre sur l'onglet "Ajouter manuellement" tant que cette
  // tâche ne possède pas déjà le chrono (cf. TaskTimeModal.tsx) — il faut
  // basculer sur "Chronomètre" avant de trouver le bouton Démarrer.
  await modal.getByText("Chronomètre", { exact: true }).click();

  // Défense en profondeur : si un run précédent a laissé un chrono en pause
  // sur cette tâche (accumulated_seconds > 0), la modale propose
  // "Reprendre"/"Réinitialiser" plutôt que "Démarrer" — on repart d'un état
  // propre avant de continuer.
  const reinitialiser = modal.getByRole("button", { name: "Réinitialiser" });
  if (await reinitialiser.isVisible().catch(() => false)) {
    await reinitialiser.click();
    await clickAndWaitApi(page, modal.getByRole("button", { name: "Oui" }), "/timer/reset");
  }

  await modal.getByRole("button", { name: /démarrer/i }).click();
  await page.keyboard.press("Escape");
}

/**
 * Le chrono actif de la sidebar (components/Sidebar.tsx) expose maintenant
 * pause/reprendre/arrêter (avant : seulement arrêter) — ce spec couvre le
 * nouveau parcours visuel sans toucher à la logique métier de
 * lib/timer-context.tsx, déjà exercée ailleurs (TaskTimeModal).
 *
 * Données de test : ./global-setup.ts (tâche E2E_TASK_LABEL assignée au
 * collaborateur, purgée de tout chrono résiduel à chaque run).
 */
test("chrono actif dans la sidebar : démarrer, pause, reprendre, voir la tâche, arrêter", async ({ page }) => {
  await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
  await startTimerFromMesTaches(page);

  // Le libellé de la tâche apparaît aussi dans la liste "Mes tâches" derrière
  // — on scope toutes les assertions au bloc chrono de la sidebar.
  const sidebar = page.locator(".app-sidebar");

  // Bloc chrono visible avec libellé, tâche et projet.
  await expect(sidebar.getByText("Chrono en cours")).toBeVisible();
  await expect(sidebar.getByText(E2E_TASK_LABEL, { exact: true })).toBeVisible();
  await expect(sidebar.getByText(E2E_PROJECT_NAME, { exact: true })).toBeVisible();

  // Pause : libellé + bouton Reprendre, le bouton Pause disparaît.
  await sidebar.getByRole("button", { name: "Mettre le chrono en pause" }).click();
  await expect(sidebar.getByText("Chrono en pause")).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Reprendre le chrono" })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Mettre le chrono en pause" })).toHaveCount(0);

  // Reprendre : retour à "en cours".
  await sidebar.getByRole("button", { name: "Reprendre le chrono" }).click();
  await expect(sidebar.getByText("Chrono en cours")).toBeVisible();

  // Voir la tâche : ramène sur Mes tâches (déjà la page courante ici, on
  // vérifie juste que l'action ne casse pas la navigation).
  await sidebar.getByRole("button", { name: "Voir la tâche" }).click();
  await expect(page).toHaveURL(/\/mes-taches/);

  // Sidebar réduite : le temps reste visible/compréhensible (accessible via
  // aria-label, pas seulement une pastille de couleur). Match par
  // sous-chaîne (pas de RegExp : E2E_TASK_LABEL contient des "[...]" littéraux
  // qui seraient interprétés comme une classe de caractères).
  await page.getByTitle("Réduire la sidebar").click();
  await expect(sidebar.getByRole("button", { name: `Chrono en cours : ${E2E_TASK_LABEL}`, exact: false })).toBeVisible();
  await page.getByTitle("Développer la sidebar").click();

  // Arrêter : le bloc disparaît. On attend la fin de l'appel réseau (pas
  // seulement la mise à jour optimiste) pour ne pas laisser un chrono actif
  // en base au démarrage du test suivant.
  await clickAndWaitApi(page, sidebar.getByRole("button", { name: "Arrêter le chrono" }), "/timer/stop");
  await expect(sidebar.getByText("Chrono en cours")).toHaveCount(0);
  await expect(sidebar.getByText("Chrono en pause")).toHaveCount(0);
});

test("chrono actif : reste visible en mini-barre mobile quand le tiroir est fermé", async ({ page }) => {
  await login(page, E2E_COLLAB_EMAIL, E2E_PASSWORD);
  await startTimerFromMesTaches(page);

  // Viewport mobile : le tiroir de la sidebar est fermé par défaut
  // (.app-sidebar hors écran sous 1024px) — le chrono doit rester visible
  // via la mini-barre fixe (components/MobileActiveTimerBar.tsx), scopée
  // pour ne pas matcher la liste "Mes tâches" derrière.
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBar = page.locator(".mobile-timer-bar");
  await expect(mobileBar.getByText(E2E_TASK_LABEL, { exact: true })).toBeVisible();
  await expect(mobileBar.getByRole("button", { name: "Mettre le chrono en pause" })).toBeVisible();

  // Nettoyage : on arrête le chrono pour ne pas polluer le run suivant.
  await clickAndWaitApi(page, mobileBar.getByRole("button", { name: "Arrêter le chrono" }), "/timer/stop");
});
