import { NextResponse } from "next/server";
import { listAllQuotations, AxonautError } from "@/lib/axonaut";
import { getServerSession } from "@/lib/supabase-server";

/**
 * GET /api/axonaut/quotations
 * Renvoie TOUS les devis Axonaut (tout statut), enrichis avec leur entreprise.
 *
 * Réponse :
 *   200 { ok: true, quotations: [...] }
 *   401 si non authentifié
 *   502 si Axonaut renvoie une erreur
 */
export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const quotations = await listAllQuotations();
    return NextResponse.json({
      ok: true,
      count: quotations.length,
      quotations,
      synced_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof AxonautError) {
      return NextResponse.json(
        { error: e.message, status: e.status },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur interne" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
