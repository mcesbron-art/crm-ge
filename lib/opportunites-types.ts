/**
 * Types partagés entre serveur et client pour le module Opportunités.
 */

export type OpportunityStatus = "demande" | "contacte" | "devis" | "negociation" | "gagne" | "perdu";

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
  demande:     "Découverte",
  contacte:    "Qualification",
  devis:       "Proposition",
  negociation: "Négociation",
  gagne:       "Gagné",
  perdu:       "Perdu",
};

export const STATUT_COLORS: Record<OpportunityStatus, { bg: string; color: string; dot: string }> = {
  demande:     { bg: "#EDE9FB", color: "#7C3AED", dot: "#7C3AED" },
  contacte:    { bg: "#E6EEFB", color: "#2563EB", dot: "#2563EB" },
  devis:       { bg: "rgba(201,162,78,.14)", color: "#B0892B", dot: "#C9A24E" },
  negociation: { bg: "#FBEAE0", color: "#C2530B", dot: "#C2530B" },
  gagne:       { bg: "#E7F3EB", color: "#1F8A5B", dot: "#1F8A5B" },
  perdu:       { bg: "#FFEBEE", color: "#C62828", dot: "#C62828" },
};
