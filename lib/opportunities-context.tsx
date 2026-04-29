"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * Opportunités commerciales — un mini-pipeline par collaborateur.
 *
 * Statuts (dans l'ordre du pipeline) :
 *   - nouvelle  : opportunité identifiée, pas encore contactée
 *   - contacte  : premier échange fait
 *   - devis     : devis envoyé, en attente de retour
 *   - gagne     : devis signé / contrat ferme
 *   - perdu     : opportunité perdue (annulée, choix concurrent, etc.)
 *
 * Les 4 dernières colonnes du kanban regroupent gagne+perdu dans la 4e
 * (badge vert/rouge selon le résultat).
 *
 * Persistance : localStorage. En production : table `opportunities` Supabase.
 */

const STORAGE_KEY = "crm-groupe-echo:opportunities:v1";

export type OpportunityStatut = "nouvelle" | "contacte" | "devis" | "gagne" | "perdu";

export type Opportunity = {
  id: string;
  collabId: number;
  title: string;
  clientName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedAmount?: number;
  notes?: string;
  statut: OpportunityStatut;
  createdAt: string;
  updatedAt: string;
};

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  // Noémie (1) - Graphisme
  { id: "opp-1", collabId: 1, title: "Refonte logo Boulangerie Lamy", clientName: "Boulangerie Lamy",
    contactName: "Sophie Lamy", contactEmail: "sophie@boulangerie-lamy.fr", contactPhone: "06 12 34 56 78",
    estimatedAmount: 3500, notes: "Souhaite moderniser l'image, étude en cours.",
    statut: "nouvelle", createdAt: "2026-04-10T09:00:00", updatedAt: "2026-04-10T09:00:00" },
  { id: "opp-2", collabId: 1, title: "Charte graphique Atelier Métal", clientName: "Atelier Métal",
    contactName: "Pierre Roussel", contactEmail: "p.roussel@atelier-metal.com", contactPhone: "02 41 88 90 21",
    estimatedAmount: 6800, notes: "Devis envoyé le 18/04.",
    statut: "devis", createdAt: "2026-04-12T14:30:00", updatedAt: "2026-04-18T10:15:00" },

  // Amandine (2) - Web/SEO
  { id: "opp-3", collabId: 2, title: "Audit SEO + refonte Vitrine Verrière", clientName: "Vitrine Verrière",
    contactName: "Marie Bouvet", contactEmail: "contact@vitrine-verriere.fr", contactPhone: "06 98 76 54 32",
    estimatedAmount: 4200, notes: "Audit gratuit envoyé. Réponse attendue cette semaine.",
    statut: "contacte", createdAt: "2026-04-15T11:00:00", updatedAt: "2026-04-22T09:30:00" },
  { id: "opp-4", collabId: 2, title: "Site WordPress Cabinet Avoc.", clientName: "Cabinet d'avocats Tellier",
    contactName: "Me. Julien Tellier", contactEmail: "j.tellier@avocats-tellier.fr",
    estimatedAmount: 5500, notes: "A signé !",
    statut: "gagne", createdAt: "2026-03-22T15:00:00", updatedAt: "2026-04-19T16:45:00" },

  // Jérémy (3) - Social Media
  { id: "opp-5", collabId: 3, title: "Stratégie Insta Resto Le Vivier", clientName: "Resto Le Vivier",
    contactName: "Karine Leduc", contactEmail: "karine@levivier-resto.fr", contactPhone: "07 65 43 21 09",
    estimatedAmount: 2400, notes: "1er rdv vendredi 17h.",
    statut: "nouvelle", createdAt: "2026-04-20T08:30:00", updatedAt: "2026-04-20T08:30:00" },
  { id: "opp-6", collabId: 3, title: "Vidéo corporate Agence VD Immo", clientName: "VD Immobilier",
    contactName: "Vincent Delcourt", contactEmail: "v.delcourt@vd-immobilier.fr", contactPhone: "02 41 33 44 55",
    estimatedAmount: 4500,
    statut: "perdu", notes: "Choix d'un freelance interne.",
    createdAt: "2026-03-10T10:00:00", updatedAt: "2026-04-05T17:00:00" },

  // Marcellin (4) - SEO/SEA
  { id: "opp-7", collabId: 4, title: "Campagne Ads Hivernal MRG", clientName: "Maison Relais Gourmet",
    contactName: "Élise Dumas", contactEmail: "elise@maisonrelaisgourmet.fr", contactPhone: "02 51 22 33 44",
    estimatedAmount: 1800, notes: "Renouvellement campagne saisonnière.",
    statut: "devis", createdAt: "2026-04-08T13:45:00", updatedAt: "2026-04-21T11:20:00" },

  // Arthur (5) - Sites complexes
  { id: "opp-8", collabId: 5, title: "Plateforme e-learning OpenForm", clientName: "OpenForm Éducation",
    contactName: "Thierry Nguyen", contactEmail: "tnguyen@openform-edu.fr", contactPhone: "06 11 22 33 44",
    estimatedAmount: 24000, notes: "Projet à fort potentiel, plusieurs RDV faits.",
    statut: "contacte", createdAt: "2026-04-02T09:15:00", updatedAt: "2026-04-23T15:00:00" },
  { id: "opp-9", collabId: 5, title: "App mobile Bistro Connect", clientName: "Bistro Connect",
    contactName: "Linda Bertin", contactEmail: "linda@bistroconnect.fr",
    estimatedAmount: 9500,
    statut: "gagne", notes: "Contrat signé le 14/04.",
    createdAt: "2026-03-15T10:00:00", updatedAt: "2026-04-14T16:00:00" },

  // Fanny (6) - Planning
  { id: "opp-10", collabId: 6, title: "Audit organisationnel ChampiSarl", clientName: "ChampiSarl",
    contactName: "Hélène Vasseur", contactEmail: "h.vasseur@champisarl.fr", contactPhone: "02 41 77 88 99",
    estimatedAmount: 2200, notes: "Mission de conseil sur 3 semaines.",
    statut: "nouvelle", createdAt: "2026-04-22T14:00:00", updatedAt: "2026-04-22T14:00:00" },
];

type OpportunitiesContextValue = {
  opportunities: Opportunity[];
  hydrated: boolean;
  getByCollab: (collabId: number) => Opportunity[];
  add: (input: Omit<Opportunity, "id" | "createdAt" | "updatedAt">) => Opportunity;
  update: (id: string, patch: Partial<Opportunity>) => void;
  remove: (id: string) => void;
  changeStatus: (id: string, statut: OpportunityStatut) => void;
};

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function OpportunitiesProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOpportunities(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities)); } catch {}
  }, [opportunities, hydrated]);

  // Synchro multi-onglets
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setOpportunities(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const getByCollab = (collabId: number) =>
    opportunities.filter((o) => o.collabId === collabId);

  const add: OpportunitiesContextValue["add"] = (input) => {
    const now = new Date().toISOString();
    const newOpp: Opportunity = { ...input, id: uuid(), createdAt: now, updatedAt: now };
    setOpportunities((prev) => [newOpp, ...prev]);
    return newOpp;
  };

  const update: OpportunitiesContextValue["update"] = (id, patch) => {
    setOpportunities((prev) => prev.map((o) =>
      o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o
    ));
  };

  const remove: OpportunitiesContextValue["remove"] = (id) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  };

  const changeStatus: OpportunitiesContextValue["changeStatus"] = (id, statut) => {
    update(id, { statut });
  };

  return (
    <OpportunitiesContext.Provider value={{ opportunities, hydrated, getByCollab, add, update, remove, changeStatus }}>
      {children}
    </OpportunitiesContext.Provider>
  );
}

export function useOpportunities() {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error("useOpportunities doit être utilisé dans <OpportunitiesProvider>");
  return ctx;
}
