/**
 * Client Axonaut — UTILISATION SERVER-SIDE UNIQUEMENT.
 *
 * Ne JAMAIS importer ce fichier depuis un composant client (`"use client"`),
 * sinon la clé API serait exposée dans le bundle navigateur.
 *
 * À utiliser dans :
 *   - Server Components
 *   - Route Handlers (app/api/.../route.ts)
 *   - Server Actions
 *
 * Documentation Axonaut : https://axonaut.com/api/doc/
 */

import "server-only";

const API_URL = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";
const API_KEY = process.env.AXONAUT_API_KEY ?? "";

// ============================================================
// TYPES — minimaux pour notre usage
// ============================================================

export type AxonautCompany = {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
};

export type AxonautQuotationItem = {
  id?: number;
  product_name: string;
  product_description?: string;
  unit_job_costing?: number;     // coût de revient unitaire
  pre_tax_amount?: number;       // montant HT total
  quantity?: number;
};

export type AxonautQuotation = {
  id: number;
  number: string;                // numéro devis
  title?: string;
  status: string;                // "draft" | "validated" | "accepted" | ...
  total_amount?: number;
  pre_tax_amount: number;        // total HT
  date: string;                  // ISO
  company?: AxonautCompany;
  quotation_lines?: AxonautQuotationItem[];
};

export type AxonautInvoice = {
  id: number;
  number: string;
  title?: string;
  pre_tax_amount: number;
  total_amount: number;
  status: string;                // "draft" | "sent" | "paid" | "late" | ...
  date: string;
  company?: AxonautCompany;
};

export type AxonautInvoiceCreate = {
  company_id: number;
  title?: string;
  date: string;                  // YYYY-MM-DD
  invoice_lines: {
    product_name: string;
    product_description?: string;
    quantity: number;
    pre_tax_unit_amount: number;
    tax_rate?: number;           // ex: 20 pour 20%
  }[];
};

// ============================================================
// CORE FETCH WRAPPER
// ============================================================

class AxonautError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "AxonautError";
    this.status = status;
    this.body = body;
  }
}

async function axonautFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_KEY) {
    throw new AxonautError(500, "AXONAUT_API_KEY manquante. Configurer la variable d'environnement.");
  }

  const url = `${API_URL}${path}`;
  const headers: HeadersInit = {
    "userApiKey": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(init.headers ?? {}),
  };

  const res = await fetch(url, { ...init, headers, cache: "no-store" });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    throw new AxonautError(
      res.status,
      `Axonaut ${init.method ?? "GET"} ${path} → ${res.status}`,
      body
    );
  }

  return res.json() as Promise<T>;
}

// ============================================================
// PUBLIC API
// ============================================================

/** Vérifie la connexion (récupère 1 entreprise pour valider la clé). */
export async function ping(): Promise<{ ok: true; sample?: string } | { ok: false; error: string; status?: number }> {
  try {
    // GET /companies?per_page=1 — endpoint léger pour tester
    const list = await axonautFetch<AxonautCompany[]>("/companies?per_page=1");
    return { ok: true, sample: list[0]?.name };
  } catch (e) {
    if (e instanceof AxonautError) {
      return { ok: false, error: e.message, status: e.status };
    }
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Récupère les devis (quotations) validés. */
export async function listValidatedQuotations(): Promise<AxonautQuotation[]> {
  // Selon la doc Axonaut, le filtre status varie. On récupère tout puis on filtre côté serveur.
  const all = await axonautFetch<AxonautQuotation[]>("/quotations?per_page=200");
  return all.filter((q) => ["validated", "accepted"].includes(q.status));
}

/** Récupère TOUS les devis (quotations) — tout statut confondu. */
export async function listAllQuotations(): Promise<AxonautQuotation[]> {
  return axonautFetch<AxonautQuotation[]>("/quotations?per_page=200");
}

/** Récupère toutes les entreprises (clients). */
export async function listCompanies(): Promise<AxonautCompany[]> {
  return axonautFetch<AxonautCompany[]>("/companies?per_page=200");
}

/** Récupère 1 devis avec ses lignes. */
export async function getQuotation(id: number): Promise<AxonautQuotation> {
  return axonautFetch<AxonautQuotation>(`/quotations/${id}`);
}

/** Crée une facture dans Axonaut. */
export async function createInvoice(data: AxonautInvoiceCreate): Promise<AxonautInvoice> {
  return axonautFetch<AxonautInvoice>("/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Récupère le statut d'une facture (ex: pour vérifier si payée). */
export async function getInvoice(id: number): Promise<AxonautInvoice> {
  return axonautFetch<AxonautInvoice>(`/invoices/${id}`);
}

/** Liste des factures (utile pour vérifier l'état d'un abonnement). */
export async function listInvoices(filters?: { company_id?: number }): Promise<AxonautInvoice[]> {
  let path = "/invoices?per_page=200";
  if (filters?.company_id) path += `&company_id=${filters.company_id}`;
  return axonautFetch<AxonautInvoice[]>(path);
}

export { AxonautError };
