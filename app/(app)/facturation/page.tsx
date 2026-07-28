"use client";

import BillingRequestsTab from "@/components/BillingRequestsTab";
import { typography } from "@/lib/typography";

/**
 * Page Facturation — centralise les demandes de facturation envoyées par
 * les collaborateurs depuis leurs tâches. La facture elle-même se fait
 * dans Axonaut, pas ici (voir components/BillingRequestsTab.tsx).
 * Garde d'accès : app/(app)/facturation/layout.tsx (Server Component).
 */
export default function FacturationPage() {
  return (
    <div className="animate-fadeIn">
      <h1 style={{ ...typography.pageTitle, margin: "0 0 20px" }}>Facturation</h1>

      <BillingRequestsTab />
    </div>
  );
}
