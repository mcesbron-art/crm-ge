import { NextResponse } from "next/server";
import { listContractsSince, AxonautError } from "@/lib/axonaut";

/**
 * GET /api/axonaut/contracts-sync/probe
 *
 * Vérifie le sens réel du filtre `updated_after` de l'API Axonaut.
 *
 * Logique :
 *  - call_A : updated_after = aujourd'hui - 3 jours  → peu de résultats attendus
 *  - call_B : updated_after = aujourd'hui - 5 ans    → beaucoup de résultats attendus
 *
 * Si updated_after fonctionne correctement ("modifiés APRÈS cette date") :
 *   → call_B.count >= call_A.count  ✅
 *
 * Si les counts sont inversés (call_A > call_B) :
 *   → le paramètre se comporte comme "modifiés AVANT cette date" ⚠️
 *   → remplacer `updated_after` par `updated_before` dans lib/axonaut.ts
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAxonautDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export async function GET() {
  const now = new Date();

  const minus3days = new Date(now);
  minus3days.setUTCDate(now.getUTCDate() - 3);

  const minus5years = new Date(now);
  minus5years.setUTCFullYear(now.getUTCFullYear() - 5);

  const filterA = toAxonautDate(minus3days);
  const filterB = toAxonautDate(minus5years);

  try {
    const [resA, resB] = await Promise.allSettled([
      listContractsSince(filterA),
      listContractsSince(filterB),
    ]);

    const countA = resA.status === "fulfilled" ? resA.value.length : null;
    const countB = resB.status === "fulfilled" ? resB.value.length : null;
    const errA   = resA.status === "rejected"  ? String(resA.reason) : null;
    const errB   = resB.status === "rejected"  ? String(resB.reason) : null;

    let interpretation = "Impossible de déterminer (erreur dans l'un des appels).";
    if (countA !== null && countB !== null) {
      if (countB >= countA) {
        interpretation =
          "✅ updated_after fonctionne correctement : " +
          `call_B (−5 ans, ${countB}) >= call_A (−3 jours, ${countA}). Aucun changement nécessaire.`;
      } else {
        interpretation =
          "⚠️  updated_after semble inversé : " +
          `call_A (−3 jours, ${countA}) > call_B (−5 ans, ${countB}). ` +
          "Remplacer `updated_after` par `updated_before` dans lib/axonaut.ts (fonction listContractsSince).";
      }
    }

    return NextResponse.json({
      interpretation,
      call_A: {
        description: "aujourd'hui − 3 jours (peu de résultats attendus)",
        filter: `updated_after=${filterA}`,
        count: countA,
        error: errA,
        sample_ids: resA.status === "fulfilled" ? resA.value.slice(0, 5).map((c) => c.id) : [],
      },
      call_B: {
        description: "aujourd'hui − 5 ans (beaucoup de résultats attendus)",
        filter: `updated_after=${filterB}`,
        count: countB,
        error: errB,
        sample_ids: resB.status === "fulfilled" ? resB.value.slice(0, 5).map((c) => c.id) : [],
      },
    });
  } catch (e) {
    const message =
      e instanceof AxonautError
        ? `Axonaut ${e.status}: ${e.message}`
        : e instanceof Error ? e.message : "Erreur interne";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
