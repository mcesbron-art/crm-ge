import "server-only";

const API_URL = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";
const API_KEY = process.env.AXONAUT_API_KEY ?? "";

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
  unit_job_costing?: number;
  pre_tax_amount?: number;
  quantity?: number;
};

export type AxonautQuotation = {
  id: number;
  number: string;
  title?: string;
  status: string;
  total_amount?: number;
  pre_tax_amount: number;
  date: string;
  company?: AxonautCompany;
  quotation_lines?: AxonautQuotationItem[];
};

export type AxonautInvoice = {
  id: number;
  number: string;
  title?: string;
  pre_tax_amount: number;
  total_amount: number;
  status: string;
  date: string;
  company?: AxonautCompany;
};

export type AxonautInvoiceCreate = {
  company_id: number;
  title?: string;
  date: string;
  invoice_lines: {
    product_name: string;
    product_description?: string;
    quantity: number;
    pre_tax_unit_amount: number;
    tax_rate?: number;
  }[];
};

export class AxonautError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "AxonautError";
    this.status = status;
    this.body = body;
  }
}

const FETCH_TIMEOUT_MS = 25_000; // 25 s par requête (budget total 60 s sur Hobby)
const MAX_PAGES = 20;            // garde-fou : 20 × 500 = 10 000 items max

async function axonautFetch<T>(path: string, init: RequestInit = {}, page?: number): Promise<T> {
  if (!API_KEY) {
    throw new AxonautError(500, "AXONAUT_API_KEY manquante.");
  }

  const url = `${API_URL}${path}`;
  const headers: HeadersInit = {
    "userApiKey": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(page !== undefined ? { "page": String(page) } : {}),
    ...(init.headers ?? {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    throw new AxonautError(res.status, `Axonaut ${init.method ?? "GET"} ${path} → ${res.status}`, body);
  }

  return res.json() as Promise<T>;
}

async function axonautFetchAll<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    console.log(`[axonaut] GET ${path} — page ${page}`);
    const t0 = Date.now();
    const data = await axonautFetch<T[]>(path, {}, page);
    console.log(`[axonaut] page ${page} → ${Array.isArray(data) ? data.length : "non-array"} items (${Date.now() - t0} ms)`);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 500) break;
    page++;
  }
  return results;
}

export async function ping() {
  try {
    const list = await axonautFetch<AxonautCompany[]>("/companies", {}, 1);
    return { ok: true, sample: (list as AxonautCompany[])[0]?.name };
  } catch (e) {
    if (e instanceof AxonautError) return { ok: false, error: e.message, status: e.status };
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function listValidatedQuotations(): Promise<AxonautQuotation[]> {
  const all = await axonautFetchAll<AxonautQuotation>("/quotations");
  return all.filter((q) => ["validated", "accepted"].includes(q.status));
}

export async function listAllQuotations(): Promise<AxonautQuotation[]> {
  return axonautFetchAll<AxonautQuotation>("/quotations");
}

export async function listCompanies(): Promise<AxonautCompany[]> {
  return axonautFetchAll<AxonautCompany>("/companies");
}

export async function getQuotation(id: number): Promise<AxonautQuotation> {
  return axonautFetch<AxonautQuotation>(`/quotations/${id}`);
}

export async function createInvoice(data: AxonautInvoiceCreate): Promise<AxonautInvoice> {
  return axonautFetch<AxonautInvoice>("/invoices", { method: "POST", body: JSON.stringify(data) });
}

export async function getInvoice(id: number): Promise<AxonautInvoice> {
  return axonautFetch<AxonautInvoice>(`/invoices/${id}`);
}

export async function listInvoices(filters?: { company_id?: number }): Promise<AxonautInvoice[]> {
  let path = "/invoices";
  if (filters?.company_id) path += `?company_id=${filters.company_id}`;
  return axonautFetchAll<AxonautInvoice>(path);
}

// ---------------------------------------------------------------------------
// Contracts (commandes)
// ---------------------------------------------------------------------------

export type AxonautContract = {
  id: number;
  company?: { id: number; name: string };
  project?: { name?: string };
  quotation?: { id: number };
  start_date?: string | null;
  expected_delivery_date?: string | null;
  updated_at?: string | null;
};

/**
 * Récupère les commandes Axonaut modifiées après une date donnée.
 *
 * @param updatedAfterDDMMYYYY - Date au format DD/MM/YYYY (format Axonaut).
 *   Omettre pour récupérer toutes les commandes sans filtre de date.
 *
 * ⚠️  Note Axonaut : les paramètres `updated_after` et `updated_before` sont
 * documentés de façon ambiguë — vérifier le comportement réel via
 * GET /api/axonaut/contracts-sync/probe avant de passer en production.
 * Si les résultats semblent inversés, remplacer `updated_after` par
 * `updated_before` dans le chemin ci-dessous.
 */
export async function listContractsSince(updatedAfterDDMMYYYY?: string): Promise<AxonautContract[]> {
  const path = updatedAfterDDMMYYYY
    ? `/contracts?updated_after=${encodeURIComponent(updatedAfterDDMMYYYY)}`
    : "/contracts";
  return axonautFetchAll<AxonautContract>(path);
}