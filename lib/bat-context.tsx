"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * BAT (Bon À Tirer) — contexte global avec persistance localStorage.
 *
 * - id     : identifiant interne
 * - token  : jeton public utilisé dans le lien envoyé au client (URL /sign/<token>)
 * - statut : "envoye" → en attente client, "valide" → signé, "modifier" → renvoyé en prod
 *
 * Le PDF est stocké en base64 dans localStorage (limite 3 Mo).
 * Pour la production : Supabase Storage + URL signée 24-48h.
 */

const STORAGE_KEY = "crm-groupe-echo:bats:v1";
const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3 Mo (limite localStorage)

export type BatStatut = "envoye" | "valide" | "modifier";

export type Bat = {
  id: string;
  token: string;
  taskId: number;
  taskName: string;
  projet: string;
  client: string;
  collabId: number | null;
  version: number;
  pdfName?: string;
  pdfDataUrl?: string;
  pdfSize?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  statut: BatStatut;
  signedBy?: string;
  signedAt?: string;
  commentaire?: string;
};

const INITIAL_BATS: Bat[] = [
  {
    id: "bat-init-netzy",
    token: "demo-netzy-uiux-001",
    taskId: 4,
    taskName: "Maquettes UI/UX",
    projet: "Netzy — Refonte site",
    client: "Netzy",
    collabId: 1,
    version: 1,
    statut: "envoye",
    pdfName: "netzy_ui_v1.pdf",
    pdfSize: 2_400_000,
    uploadedAt: "2026-04-22T10:30:00",
    uploadedBy: "Maryline",
  },
  {
    id: "bat-init-beryl",
    token: "demo-beryl-identite-002",
    taskId: 9,
    taskName: "Identité visuelle",
    projet: "BÉRYL Patrimoine — Branding",
    client: "BÉRYL",
    collabId: 1,
    version: 2,
    statut: "valide",
    pdfName: "beryl_identite_v2.pdf",
    pdfSize: 5_100_000,
    uploadedAt: "2026-04-15T14:00:00",
    uploadedBy: "Maryline",
    signedBy: "Jean Bertrand (BÉRYL)",
    signedAt: "2026-04-18T09:15:00",
  },
];

type BatContextValue = {
  bats: Bat[];
  hydrated: boolean;
  getBatById: (id: string) => Bat | undefined;
  getBatByToken: (token: string) => Bat | undefined;
  getBatByTaskId: (taskId: number) => Bat | undefined;
  createBat: (input: {
    taskId: number;
    taskName: string;
    projet: string;
    client: string;
    collabId: number | null;
    pdfName: string;
    pdfDataUrl: string;
    pdfSize: number;
    uploadedBy: string;
  }) => Bat;
  validateBat: (id: string, signedBy: string) => void;
  requestModification: (id: string, comment: string) => void;
  reupload: (id: string, pdf: { name: string; dataUrl: string; size: number }, uploadedBy: string) => void;
  /** Erreur courante (quota localStorage, fichier trop gros, etc.) */
  storageError: string | null;
  clearStorageError: () => void;
};

const BatContext = createContext<BatContextValue | null>(null);

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function BatProvider({ children }: { children: ReactNode }) {
  const [bats, setBats] = useState<Bat[]>(INITIAL_BATS);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Hydratation depuis localStorage (évite mismatch SSR/CSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBats(parsed);
        }
      }
    } catch {
      // ignore : on garde les INITIAL_BATS
    }
    setHydrated(true);
  }, []);

  // Persistance à chaque changement (après hydratation pour éviter d'écraser)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bats));
    } catch {
      // Quota dépassé — on retire les pdfDataUrl pour gagner de la place
      const slim = bats.map((b) => ({ ...b, pdfDataUrl: undefined }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        setStorageError(
          "Mémoire navigateur saturée : les PDFs ne sont plus persistés entre les onglets. " +
          "Limite ~3 Mo par PDF en local. En production : Supabase Storage."
        );
      } catch {
        setStorageError("Impossible d'écrire en localStorage.");
      }
    }
  }, [bats, hydrated]);

  // Synchro multi-onglets
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setBats(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const getBatById = (id: string) => bats.find((b) => b.id === id);
  const getBatByToken = (token: string) => bats.find((b) => b.token === token);
  /**
   * Retourne le BAT le plus récent pour une tâche (toutes versions / statuts).
   * Si plusieurs BAT existent pour la même tâche (versions multiples), prend le dernier.
   */
  const getBatByTaskId = (taskId: number) => {
    const matching = bats.filter((b) => b.taskId === taskId);
    if (matching.length === 0) return undefined;
    // Trie par version desc puis par uploadedAt desc
    return matching.sort((a, b) => {
      if (b.version !== a.version) return b.version - a.version;
      return (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? "");
    })[0];
  };

  const createBat: BatContextValue["createBat"] = (input) => {
    if (input.pdfSize > MAX_PDF_SIZE) {
      setStorageError(
        `PDF trop lourd pour la démo locale (${(input.pdfSize / 1024 / 1024).toFixed(1)} Mo > 3 Mo). ` +
        "En production avec Supabase Storage : limite plus haute."
      );
      throw new Error("PDF trop lourd");
    }
    const newBat: Bat = {
      id: uuid(),
      token: uuid().replace(/-/g, "").slice(0, 24),
      taskId: input.taskId,
      taskName: input.taskName,
      projet: input.projet,
      client: input.client,
      collabId: input.collabId,
      version: 1,
      pdfName: input.pdfName,
      pdfDataUrl: input.pdfDataUrl,
      pdfSize: input.pdfSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: input.uploadedBy,
      statut: "envoye",
    };
    setBats((prev) => [newBat, ...prev]);
    return newBat;
  };

  const validateBat: BatContextValue["validateBat"] = (id, signedBy) => {
    setBats((prev) => prev.map((b) =>
      b.id === id
        ? { ...b, statut: "valide", signedBy, signedAt: new Date().toISOString(), commentaire: undefined }
        : b
    ));
  };

  const requestModification: BatContextValue["requestModification"] = (id, comment) => {
    setBats((prev) => prev.map((b) =>
      b.id === id
        ? { ...b, statut: "modifier", commentaire: comment, signedBy: undefined, signedAt: undefined }
        : b
    ));
  };

  const reupload: BatContextValue["reupload"] = (id, pdf, uploadedBy) => {
    if (pdf.size > MAX_PDF_SIZE) {
      setStorageError(`PDF trop lourd (${(pdf.size / 1024 / 1024).toFixed(1)} Mo > 3 Mo).`);
      throw new Error("PDF trop lourd");
    }
    setBats((prev) => prev.map((b) =>
      b.id === id
        ? {
          ...b,
          version: b.version + 1,
          statut: "envoye",
          pdfName: pdf.name,
          pdfDataUrl: pdf.dataUrl,
          pdfSize: pdf.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          commentaire: undefined,
          signedBy: undefined,
          signedAt: undefined,
        }
        : b
    ));
  };

  const value: BatContextValue = {
    bats,
    hydrated,
    getBatById,
    getBatByToken,
    getBatByTaskId,
    createBat,
    validateBat,
    requestModification,
    reupload,
    storageError,
    clearStorageError: () => setStorageError(null),
  };

  return <BatContext.Provider value={value}>{children}</BatContext.Provider>;
}

export function useBats() {
  const ctx = useContext(BatContext);
  if (!ctx) throw new Error("useBats doit être utilisé dans <BatProvider>");
  return ctx;
}

export const BAT_MAX_SIZE = MAX_PDF_SIZE;
