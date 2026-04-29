import { NextResponse } from "next/server";
import { listValidatedQuotations, getQuotation, AxonautError } from "@/lib/axonaut";
import { quotationToProjet } from "@/lib/axonaut-mapper";

/**
 * GET /api/axonaut/sync
 * Récupère tous les devis validés / acceptés depuis Axonaut, charge les lignes
 * de chaque devis, et les convertit au format projet CRM.
 *
 * En production avec Supabase : à appeler à chaque clic sur le bouton "Synchroniser",
 * puis upserter les projets retournés en base.
 */
export async function GET() {
  try {
    const validated = await listValidatedQuotations();

    // Charge les lignes de chaque devis (l'endpoint /quotations sans /:id ne renvoie pas
    // toujours quotation_lines selon les versions de l'API Axonaut).
    const projets = [];
    for (const q of validated) {
      try {
        const detailed = await getQuotation(q.id);
        projets.push(quotationToProjet(detailed));
      } catch {
        // En cas d'erreur sur 1 devis, on continue les autres avec ce qu'on a
        projets.push(quotationToProjet(q));
      }
    }

    return NextResponse.json({
      ok: true,
      count: projets.length,
      projets,
      synced_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof AxonautError) {
      // Important : on ne forwarde PAS le body Axonaut au client (peut leaker des infos)
      return NextResponse.json(
        { ok: false, error: e.message, status: e.status },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur interne" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
