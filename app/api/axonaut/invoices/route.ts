import { NextResponse } from "next/server";
import { listInvoices, AxonautError } from "@/lib/axonaut";
import { getServerSession } from "@/lib/supabase-server";

/**
 * GET /api/axonaut/invoices
 * Renvoie TOUTES les factures Axonaut.
 */
export async function GET() {
  const profile = await getServerSession();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const invoices = await listInvoices();
    return NextResponse.json({
      ok: true,
      count: invoices.length,
      invoices,
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
