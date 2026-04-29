import { NextResponse } from "next/server";
import { ping } from "@/lib/axonaut";

/**
 * GET /api/axonaut/test
 * Vérifie que la clé API est valide en faisant un appel léger à Axonaut.
 *
 * Réponses :
 *   200 { ok: true, sample: "Acme Corp" }   → connexion OK
 *   400 { ok: false, error: "..." }          → clé invalide / problème réseau
 */
export async function GET() {
  const result = await ping();
  if (result.ok) {
    return NextResponse.json(result, { status: 200 });
  }
  return NextResponse.json(result, { status: result.status ?? 400 });
}

// Empêche tout caching de cette route
export const dynamic = "force-dynamic";
export const revalidate = 0;
