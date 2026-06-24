// Structure de données clients - À remplacer par une API réelle
export interface Client {
  id: string;
  name: string;
  sector: string;
  siret: string;
  email: string;
  phone: string;
  city: string;
  joinDate: string;
  status: "Actif" | "Prospect" | "Inactif";
  avatar: string;
  avatarColor: string;
  description: string;
  website?: string;
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

// Base de données de clients mockée
const clientsDatabase: Record<string, Client> = {
  "1": {
    id: "1",
    name: "Maison Relais Gourmet",
    sector: "Restaurant & traiteur d'événementiel",
    siret: "SIRET 812-456-789 00021",
    email: "contact@relais-gourmet.fr",
    phone: "02 418 25 00",
    city: "Angers, Maine-et-Loire",
    joinDate: "sept. 2023",
    status: "Actif",
    avatar: "MR",
    avatarColor: "#B08D32",
    description: "Restaurant et traiteur spécialisé dans l'événementiel avec une expertise en services de catering haut de gamme.",
    website: "relais-gourmet.fr",
  },
  "2": {
    id: "2",
    name: "Netzy",
    sector: "Tech / SaaS",
    siret: "SIRET 123-456-789 00045",
    email: "contact@netzy.fr",
    phone: "02 41 25 15 00",
    city: "Rennes, Ille-et-Vilaine",
    joinDate: "janv. 2024",
    status: "Actif",
    avatar: "NZ",
    avatarColor: "#7C3AED",
    description: "Startup en solutions cloud spécialisée dans la gestion de données d'entreprise.",
    website: "netzy.fr",
  },
  "3": {
    id: "3",
    name: "Vins d'Anjou - Saumur",
    sector: "Viticulture",
    siret: "SIRET 987-654-321 00123",
    email: "contact@vins-anjou.fr",
    phone: "02 41 52 30 00",
    city: "Saumur, Maine-et-Loire",
    joinDate: "avr. 2023",
    status: "Actif",
    avatar: "VD",
    avatarColor: "#DC2626",
    description: "Domaine viticole réputé produisant des vins AOC de renommée internationale.",
    website: "vins-anjou.fr",
  },
  "4": {
    id: "4",
    name: "BERYL Patrimoine",
    sector: "Conseil financier",
    siret: "SIRET 456-789-123 00089",
    email: "contact@beryl-patrimoine.fr",
    phone: "02 41 60 40 50",
    city: "Angers, Maine-et-Loire",
    joinDate: "mars 2024",
    status: "Actif",
    avatar: "BP",
    avatarColor: "#059669",
    description: "Cabinet de conseil en gestion de patrimoine et investissements financiers.",
    website: "beryl-patrimoine.fr",
  },
};

const metricsDatabase: Record<string, ClientMetrics> = {
  "1": {
    totalRevenue: "47.2 k€",
    pendingRevenue: "8.5 k€",
    avgMargin: "67%",
    projectCount: 9,
    deliveredCount: 8,
  },
  "2": {
    totalRevenue: "35.8 k€",
    pendingRevenue: "12.3 k€",
    avgMargin: "71%",
    projectCount: 6,
    deliveredCount: 5,
  },
  "3": {
    totalRevenue: "28.5 k€",
    pendingRevenue: "5.2 k€",
    avgMargin: "58%",
    projectCount: 4,
    deliveredCount: 4,
  },
  "4": {
    totalRevenue: "42.1 k€",
    pendingRevenue: "9.8 k€",
    avgMargin: "64%",
    projectCount: 7,
    deliveredCount: 6,
  },
};

const projectsDatabase: Record<string, ClientProject[]> = {
  "1": [
    { id: "p1", name: "Maquettes site e-commerce", status: "En production", amount: "8 500 €", date: "Mars 2026" },
    { id: "p2", name: "Campagne emailing printemps", status: "Livré", amount: "3 200 €", date: "Févr. 2026" },
    { id: "p3", name: "Refonte identité de marque", status: "Livré", amount: "12 000 €", date: "Nov. 2025" },
  ],
  "2": [
    { id: "p4", name: "App mobile iOS/Android", status: "En production", amount: "15 000 €", date: "Avril 2026" },
    { id: "p5", name: "Dashboard analytics", status: "Livré", amount: "8 500 €", date: "Janv. 2026" },
  ],
  "3": [
    { id: "p6", name: "Rebranding complet", status: "Livré", amount: "6 200 €", date: "Déc. 2025" },
    { id: "p7", name: "Site vitrine", status: "Livré", amount: "4 800 €", date: "Août 2025" },
  ],
  "4": [
    { id: "p8", name: "Plateforme d'investissement", status: "En production", amount: "22 000 €", date: "Mai 2026" },
    { id: "p9", name: "Rapport annuel design", status: "Livré", amount: "5 600 €", date: "Mars 2026" },
  ],
};

const contactsDatabase: Record<string, ClientContact> = {
  "1": {
    name: "Claire Lemaire",
    role: "Directrice marketing",
    email: "c.lemaire@relais-gourmet.fr",
    phone: "0612 45 78 90",
    avatar: "CL",
    color: "#7C3AED",
  },
  "2": {
    name: "Martin Durand",
    role: "PDG",
    email: "martin@netzy.fr",
    phone: "0687 34 52 19",
    avatar: "MD",
    color: "#2563EB",
  },
  "3": {
    name: "Sophie Bernard",
    role: "Responsable Marketing",
    email: "sophie@vins-anjou.fr",
    phone: "0678 92 45 31",
    avatar: "SB",
    color: "#DC2626",
  },
  "4": {
    name: "Jean-Pierre Moreau",
    role: "Directeur",
    email: "jp.moreau@beryl-patrimoine.fr",
    phone: "0645 78 23 56",
    avatar: "JPM",
    color: "#059669",
  },
};

export function getClient(id: string): Client | null {
  return clientsDatabase[id] || null;
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

export function getAllClients(): Client[] {
  return Object.values(clientsDatabase);
}
