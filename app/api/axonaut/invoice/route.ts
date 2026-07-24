import { NextResponse } from "next/server";
import { createInvoice, getInvoice, AxonautError } from "@/lib/axonaut";
import { buildInvoicePayload } from "@/lib/axonaut-mapper";
import { getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

/**
 * POST /api/axonaut/invoice
 * Crée une facture dans Axonaut pour un palier de facturation (30/50/100 %).
 *
 * Body attendu (JSON) :
 *   {
 *     companyId: number,        // id Axonaut du client
 *     taskName: string,         // "Maquettes UI/UX"
 *     projetName: string,       // "Netzy — Refonte site"
 *     pourcentage: 30 | 50 | 100,
 *     montantTotalHT: number,   // ex: 6200
 *     dejaFacture: number,      // ex: 1860 (déjà encaissé)
 *     taxRate?: number          // défaut: 20 (TVA 20%)
 *   }
 *
 * Réponses :
 *   200 { ok: true, invoice: { id, number, status, ... } }
 *   400 { ok: false, error: "..." } si payload invalide
 *   502 { ok: false, error: "..." } si erreur Axonaut
 */
export async function POST(req: Request) {
  // Aucune vérification n'existait ici — n'importe qui, même non connecté,
  // pouvait créer une vraie facture Axonaut en appelant cette route
  // directement. Non appelée depuis l'app aujourd'hui (aucun appelant
  // trouvé — probablement prévue pour le futur mécanisme d'abonnements),
  // mais corrigée dès maintenant vu la sensibilité de l'action.
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "manage_billing")) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  // Validation minimaliste
  const b = body as Record<string, unknown>;
  if (
    typeof b.companyId !== "number" ||
    typeof b.taskName !== "string" ||
    typeof b.projetName !== "string" ||
    typeof b.pourcentage !== "number" ||
    typeof b.montantTotalHT !== "number" ||
    typeof b.dejaFacture !== "number"
  ) {
    return NextResponse.json({ ok: false, error: "Champs manquants ou invalides" }, { status: 400 });
  }
  if (![30, 50, 100].includes(b.pourcentage as number)) {
    return NextResponse.json({ ok: false, error: "Pourcentage doit être 30, 50 ou 100" }, { status: 400 });
  }

  const payload = buildInvoicePayload({
    companyId: b.companyId as number,
    taskName: b.taskName as string,
    projetName: b.projetName as string,
    pourcentage: b.pourcentage as 30 | 50 | 100,
    montantTotalHT: b.montantTotalHT as number,
    dejaFacturé: b.dejaFacture as number,
    taxRate: typeof b.taxRate === "number" ? (b.taxRate as number) : undefined,
  });

  // Si le montant calculé est 0 → palier déjà atteint
  if (payload.invoice_lines[0].pre_tax_unit_amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Palier déjà atteint, rien à facturer" },
      { status: 400 }
    );
  }

  try {
    const invoice = await createInvoice(payload);
    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        pre_tax_amount: invoice.pre_tax_amount,
        total_amount: invoice.total_amount,
        date: invoice.date,
      },
    });
  } catch (e) {
    if (e instanceof AxonautError) {
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

/**
 * GET /api/axonaut/invoice?id=123
 * Récupère le statut d'une facture (utile pour vérifier si payée — utilisé par le
 * mécanisme d'abonnements : si la facture du mois précédent n'est pas payée,
 * on bloque la création des tâches du mois suivant).
 */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "view_billing")) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id || isNaN(id)) {
    return NextResponse.json({ ok: false, error: "Paramètre 'id' manquant ou invalide" }, { status: 400 });
  }
  try {
    const invoice = await getInvoice(id);
    return NextResponse.json({ ok: true, invoice });
  } catch (e) {
    if (e instanceof AxonautError) {
      return NextResponse.json(
        { ok: false, error: e.message, status: e.status },
        { status: e.status === 404 ? 404 : 502 }
      );
    }
    return NextResponse.json({ ok: false, error: "Erreur interne" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
