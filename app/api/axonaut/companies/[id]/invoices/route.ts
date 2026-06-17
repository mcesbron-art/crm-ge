import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-server";
import { AxonautError } from "@/lib/axonaut";

const API_URL = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";
const API_KEY = process.env.AXONAUT_API_KEY ?? "";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profile = await getServerSession();
  if (!profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const res = await fetch(`${API_URL}/invoices?company_id=${params.id}`, {
      headers: { "userApiKey": API_KEY, "Accept": "application/json", "page": "1" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new AxonautError(res.status, `Axonaut GET /invoices → ${res.status}`, body);
    }
    const invoices = await res.json();
    return NextResponse.json({ ok: true, invoices: Array.isArray(invoices) ? invoices : [] });
  } catch (e) {
    if (e instanceof AxonautError) return NextResponse.json({ error: e.message }, { status: 502 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur interne" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;