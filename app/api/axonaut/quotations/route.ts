import { NextResponse } from "next/server";
import { AxonautError } from "@/lib/axonaut";
import { getServerSession } from "@/lib/supabase-server";

const API_URL = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";
const API_KEY = process.env.AXONAUT_API_KEY ?? "";

interface AxonautQuotation {
  title?: string;
  number: string;
  [key: string]: unknown;
}

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/quotations`, {
      headers: {
        "userApiKey": API_KEY,
        "Accept": "application/json",
        "page": "1",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new AxonautError(res.status, `Axonaut GET /quotations → ${res.status}`, body);
    }

    const quotations = await res.json();

    const cleaned = quotations.map((q: AxonautQuotation) => ({
      ...q,
      title: stripHtml(q.title) || `Devis ${q.number}`,
    }));

    return NextResponse.json({
      ok: true,
      count: cleaned.length,
      quotations: cleaned,
      synced_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof AxonautError) {
      return NextResponse.json({ error: e.message, status: e.status }, { status: 502 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur interne" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;