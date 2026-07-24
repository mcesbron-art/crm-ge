// Mêmes taxonomies que /tickets (priorité) et le kanban mock (type de tâche),
// réutilisées ici pour rester cohérent visuellement dans toute l'app.
export const TASK_PRIORITIES = ["Basse", "Normale", "Haute", "Urgente"] as const;
export const TASK_PRIORITY_COLOR: Record<string, string> = {
  Urgente: "#B91C1C", Haute: "#C2530B", Normale: "#2563EB", Basse: "#8C8B83",
};
export const TASK_TYPES = ["Design", "Développement", "Rédaction", "Photo / Vidéo", "Réunion", "Autre"] as const;

// Étape de workflow de production d'une tâche — vocabulaire figé pour
// matcher les 9 colonnes du Kanban de mes-taches (phase 2) et le dropdown
// "Changer le statut" du panneau de temps (phase 1).
// supabase/migrations/019_task_stage.sql.
export const TASK_STAGES = [
  { value: "brief",             label: "Brief / Nouveau" },
  { value: "a_faire",           label: "À faire" },
  { value: "abonnement",        label: "Abonnement / Récurrence" },
  { value: "attente_elements",  label: "Attente d'éléments" },
  { value: "bat_envoye",        label: "BAT envoyé" },
  { value: "etat_bat",          label: "État du BAT" },
  { value: "attente_diffusion", label: "Attente de diffusion" },
  { value: "facturation",       label: "Facturation" },
  { value: "retour_commerce",   label: "Retour commerce" },
] as const;
export type TaskStage = (typeof TASK_STAGES)[number]["value"];
export const TASK_STAGE_LABEL: Record<string, string> = Object.fromEntries(TASK_STAGES.map(s => [s.value, s.label]));

// Même esprit que TASK_PRIORITY_COLOR / statusInfo() de ProjetsClient.tsx —
// une couleur d'accent par étape, réutilisée pour l'en-tête de colonne, le
// badge de la vue Liste, et les cartes.
export const TASK_STAGE_COLOR: Record<string, string> = {
  brief:             "#A6A498",
  a_faire:           "#6E6A5E",
  abonnement:        "#7C3AED",
  attente_elements:  "#D08A4A",
  bat_envoye:        "#7C3AED",
  etat_bat:          "#C9A24E",
  attente_diffusion: "#2563EB",
  facturation:       "#C2410C",
  retour_commerce:   "#B91C1C",
};

// Motifs d'attente d'éléments — vocabulaire figé par la demande d'origine.
// supabase/migrations/024_task_waits.sql.
export const TASK_WAIT_REASONS = [
  { value: "textes",         label: "Textes" },
  { value: "photos",         label: "Photos" },
  { value: "documents",      label: "Documents" },
  { value: "informations",   label: "Informations" },
  { value: "acces",          label: "Accès" },
  { value: "validation",     label: "Validation" },
  { value: "reponse_client", label: "Réponse client" },
  { value: "retour_interne", label: "Retour interne" },
  { value: "autre",          label: "Autre" },
] as const;
export type TaskWaitReason = (typeof TASK_WAIT_REASONS)[number]["value"];
export const TASK_WAIT_REASON_LABEL: Record<string, string> = Object.fromEntries(TASK_WAIT_REASONS.map(r => [r.value, r.label]));

// Types de facturation — seul champ que le collaborateur renseigne à
// l'envoi vers la colonne "Facturation". supabase/migrations/025_task_billing_requests.sql.
export const TASK_BILLING_TYPES = [
  { value: "acompte",       label: "Facture d'acompte" },
  { value: "intermediaire", label: "Facture intermédiaire" },
  { value: "totale",        label: "Facture totale" },
] as const;
export type TaskBillingType = (typeof TASK_BILLING_TYPES)[number]["value"];
export const TASK_BILLING_TYPE_LABEL: Record<string, string> = Object.fromEntries(TASK_BILLING_TYPES.map(t => [t.value, t.label]));

// Statut d'avancement d'une demande de facturation — modifiable uniquement
// par direction/admin (permission manage_billing), jamais par le
// collaborateur à l'origine de la demande. Même vocabulaire que
// TASK_BILLING_TYPES (+ "à traiter") : la comptable fait la facture dans
// Axonaut, ce statut ne fait que refléter où elle en est — il peut diverger
// du type initialement demandé (TASK_BILLING_TYPES) si elle a finalement
// fait autre chose. supabase/migrations/026_simplify_billing_requests.sql.
export const TASK_BILLING_STATUSES = [
  { value: "a_facturer",   label: "À traiter" },
  { value: "acompte",      label: "Facture d'acompte" },
  { value: "intermediaire", label: "Facture intermédiaire" },
  { value: "totale",       label: "Facture totale" },
] as const;
export type TaskBillingStatus = (typeof TASK_BILLING_STATUSES)[number]["value"];
export const TASK_BILLING_STATUS_LABEL: Record<string, string> = Object.fromEntries(TASK_BILLING_STATUSES.map(s => [s.value, s.label]));
export const TASK_BILLING_STATUS_COLOR: Record<string, string> = {
  a_facturer:    "#C2410C",
  acompte:       "#C9A24E",
  intermediaire: "#2563EB",
  totale:        "#1F8A5B",
};

// Statut du cycle de vie d'une révision de BAT (bon à tirer) — une tâche
// peut accumuler plusieurs révisions dans le temps (v1 refusée, v2
// envoyée...), jamais écrasées. supabase/migrations/027_task_bat_revisions.sql.
export const TASK_BAT_STATUSES = [
  { value: "waiting_feedback", label: "En attente de retour" },
  { value: "validated",        label: "BAT validé" },
  { value: "rejected",         label: "BAT refusé" },
] as const;
export type TaskBatStatus = (typeof TASK_BAT_STATUSES)[number]["value"];
export const TASK_BAT_STATUS_LABEL: Record<string, string> = Object.fromEntries(TASK_BAT_STATUSES.map(s => [s.value, s.label]));
export const TASK_BAT_STATUS_COLOR: Record<string, string> = {
  waiting_feedback: "#C2410C",
  validated:        "#1F8A5B",
  rejected:         "#B91C1C",
};

// Étape suivante choisie par le collaborateur quand un BAT est validé.
export const TASK_BAT_NEXT_STAGES = [
  { value: "attente_diffusion", label: "Attente de diffusion" },
  { value: "facturation",       label: "Facturation" },
] as const;
export type TaskBatNextStage = (typeof TASK_BAT_NEXT_STAGES)[number]["value"];
export const TASK_BAT_NEXT_STAGE_LABEL: Record<string, string> = Object.fromEntries(TASK_BAT_NEXT_STAGES.map(s => [s.value, s.label]));
