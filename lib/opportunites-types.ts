/**
 * Types partagés entre serveur et client pour le module Opportunités.
 */

export type OpportunityStatus = "demande" | "contacte" | "devis" | "gagne" | "perdu";

export type Client = {
  id: string;
  nom: string;
  secteur: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
};

export type Commercial = {
  id: string;
  nom: string;
  email: string | null;
  collaborateur_id: string | null;
  actif: boolean;
};

export type Opportunite = {
  id: string;
  titre: string;
  description: string | null;
  client_id: string;
  commercial_id: string;
  demandeur_id: string;
  montant_estime: number | null;
  statut: OpportunityStatus;
  resultat_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Champs joints (depuis le SELECT enrichi)
  client?: { id: string; nom: string; contact_nom: string | null; contact_email: string | null; contact_phone: string | null };
  commercial?: { id: string; nom: string; email: string | null };
  demandeur?: { id: string; nom: string; email: string };
};

export const STATUT_LABELS: Record<OpportunityStatus, string> = {
  demande:  "Demande client",
  contacte: "Client contacté",
  devis:    "Devis fait",
  gagne:    "Gagné",
  perdu:    "Perdu",
};

export const STATUT_COLORS: Record<OpportunityStatus, { bg: string; color: string }> = {
  demande:  { bg: "#F3E8FF",       color: "#7C3AED" },
  contacte: { bg: "#E1F5FE",       color: "#0277BD" },
  devis:    { bg: "#FFF3E0",       color: "#E65100" },
  gagne:    { bg: "#E8F5E9",       color: "#1B5E20" },
  perdu:    { bg: "#FFEBEE",       color: "#C62828" },
};
