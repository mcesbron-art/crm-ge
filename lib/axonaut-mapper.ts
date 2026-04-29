/**
 * Mapper : convertit les données Axonaut → format interne du CRM Groupe Écho.
 *
 * Logique métier (issue du guide) :
 *   - Un devis Axonaut "validé" → un projet CRM en statut "À affecter"
 *   - Chaque ligne de devis → une tâche
 *   - Le coût de revient (unit_job_costing × quantité) → cout de la tâche
 *   - La marge = montant_ht − coût_revient
 *   - Le temps alloué = marge ÷ taux horaire (83 € par défaut)
 */

import type { AxonautQuotation, AxonautQuotationItem, AxonautInvoiceCreate } from "./axonaut";
import type { Projet, Tache, ProjetStatut, TacheStatut } from "./mock-data";

const TAUX_HORAIRE_DEFAULT = Number(process.env.NEXT_PUBLIC_TAUX_HORAIRE_REFERENCE ?? "83");

/** Convertit un devis Axonaut en projet CRM. */
export function quotationToProjet(q: AxonautQuotation, taux = TAUX_HORAIRE_DEFAULT): Projet {
  const taches: Tache[] = (q.quotation_lines ?? []).map((line, index) => lineToTache(line, q.id * 1000 + index, taux));

  const montantHT = q.pre_tax_amount ?? 0;
  const coutRevient = taches.reduce((s, t) => s + t.cout, 0);

  return {
    id: q.id,
    nom: q.title ?? `Devis ${q.number}`,
    client: q.company?.name ?? "Client inconnu",
    type: "Standard",
    montantHT,
    coutRevient,
    statut: mapQuotationStatus(q.status),
    taches,
  };
}

function lineToTache(line: AxonautQuotationItem, taskId: number, taux: number): Tache {
  const quantity = line.quantity ?? 1;
  const montant = line.pre_tax_amount ?? 0;
  const cout = (line.unit_job_costing ?? 0) * quantity;
  const marge = Math.max(montant - cout, 0);
  const tempsAlloue = taux > 0 ? Number((marge / taux).toFixed(1)) : 0;

  return {
    id: taskId,
    nom: line.product_name || "Tâche",
    statut: "Brief" as TacheStatut,
    collab: null,
    tempsAlloue,
    tempsConsomme: 0,
    montant,
    cout,
  };
}

function mapQuotationStatus(status: string): ProjetStatut {
  switch (status) {
    case "validated":
    case "accepted":
      return "À affecter";
    case "in_progress":
      return "En production";
    default:
      return "À affecter";
  }
}

/** Construit le payload Axonaut pour créer une facture à partir d'une tâche. */
export function buildInvoicePayload(input: {
  companyId: number;
  taskName: string;
  projetName: string;
  pourcentage: 30 | 50 | 100;
  montantTotalHT: number;
  dejaFacturé: number;
  taxRate?: number;
}): AxonautInvoiceCreate {
  const { companyId, taskName, projetName, pourcentage, montantTotalHT, dejaFacturé, taxRate } = input;

  // Montant à facturer = (% × total) − déjà facturé
  const cible = (montantTotalHT * pourcentage) / 100;
  const montant = Math.max(0, cible - dejaFacturé);

  return {
    company_id: companyId,
    title: `${projetName} — ${taskName} (${pourcentage}%)`,
    date: new Date().toISOString().slice(0, 10),
    invoice_lines: [
      {
        product_name: `${taskName} (${pourcentage}%)`,
        product_description: `Facturation à ${pourcentage}% du projet ${projetName}`,
        quantity: 1,
        pre_tax_unit_amount: Math.round(montant * 100) / 100,
        tax_rate: taxRate ?? 20,
      },
    ],
  };
}
