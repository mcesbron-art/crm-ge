import { NextResponse } from "next/server";
import { ping } from "@/lib/axonaut";

/**
 * GET /api/axonaut/test
 * Vérifie la connexion à Axonaut + diagnostic des variables d'env.
 */
export async function GET() {
  const apiKey = process.env.AXONAUT_API_KEY ?? "";
  const apiUrl = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";

  // Diagnostic safe (pas de clé révélée, juste indices)
  const diag = {
    api_url_used: apiUrl,
    api_url_is_default: apiUrl === "https://axonaut.com/api/v2",
    api_key_present: !!apiKey,
    api_key_length: apiKey.length,
    api_key_first4: apiKey.slice(0, 4),
    api_key_last4: apiKey.slice(-4),
    api_key_has_leading_space: apiKey.startsWith(" "),
    api_key_has_trailing_space: apiKey.endsWith(" "),
    api_key_has_quotes: apiKey.startsWith('"') || apiKey.endsWith('"'),
  };

  const result = await ping();
  return NextResponse.json(
    { ...result, diagnostic: diag },
    { status: result.ok ? 200 : 400 },
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
