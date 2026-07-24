// Source de vérité pour les clients — complétée avec les 10 clients de base

export interface Client {
  id: string;
  name: string;
  avatar: string;       // initiales affichées
  avatarColor: string;
  sector: string;
  siret: string;
  email: string;
  phone: string;
  city: string;
  joinDate: string;
  status: "Actif" | "Prospect" | "Inactif";
  description: string;
  website?: string;
  // Champs dénormalisés utiles pour la liste
  contactName?: string; // nom du contact référent
  caDisplay?: string;   // CA affiché dans la liste
  caTotal?: number;     // CA numérique pour les calculs
  projectsCount?: number;
}

export interface ClientMetrics {
  totalRevenue: string;
  pendingRevenue: string;
  avgMargin: string;
  projectCount: number;
  deliveredCount: number;
}

export interface ClientProject {
  id: string;
  name: string;
  status: "En production" | "Livré" | "En attente";
  amount: string;
  date: string;
}

export interface ClientContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  color: string;
}

// ─── Clients ───────────────────────────────────────────────────────────────

export const BASE_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Maison Relais Gourmet",
    avatar: "MR", avatarColor: "#B08D32",
    sector: "Restauration & traiteur événementiel",
    siret: "SIRET 812 456 789 00021",
    email: "contact@relais-gourmet.fr",
    phone: "02 41 88 25 00",
    city: "Angers, Maine-et-Loire",
    joinDate: "sept. 2023",
    status: "Actif",
    description: "Restaurant et traiteur spécialisé dans l'événementiel haut de gamme.",
    website: "relais-gourmet.fr",
    contactName: "Claire Lemaire",
    caDisplay: "47,2 k€", caTotal: 47200, projectsCount: 9,
  },
  {
    id: "2",
    name: "Netzy",
    avatar: "N", avatarColor: "#7C3AED",
    sector: "Tech / SaaS",
    siret: "SIRET 123 456 789 00045",
    email: "contact@netzy.fr",
    phone: "02 41 25 15 00",
    city: "Rennes, Ille-et-Vilaine",
    joinDate: "janv. 2024",
    status: "Actif",
    description: "Startup spécialisée dans les solutions cloud de gestion de données.",
    website: "netzy.fr",
    contactName: "Hugo Mercier",
    caDisplay: "38,4 k€", caTotal: 38400, projectsCount: 6,
  },
  {
    id: "3",
    name: "Vins d'Anjou-Saumur",
    avatar: "VA", avatarColor: "#DC2626",
    sector: "Viticulture",
    siret: "SIRET 987 654 321 00123",
    email: "contact@vins-anjou.fr",
    phone: "02 41 52 30 00",
    city: "Saumur, Maine-et-Loire",
    joinDate: "avr. 2023",
    status: "Actif",
    description: "Domaine viticole produisant des vins AOC de renommée internationale.",
    website: "vins-anjou.fr",
    contactName: "InterLoire",
    caDisplay: "29,8 k€", caTotal: 29800, projectsCount: 7,
  },
  {
    id: "4",
    name: "BÉRYL Patrimoine",
    avatar: "BP", avatarColor: "#059669",
    sector: "Conseil financier",
    siret: "SIRET 456 789 123 00089",
    email: "contact@beryl-patrimoine.fr",
    phone: "02 41 60 40 50",
    city: "Angers, Maine-et-Loire",
    joinDate: "mars 2024",
    status: "Actif",
    description: "Cabinet de conseil en gestion de patrimoine et investissements.",
    website: "beryl-patrimoine.fr",
    contactName: "Sophie Garnier",
    caDisplay: "54,0 k€", caTotal: 54000, projectsCount: 4,
  },
  {
    id: "5",
    name: "Studio Mira",
    avatar: "SM", avatarColor: "#EA580C",
    sector: "Audiovisuel & production vidéo",
    siret: "SIRET 321 654 987 00056",
    email: "contact@studiomira.fr",
    phone: "02 41 32 15 00",
    city: "Angers, Maine-et-Loire",
    joinDate: "juin 2023",
    status: "Actif",
    description: "Studio de production audiovisuelle spécialisé dans les films d'entreprise et clips.",
    website: "studiomira.fr",
    contactName: "Léa Fontaine",
    caDisplay: "21,6 k€", caTotal: 21600, projectsCount: 3,
  },
  {
    id: "6",
    name: "Boulangerie Théo",
    avatar: "BT", avatarColor: "#D97706",
    sector: "Artisanat boulanger",
    siret: "SIRET 654 321 852 00012",
    email: "theo@boulangerie-theo.fr",
    phone: "02 41 78 34 56",
    city: "Cholet, Maine-et-Loire",
    joinDate: "oct. 2024",
    status: "Actif",
    description: "Boulangerie artisanale primée, spécialiste des pains de tradition et viennoiseries.",
    website: "boulangerie-theo.fr",
    contactName: "Théo Rousseau",
    caDisplay: "8,9 k€", caTotal: 8900, projectsCount: 2,
  },
  {
    id: "7",
    name: "Cabinet Vasseur",
    avatar: "CV", avatarColor: "#4F46E5",
    sector: "Cabinet d'avocats",
    siret: "SIRET 789 456 123 00078",
    email: "contact@cabinet-vasseur.fr",
    phone: "02 41 47 89 12",
    city: "Nantes, Loire-Atlantique",
    joinDate: "févr. 2025",
    status: "Prospect",
    description: "Cabinet d'avocats spécialisé en droit des affaires et propriété intellectuelle.",
    website: "cabinet-vasseur.fr",
    contactName: "Me. Vasseur",
    caDisplay: "12,3 k€", caTotal: 12300, projectsCount: 2,
  },
  {
    id: "8",
    name: "GreenLoop",
    avatar: "GL", avatarColor: "#16A34A",
    sector: "Énergie / Cleantech",
    siret: "N/C",
    email: "contact@greenloop.io",
    phone: "02 51 45 67 89",
    city: "Saint-Nazaire, Loire-Atlantique",
    joinDate: "mai 2025",
    status: "Prospect",
    description: "Startup CleanTech développant des solutions de recyclage et d'économie circulaire.",
    website: "greenloop.io",
    contactName: "Amélie Faure",
    caDisplay: "0 €", caTotal: 0, projectsCount: 0,
  },
  {
    id: "9",
    name: "Atelier Lumière",
    avatar: "AL", avatarColor: "#0891B2",
    sector: "Design d'intérieur & décoration",
    siret: "SIRET 258 741 963 00034",
    email: "contact@atelier-lumiere.fr",
    phone: "02 41 22 56 78",
    city: "Le Mans, Sarthe",
    joinDate: "juil. 2023",
    status: "Actif",
    description: "Studio de design d'intérieur haut de gamme pour particuliers et professionnels.",
    website: "atelier-lumiere.fr",
    contactName: "Karim Benali",
    caDisplay: "15,7 k€", caTotal: 15700, projectsCount: 3,
  },
  {
    id: "10",
    name: "Domaine des Hauts",
    avatar: "DH", avatarColor: "#6B7280",
    sector: "Hôtellerie & hébergement",
    siret: "SIRET 147 258 369 00091",
    email: "contact@domaine-des-hauts.fr",
    phone: "02 41 91 23 45",
    city: "Saumur, Maine-et-Loire",
    joinDate: "mars 2022",
    status: "Inactif",
    description: "Domaine hôtelier 4 étoiles alliant charme historique et confort contemporain.",
    website: "domaine-des-hauts.fr",
    contactName: "P. Chevalier",
    caDisplay: "33,1 k€", caTotal: 33100, projectsCount: 5,
  },
];

// ─── Métriques ──────────────────────────────────────────────────────────────

const metricsDatabase: Record<string, ClientMetrics> = {
  "1": { totalRevenue: "47,2 k€", pendingRevenue: "8,5 k€",  avgMargin: "67 %", projectCount: 9, deliveredCount: 8 },
  "2": { totalRevenue: "38,4 k€", pendingRevenue: "12,3 k€", avgMargin: "71 %", projectCount: 6, deliveredCount: 5 },
  "3": { totalRevenue: "29,8 k€", pendingRevenue: "5,2 k€",  avgMargin: "58 %", projectCount: 7, deliveredCount: 7 },
  "4": { totalRevenue: "54,0 k€", pendingRevenue: "9,8 k€",  avgMargin: "64 %", projectCount: 4, deliveredCount: 3 },
  "5": { totalRevenue: "21,6 k€", pendingRevenue: "3,8 k€",  avgMargin: "62 %", projectCount: 3, deliveredCount: 3 },
  "6": { totalRevenue: "8,9 k€",  pendingRevenue: "2,1 k€",  avgMargin: "55 %", projectCount: 2, deliveredCount: 2 },
  "7": { totalRevenue: "12,3 k€", pendingRevenue: "8,5 k€",  avgMargin: "0 %",  projectCount: 2, deliveredCount: 0 },
  "8": { totalRevenue: "0 €",     pendingRevenue: "0 €",      avgMargin: "0 %",  projectCount: 0, deliveredCount: 0 },
  "9": { totalRevenue: "15,7 k€", pendingRevenue: "4,2 k€",  avgMargin: "60 %", projectCount: 3, deliveredCount: 3 },
  "10":{ totalRevenue: "33,1 k€", pendingRevenue: "0 €",      avgMargin: "58 %", projectCount: 5, deliveredCount: 5 },
};

// ─── Projets ────────────────────────────────────────────────────────────────

const projectsDatabase: Record<string, ClientProject[]> = {
  "1": [
    { id: "1-1", name: "Maquettes site e-commerce",    status: "En production", amount: "8 500 €",  date: "Mars 2026" },
    { id: "1-2", name: "Campagne emailing printemps",   status: "Livré",         amount: "3 200 €",  date: "Févr. 2026" },
    { id: "1-3", name: "Refonte identité de marque",    status: "Livré",         amount: "12 000 €", date: "Nov. 2025" },
    { id: "1-4", name: "Shooting produits",             status: "Livré",         amount: "4 100 €",  date: "Sept. 2025" },
    { id: "1-5", name: "Brochure traiteur 2025",        status: "Livré",         amount: "2 800 €",  date: "Juin 2025" },
  ],
  "2": [
    { id: "2-1", name: "App mobile iOS/Android",        status: "En production", amount: "15 000 €", date: "Avr. 2026" },
    { id: "2-2", name: "Dashboard analytics",           status: "Livré",         amount: "8 500 €",  date: "Janv. 2026" },
    { id: "2-3", name: "Site vitrine refonte",          status: "Livré",         amount: "6 200 €",  date: "Oct. 2025" },
  ],
  "3": [
    { id: "3-1", name: "Rebranding domaine",            status: "Livré",         amount: "6 200 €",  date: "Déc. 2025" },
    { id: "3-2", name: "Site vitrine bilingue",         status: "Livré",         amount: "4 800 €",  date: "Août 2025" },
    { id: "3-3", name: "Catalogue vins 2025",           status: "Livré",         amount: "3 100 €",  date: "Mars 2025" },
  ],
  "4": [
    { id: "4-1", name: "Plateforme d'investissement",   status: "En production", amount: "22 000 €", date: "Mai 2026" },
    { id: "4-2", name: "Rapport annuel design",         status: "Livré",         amount: "5 600 €",  date: "Mars 2026" },
    { id: "4-3", name: "Newsletter mensuelle",          status: "Livré",         amount: "1 800 €",  date: "Janv. 2026" },
  ],
  "5": [
    { id: "5-1", name: "Film institutionnel 3 min",     status: "Livré",         amount: "9 500 €",  date: "Févr. 2026" },
    { id: "5-2", name: "Capsules réseaux sociaux",      status: "Livré",         amount: "4 200 €",  date: "Nov. 2025" },
    { id: "5-3", name: "Motion design logo",            status: "Livré",         amount: "2 800 €",  date: "Juil. 2025" },
  ],
  "6": [
    { id: "6-1", name: "Identité visuelle complète",    status: "Livré",         amount: "4 500 €",  date: "Mars 2025" },
    { id: "6-2", name: "Packaging gamme produits",      status: "Livré",         amount: "3 200 €",  date: "Janv. 2025" },
  ],
  "7": [
    { id: "7-1", name: "Site web cabinet",              status: "En production", amount: "6 500 €",  date: "Avr. 2026" },
    { id: "7-2", name: "Charte graphique",              status: "En production", amount: "4 800 €",  date: "Mars 2026" },
  ],
  "8": [],
  "9": [
    { id: "9-1", name: "Book projets réalisés",         status: "Livré",         amount: "5 200 €",  date: "Déc. 2025" },
    { id: "9-2", name: "Site portfolio",                status: "Livré",         amount: "6 800 €",  date: "Sept. 2025" },
    { id: "9-3", name: "Carte de visite & papeterie",   status: "Livré",         amount: "1 900 €",  date: "Juil. 2025" },
  ],
  "10": [
    { id: "10-1", name: "Refonte site web",             status: "Livré",         amount: "8 200 €",  date: "Oct. 2023" },
    { id: "10-2", name: "Brochure hébergements",        status: "Livré",         amount: "3 500 €",  date: "Juil. 2023" },
    { id: "10-3", name: "Guide séjour clients",         status: "Livré",         amount: "2 100 €",  date: "Avr. 2023" },
    { id: "10-4", name: "Campagne print été 2023",      status: "Livré",         amount: "4 800 €",  date: "Mars 2023" },
    { id: "10-5", name: "Logo & charte initiale",       status: "Livré",         amount: "5 500 €",  date: "Janv. 2023" },
  ],
};

// ─── Contacts référents ──────────────────────────────────────────────────────

const contactsDatabase: Record<string, ClientContact> = {
  "1":  { name: "Claire Lemaire",     role: "Directrice marketing",    email: "c.lemaire@relais-gourmet.fr",    phone: "06 12 45 78 90", avatar: "CL",  color: "#7C3AED" },
  "2":  { name: "Hugo Mercier",       role: "CEO & Co-fondateur",      email: "hugo@netzy.fr",                  phone: "06 87 34 52 19", avatar: "HM",  color: "#2563EB" },
  "3":  { name: "Sophie Bernard",     role: "Responsable marketing",   email: "sophie@vins-anjou.fr",           phone: "06 78 92 45 31", avatar: "SB",  color: "#DC2626" },
  "4":  { name: "Sophie Garnier",     role: "Directrice générale",     email: "s.garnier@beryl-patrimoine.fr",  phone: "06 45 78 23 56", avatar: "SG",  color: "#059669" },
  "5":  { name: "Léa Fontaine",       role: "Directrice créative",     email: "lea@studiomira.fr",              phone: "06 23 56 89 12", avatar: "LF",  color: "#EA580C" },
  "6":  { name: "Théo Rousseau",      role: "Gérant",                  email: "theo@boulangerie-theo.fr",       phone: "06 34 67 89 01", avatar: "TR",  color: "#D97706" },
  "7":  { name: "Maître Vasseur",     role: "Associé gérant",          email: "contact@cabinet-vasseur.fr",     phone: "06 56 78 90 23", avatar: "MV",  color: "#4F46E5" },
  "8":  { name: "Amélie Faure",       role: "CEO & Fondatrice",        email: "amelie@greenloop.io",            phone: "06 67 89 01 34", avatar: "AF",  color: "#16A34A" },
  "9":  { name: "Karim Benali",       role: "Directeur artistique",    email: "karim@atelier-lumiere.fr",       phone: "06 78 01 23 45", avatar: "KB",  color: "#0891B2" },
  "10": { name: "Pierre Chevalier",   role: "Directeur général",       email: "p.chevalier@domaine-des-hauts.fr",phone: "06 89 12 34 56",avatar: "PC",  color: "#6B7280" },
};

// ─── Fonctions d'accès ───────────────────────────────────────────────────────

const baseClientMap = Object.fromEntries(BASE_CLIENTS.map(c => [c.id, c]));

export function getClient(id: string): Client | null {
  return baseClientMap[id] || null;
}

export function getAllClients(): Client[] {
  return BASE_CLIENTS;
}

export function getClientMetrics(id: string): ClientMetrics | null {
  return metricsDatabase[id] || null;
}

export function getClientProjects(id: string): ClientProject[] {
  return projectsDatabase[id] || [];
}

export function getClientContact(id: string): ClientContact | null {
  return contactsDatabase[id] || null;
}
