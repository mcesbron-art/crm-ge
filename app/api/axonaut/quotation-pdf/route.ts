import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_URL = "https://axonaut.com/api/v2";

export async function GET(req: NextRequest) {
  // Aucune vérification d'authentification n'existait ici : n'importe qui
  // connaissant/devinant un id de devis pouvait récupérer le PDF (montants
  // inclus) sans même être connecté au CRM. Pas de restriction par rôle en
  // revanche : consulter un devis depuis le panneau projet est déjà ouvert
  // à tout collaborateur aujourd'hui (comportement existant, pas une brèche).
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const download = req.nextUrl.searchParams.get("download") === "1";

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  const apiKey = process.env.AXONAUT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AXONAUT_API_KEY manquante" }, { status: 500 });
  }

  // 1. Récupérer les métadonnées du devis pour obtenir le public_path
  const metaRes = await fetch(`${API_URL}/quotations/${id}`, {
    headers: { userApiKey: apiKey, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!metaRes.ok) {
    return NextResponse.json(
      { error: `Devis introuvable (Axonaut ${metaRes.status})` },
      { status: metaRes.status >= 500 ? 502 : metaRes.status },
    );
  }

  const meta = await metaRes.json() as { public_path?: string; number?: string };

  if (!meta.public_path) {
    return NextResponse.json(
      { error: "PDF non disponible pour ce devis (aucun public_path)" },
      { status: 404 },
    );
  }

  // 2. Télécharger le PDF via le public_path (URL publique, pas d'auth requise)
  const pdfRes = await fetch(meta.public_path, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!pdfRes.ok) {
    return NextResponse.json(
      { error: `PDF inaccessible (${pdfRes.status})` },
      { status: 502 },
    );
  }

  const buffer = await pdfRes.arrayBuffer();
  const filename = `devis-${meta.number ?? id}.pdf`;
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Cache-Control": "private, max-age=300",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(buffer, { status: 200, headers });
}
