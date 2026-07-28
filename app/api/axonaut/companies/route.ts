import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { AxonautError } from "@/lib/axonaut";

const API_URL = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";
const API_KEY = process.env.AXONAUT_API_KEY ?? "";

export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  // Données Axonaut (sociétés/factures/devis) réservées à view_billing, comme
  // /api/billing et /api/axonaut/invoices — sans cette vérification, un
  // collaborateur pourrait contourner la restriction facturation via la
  // fiche société au lieu de la page Facturation.
  if (!can(profile.role, "view_billing")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const res = await fetch(`${API_URL}/companies`, {
      headers: {
        "userApiKey": API_KEY,
        "Accept": "application/json",
        "page": "1",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new AxonautError(res.status, `Axonaut GET /companies → ${res.status}`, body);
    }

    const companies = await res.json();

    return NextResponse.json({
      ok: true,
      count: companies.length,
      companies,
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