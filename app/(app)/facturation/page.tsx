"use client";

import { useAuth } from "@/lib/auth-context";
import AccessDenied from "@/components/AccessDenied";
import BillingRequestsTab from "@/components/BillingRequestsTab";
import { typography } from "@/lib/typography";

/**
 * Page Facturation — centralise les demandes de facturation envoyées par
 * les collaborateurs depuis leurs tâches. La facture elle-même se fait
 * dans Axonaut, pas ici (voir components/BillingRequestsTab.tsx).
 */
export default function FacturationPage() {
  const { currentUser, canSeeMoney } = useAuth();

  if (!canSeeMoney) {
    return (
      <AccessDenied
        message="La facturation est réservée à la Direction et aux Admins."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  return (
    <div className="animate-fadeIn">
      <h1 style={{ ...typography.pageTitle, margin: "0 0 20px" }}>Facturation</h1>

      <BillingRequestsTab />
    </div>
  );
}
