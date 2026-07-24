// Types d'absence — vocabulaire fixé par le mockup fourni par l'utilisateur
// (Absences Groupe Écho). supabase/migrations/028_absences.sql.
export const ABSENCE_TYPES = [
  { value: "conges_payes",          label: "Congés payés" },
  { value: "rtt",                   label: "RTT" },
  { value: "conges_sans_solde",     label: "Congés sans solde" },
  { value: "arret_maladie",         label: "Arrêt maladie" },
  { value: "absence_injustifiee",   label: "Absence injustifiée" },
  { value: "recuperation",          label: "Récupération" },
  { value: "absence_exceptionnelle", label: "Absence exceptionnelle" },
  { value: "formation",             label: "Formation" },
  { value: "accident_travail",      label: "Accident de travail" },
  { value: "conge_maternite",       label: "Congé maternité" },
  { value: "conge_paternite",       label: "Congé paternité" },
  { value: "chomage_partiel",       label: "Chômage partiel" },
  { value: "enfant_malade",         label: "Enfant malade" },
] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number]["value"];
export const ABSENCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(ABSENCE_TYPES.map(t => [t.value, t.label]));

// Statut commun aux absences et aux heures supplémentaires — même workflow
// de validation (direction/admin, permission manage_absences).
export const REQUEST_STATUSES = [
  { value: "attente",  label: "En attente" },
  { value: "validee",  label: "Validée" },
  { value: "refusee",  label: "Refusée" },
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number]["value"];
export const REQUEST_STATUS_LABEL: Record<string, string> = Object.fromEntries(REQUEST_STATUSES.map(s => [s.value, s.label]));
export const REQUEST_STATUS_COLOR: Record<string, { color: string; bg: string; dot: string }> = {
  attente: { color: "#B0892B", bg: "rgba(201,162,78,.14)", dot: "#C9A24E" },
  validee: { color: "#1F8A5B", bg: "#E7F3EB", dot: "#3FBF77" },
  refusee: { color: "#8C8B83", bg: "#F0EFEA", dot: "#A6A498" },
};
