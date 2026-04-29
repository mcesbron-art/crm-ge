import { NextResponse } from "next/server";

/**
 * GET /api/axonaut/test
 * Diagnostic complet : capture la VRAIE réponse Axonaut (corps + headers)
 * pour comprendre la cause exacte du 403.
 */
export async function GET() {
  const apiKey = process.env.AXONAUT_API_KEY ?? "";
  const apiUrl = process.env.AXONAUT_API_URL ?? "https://axonaut.com/api/v2";

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

  // Appel Axonaut brut, on capture TOUT
  let axonautResponse: {
    http_status?: number;
    response_body?: string;
    response_headers?: Record<string, string>;
    fetch_error?: string;
  } = {};

  try {
    const res = await fetch(`${apiUrl}/companies?per_page=1`, {
      headers: {
        userApiKey: apiKey,
        Accept: "application/json",
        "User-Agent": "CRM-GE/1.0",
      },
      cache: "no-store",
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    const body = await res.text();

    axonautResponse = {
      http_status: res.status,
      response_body: body.slice(0, 800), // limite pour éviter de saturer
      response_headers: headers,
    };
  } catch (e) {
    axonautResponse = {
      fetch_error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(
    { diagnostic: diag, axonaut_response: axonautResponse },
    { status: 200 },
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
