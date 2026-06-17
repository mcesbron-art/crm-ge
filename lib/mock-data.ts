/**
 * Données de démonstration — utilisées tant que la base Supabase n'est pas branchée.
 * Source : maquettes JSX dans prototypes/
 *
 * Pour passer en production : remplacer ces exports par des fetch Supabase
 * (les types resteront identiques).
 */

export type Collaborateur = {
  id: number;
  nom: string;
  pole: string;
  avatar: string;
  color: string;
  email?: string;
  base?: number;
};

export const COLLABORATEURS: Collaborateur[] = [
  { id: 1, nom: "Noémie",    pole: "Graphisme / Photo / Vidéo",  avatar: "N",  color: "#8E24AA", email: "noemie@groupe-echo.fr",    base: 35 },
  { id: 2, nom: "Amandine",  pole: "Web / SEO / Contenu",         avatar: "A",  color: "#1E88E5", email: "amandine@groupe-echo.fr",  base: 35 },
  { id: 3, nom: "Jérémy",    pole: "Social Media / Vidéo",        avatar: "J",  color: "#43A047", email: "jeremy@groupe-echo.fr",    base: 35 },
  { id: 4, nom: "Marcellin", pole: "SEO / SEA / Sites standards", avatar: "M",  color: "#FB8C00", email: "marcellin@groupe-echo.fr", base: 35 },
  { id: 5, nom: "Arthur",    pole: "Sites complexes / Ads",       avatar: "Ar", color: "#E53935", email: "arthur@groupe-echo.fr",    base: 39 },
  { id: 6, nom: "Fanny",     pole: "Planning / Production",       avatar: "F",  color: "#00897B", email: "fanny@groupe-echo.fr",     base: 35 },
];

export type TacheStatut =
  | "Brief"
  | "À faire"
  | "En cours"
  | "Attente élément"
  | "En attente validation client"
  | "BAT envoyé"
  | "BAT OK"
  | "BAT à modifier"
  | "Terminé";

export type Tache = {
  id: number;
  nom: string;
  statut: TacheStatut;
  collab: number | null;
  tempsAlloue: number;
  tempsConsomme: number;
  montant: number;
  cout: number;
};

export type ProjetStatut =
  | "À affecter"
  | "En production"
  | "BAT en cours"
  | "Facturé"
  | "Clôturé";

export type Projet = {
  id: number;
  nom: string;
  client: string;
  type: "Standard" | "Abonnement";
  montantHT: number;
  coutRevient: number;
  statut: ProjetStatut;
  taches: Tache[];
};

export const PROJETS: Projet[] = [
  {
    id: 1, nom: "Maison Relais Gourmet", client: "MRG", type: "Standard",
    montantHT: 8500, coutRevient: 2800, statut: "En production",
    taches: [
      { id: 1, nom: "Maquettes site e-commerce",   statut: "En cours", collab: 1, tempsAlloue: 24.1, tempsConsomme: 18.5, montant: 3800, cout: 1800 },
      { id: 2, nom: "Intégration WooCommerce",     statut: "À faire",  collab: 5, tempsAlloue: 20.5, tempsConsomme: 0,    montant: 2700, cout: 1000 },
      { id: 3, nom: "Rédaction fiches produits",   statut: "Brief",    collab: 2, tempsAlloue: 24.1, tempsConsomme: 0,    montant: 2000, cout: 0 },
    ],
  },
  {
    id: 2, nom: "Netzy — Refonte site", client: "Netzy", type: "Standard",
    montantHT: 6200, coutRevient: 1900, statut: "BAT en cours",
    taches: [
      { id: 4, nom: "Maquettes UI/UX",          statut: "BAT envoyé",       collab: 1, tempsAlloue: 19.3, tempsConsomme: 17, montant: 2500, cout: 900 },
      { id: 5, nom: "Développement WordPress",  statut: "Attente élément",  collab: 4, tempsAlloue: 21.7, tempsConsomme: 8,  montant: 2800, cout: 1000 },
      { id: 6, nom: "SEO on-page",              statut: "Brief",            collab: 2, tempsAlloue: 10.8, tempsConsomme: 0,  montant: 900,  cout: 0 },
    ],
  },
  {
    id: 3, nom: "Vins d'Anjou-Saumur", client: "InterLoire", type: "Abonnement",
    montantHT: 3200, coutRevient: 800, statut: "En production",
    taches: [
      { id: 7, nom: "Posts réseaux sociaux Mars", statut: "En cours",                    collab: 3, tempsAlloue: 14.5, tempsConsomme: 11, montant: 1600, cout: 400 },
      { id: 8, nom: "Shooting photo printemps",   statut: "En attente validation client", collab: 1, tempsAlloue: 14.5, tempsConsomme: 12, montant: 1600, cout: 400 },
    ],
  },
  {
    id: 4, nom: "BÉRYL Patrimoine — Branding", client: "BÉRYL", type: "Standard",
    montantHT: 12000, coutRevient: 3500, statut: "En production",
    taches: [
      { id: 9,  nom: "Identité visuelle", statut: "BAT OK",   collab: 1, tempsAlloue: 36.1, tempsConsomme: 30, montant: 5000, cout: 2000 },
      { id: 10, nom: "Charte graphique",  statut: "En cours", collab: 1, tempsAlloue: 30.1, tempsConsomme: 22, montant: 4500, cout: 1000 },
      { id: 11, nom: "Supports print",    statut: "À faire",  collab: 1, tempsAlloue: 18.1, tempsConsomme: 0,  montant: 2500, cout: 500 },
    ],
  },
  {
    id: 5, nom: "Roul'Anjou — Naming", client: "B. Aulié", type: "Standard",
    montantHT: 4800, coutRevient: 1200, statut: "À affecter",
    taches: [
      { id: 12, nom: "Recherche naming", statut: "Brief", collab: null, tempsAlloue: 21.7, tempsConsomme: 0, montant: 2400, cout: 600 },
      { id: 13, nom: "Création logo",    statut: "Brief", collab: null, tempsAlloue: 21.7, tempsConsomme: 0, montant: 2400, cout: 600 },
    ],
  },
];

// Couleurs palette (rappel pour usage in-style)
export const COLORS = {
  noir: "#1A1A1A",
  noirDeep: "#111111",
  // Teal palette (primary)
  sidebar: "#0D6B5F",
  teal: "#0D6B5F",
  tealAccent: "#16A89C",
  tealLight: "#A8D5D0",
  // Legacy
  dore: "#C5A55A",
  doreLight: "#D4BA78",
  dorePale: "#F5EDD6",
  blanc: "#FFFFFF",
  gris: "#F5F6F7",
  grisLight: "#FAFAF9",
  grisMoyen: "#999999",
  grisBorder: "#E0E3E6",
  vert: "#4CAF50",
  vertBg: "#E8F5E9",
  orange: "#FF9800",
  orangeBg: "#FFF3E0",
  rouge: "#E53935",
  rougeBg: "#FFEBEE",
  bleu: "#2196F3",
};

export function getRentabiliteColor(ratio: number) {
  if (ratio < 75)  return { color: COLORS.vert,   bg: COLORS.vertBg,   label: "Rentable" };
  if (ratio <= 100) return { color: COLORS.orange, bg: COLORS.orangeBg, label: "Limite" };
  return { color: COLORS.rouge, bg: COLORS.rougeBg, label: "Déficitaire" };
}

export const TACHE_STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  "Brief":                       { bg: "#F3E8FF", text: "#7C3AED" },
  "À faire":                     { bg: "#E8EAF6", text: "#3949AB" },
  "En cours":                    { bg: "#E8F5E9", text: "#2E7D32" },
  "Attente élément":             { bg: "#FFF3E0", text: "#E65100" },
  "En attente validation client":{ bg: "#FFF8E1", text: "#F57F17" },
  "BAT envoyé":                  { bg: "#E1F5FE", text: "#0277BD" },
  "BAT OK":                      { bg: "#E8F5E9", text: "#1B5E20" },
  "BAT à modifier":              { bg: "#FFEBEE", text: "#C62828" },
  "Terminé":                     { bg: "#ECEFF1", text: "#37474F" },
};

export const PROJET_STATUT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "À affecter":    { bg: "#F3E8FF",       text: "#7C3AED", dot: "#7C3AED" },
  "En production": { bg: COLORS.vertBg,   text: "#2E7D32", dot: COLORS.vert },
  "BAT en cours":  { bg: COLORS.orangeBg, text: "#E65100", dot: COLORS.orange },
  "Facturé":       { bg: "#E3F2FD",       text: "#1565C0", dot: COLORS.bleu },
  "Clôturé":       { bg: "#ECEFF1",       text: "#546E7A", dot: "#78909C" },
};
