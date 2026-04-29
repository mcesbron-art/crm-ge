"use client";

import { useState } from "react";
import StatutBadge from "@/components/ui/StatutBadge";
import { PROJETS, COLORS, type Projet } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import AccessDenied from "@/components/AccessDenied";

type Facture = {
  id: number;
  projetId: number;
  palier: 30 | 50 | 100;
  montant: number;
  date: string;
  envoye: boolean;
  /** Si la facture a été créée dans Axonaut, on garde son ID + statut. */
  axonautId?: number;
  axonautNumber?: string;
  axonautStatus?: string;       // "draft" | "sent" | "paid" | "late" | ...
  axonautError?: string;
};

const INITIAL_FACTURES: Facture[] = [
  { id: 1, projetId: 4, palier: 30,  montant: 3600,  date: "2026-02-15", envoye: true  },
  { id: 2, projetId: 4, palier: 50,  montant: 6000,  date: "2026-03-08", envoye: true  },
  { id: 3, projetId: 1, palier: 30,  montant: 2550,  date: "2026-03-01", envoye: true  },
  { id: 4, projetId: 2, palier: 50,  montant: 3100,  date: "2026-03-10", envoye: false },
];

export default function FacturationPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const [factures, setFactures] = useState<Facture[]>(INITIAL_FACTURES);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [palierToInvoice, setPalierToInvoice] = useState<30 | 50 | 100>(30);
  const [useAxonaut, setUseAxonaut] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  if (!canSeeMoney) {
    return (
      <AccessDenied
        message="La facturation est réservée à la Direction et aux Admins."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  const facturer = async (projetId: number, palier: 30 | 50 | 100) => {
    const projet = PROJETS.find((p) => p.id === projetId);
    if (!projet) return;
    const dejaFacture = factures
      .filter((f) => f.projetId === projetId)
      .reduce((s, f) => s + f.montant, 0);
    const cible = (projet.montantHT * palier) / 100;
    const reste = Math.max(0, cible - dejaFacture);
    if (reste <= 0) return;

    setSubmitError(null);
    setSubmitting(true);

    let axonautId: number | undefined;
    let axonautNumber: string | undefined;
    let axonautStatus: string | undefined;
    let axonautError: string | undefined;

    if (useAxonaut) {
      try {
        const r = await fetch("/api/axonaut/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // En prod : vrai company_id Axonaut récupéré au sync. Ici on met 1 par défaut.
            companyId: 1,
            taskName: projet.nom,
            projetName: projet.nom,
            pourcentage: palier,
            montantTotalHT: projet.montantHT,
            dejaFacture,
          }),
        });
        const data = await r.json();
        if (data.ok) {
          axonautId = data.invoice?.id;
          axonautNumber = data.invoice?.number;
          axonautStatus = data.invoice?.status;
        } else {
          axonautError = data.error ?? "Erreur Axonaut";
          // On crée quand même la facture locale (brouillon) — la Direction peut réessayer
        }
      } catch (e) {
        axonautError = e instanceof Error ? e.message : "Erreur réseau";
      }
    }

    const newFacture: Facture = {
      id: Date.now(),
      projetId,
      palier,
      montant: Math.round(reste),
      date: new Date().toISOString().slice(0, 10),
      envoye: !!axonautId, // si Axonaut a accepté, on considère "envoyée"
      axonautId,
      axonautNumber,
      axonautStatus,
      axonautError,
    };
    setFactures((prev) => [...prev, newFacture]);
    setSelectedProjet(null);
    setSubmitting(false);
  };

  /** Rafraîchit le statut d'une facture depuis Axonaut (GET /api/axonaut/invoice?id=…). */
  const refreshAxonautStatus = async (factureId: number) => {
    const facture = factures.find((f) => f.id === factureId);
    if (!facture?.axonautId) return;
    setRefreshingId(factureId);
    try {
      const r = await fetch(`/api/axonaut/invoice?id=${facture.axonautId}`, { cache: "no-store" });
      const data = await r.json();
      if (data.ok) {
        setFactures((prev) => prev.map((f) =>
          f.id === factureId
            ? { ...f, axonautStatus: data.invoice.status, axonautNumber: data.invoice.number, envoye: ["sent", "paid"].includes(data.invoice.status) }
            : f
        ));
      }
    } finally {
      setRefreshingId(null);
    }
  };

  // KPIs
  const totalFacture = factures.reduce((s, f) => s + f.montant, 0);
  const totalEnvoye = factures.filter((f) => f.envoye).reduce((s, f) => s + f.montant, 0);
  const totalEnAttente = factures.filter((f) => !f.envoye).reduce((s, f) => s + f.montant, 0);
  const totalAFacturer = PROJETS.reduce((s, p) => s + p.montantHT, 0) - totalFacture;

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
        }}>Facturation</h1>
        <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
          Facturation par paliers (30 / 50 / 100 %) — synchronisation Axonaut à venir
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total facturé",      value: `${(totalFacture / 1000).toFixed(1)}k€`, sub: `${factures.length} factures`, accent: true },
          { label: "Encaissé",            value: `${(totalEnvoye / 1000).toFixed(1)}k€`, sub: "factures envoyées", color: COLORS.vert },
          { label: "En attente d'envoi",  value: `${(totalEnAttente / 1000).toFixed(1)}k€`, sub: `${factures.filter((f) => !f.envoye).length} brouillon(s)`, color: COLORS.orange },
          { label: "Reste à facturer",    value: `${(totalAFacturer / 1000).toFixed(1)}k€`, sub: "montant total disponible", color: COLORS.dore },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.accent ? COLORS.noir : COLORS.blanc,
            borderRadius: 14, padding: "20px",
            border: kpi.accent ? "none" : `1px solid ${COLORS.grisBorder}`,
          }}>
            <div style={{
              fontSize: 11, color: kpi.accent ? "#888" : COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 26, fontWeight: 700,
              color: kpi.color || (kpi.accent ? COLORS.dore : COLORS.noir),
              fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
            }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: kpi.accent ? "#666" : COLORS.grisMoyen, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* PROJETS À FACTURER */}
      <div style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden", marginBottom: 24,
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400,
          }}>Projets à facturer</h3>
          <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{PROJETS.length} projets</span>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr",
          padding: "12px 20px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>Projet</div>
          <div style={{ textAlign: "right" }}>Montant HT</div>
          <div style={{ textAlign: "right" }}>Déjà facturé</div>
          <div style={{ textAlign: "right" }}>Reste</div>
          <div style={{ textAlign: "center" }}>Action</div>
        </div>

        {PROJETS.map((projet) => {
          const dejaFacture = factures
            .filter((f) => f.projetId === projet.id)
            .reduce((s, f) => s + f.montant, 0);
          const reste = projet.montantHT - dejaFacture;
          const pctFacture = Math.round((dejaFacture / projet.montantHT) * 100);

          return (
            <div key={projet.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr",
              alignItems: "center", padding: "16px 20px",
              borderBottom: `1px solid ${COLORS.grisBorder}`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{projet.nom}</div>
                <div style={{ fontSize: 11, color: COLORS.grisMoyen, display: "flex", alignItems: "center", gap: 8 }}>
                  {projet.client}
                  <StatutBadge statut={projet.statut} type="projet" />
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: COLORS.noir }}>
                {projet.montantHT.toLocaleString("fr-FR")} €
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: dejaFacture > 0 ? COLORS.vert : COLORS.grisMoyen }}>
                  {dejaFacture.toLocaleString("fr-FR")} €
                </div>
                <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{pctFacture}%</div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: reste > 0 ? COLORS.dore : COLORS.grisMoyen }}>
                {reste.toLocaleString("fr-FR")} €
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {([30, 50, 100] as const).map((p) => {
                  const cible = (projet.montantHT * p) / 100;
                  const dispo = cible > dejaFacture;
                  return (
                    <button
                      key={p}
                      disabled={!dispo}
                      onClick={() => { setSelectedProjet(projet); setPalierToInvoice(p); }}
                      style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${dispo ? COLORS.dore : COLORS.grisBorder}`,
                        background: dispo ? COLORS.dorePale : COLORS.gris,
                        color: dispo ? COLORS.dore : COLORS.grisMoyen,
                        fontSize: 12, fontWeight: 700, cursor: dispo ? "pointer" : "not-allowed",
                      }}
                    >{p}%</button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* HISTORIQUE FACTURES */}
      <div style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400,
          }}>Historique des factures</h3>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1fr",
          padding: "12px 20px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>Projet</div>
          <div style={{ textAlign: "center" }}>Palier</div>
          <div style={{ textAlign: "right" }}>Montant</div>
          <div style={{ textAlign: "center" }}>Date</div>
          <div style={{ textAlign: "center" }}>Statut</div>
        </div>

        {factures.length === 0 && (
          <div style={{
            padding: "32px 20px", textAlign: "center",
            color: COLORS.grisMoyen, fontStyle: "italic",
          }}>Aucune facture enregistrée.</div>
        )}

        {[...factures].reverse().map((f) => {
          const projet = PROJETS.find((p) => p.id === f.projetId);
          return (
            <div key={f.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1fr",
              alignItems: "center", padding: "14px 20px",
              borderBottom: `1px solid ${COLORS.grisBorder}`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{projet?.nom}</div>
                <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{projet?.client}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 16,
                  background: COLORS.dorePale, color: COLORS.dore,
                  fontSize: 12, fontWeight: 700,
                }}>{f.palier}%</span>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.noir }}>
                {f.montant.toLocaleString("fr-FR")} €
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: COLORS.grisMoyen }}>
                {new Date(f.date).toLocaleDateString("fr-FR")}
              </div>
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <AxonautStatusBadge facture={f} />
                {f.axonautId && (
                  <button
                    onClick={() => refreshAxonautStatus(f.id)}
                    disabled={refreshingId === f.id}
                    title="Récupérer le statut depuis Axonaut"
                    style={{
                      fontSize: 9, padding: "2px 8px", borderRadius: 10,
                      border: `1px solid ${COLORS.grisBorder}`, background: COLORS.blanc,
                      color: COLORS.grisMoyen, cursor: refreshingId === f.id ? "wait" : "pointer",
                      opacity: refreshingId === f.id ? 0.6 : 1,
                    }}
                  >{refreshingId === f.id ? "…" : "↻ Rafraîchir"}</button>
                )}
                {f.axonautError && (
                  <span style={{ fontSize: 9, color: COLORS.rouge, maxWidth: 140 }}>
                    ⚠ Axonaut : {f.axonautError.slice(0, 60)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CONFIRMATION */}
      {selectedProjet && (
        <div
          onClick={() => setSelectedProjet(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.blanc, borderRadius: 16, padding: 28,
              width: 440, boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 22, color: COLORS.noir, margin: "0 0 8px",
            }}>Confirmer la facturation</h2>
            <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: "0 0 20px" }}>
              Facturer <strong style={{ color: COLORS.noir }}>{palierToInvoice}%</strong> du projet
              <strong style={{ color: COLORS.noir }}> « {selectedProjet.nom} »</strong> ?
            </p>

            {(() => {
              const dejaFacture = factures.filter((f) => f.projetId === selectedProjet.id).reduce((s, f) => s + f.montant, 0);
              const cible = (selectedProjet.montantHT * palierToInvoice) / 100;
              const montant = Math.max(0, cible - dejaFacture);
              return (
                <div style={{
                  background: COLORS.gris, borderRadius: 10, padding: 16, marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Montant à facturer</div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, color: COLORS.dore,
                    fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                  }}>{montant.toLocaleString("fr-FR")} €</div>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginTop: 4 }}>
                    Cible {palierToInvoice}% = {cible.toLocaleString("fr-FR")} € — déjà facturé {dejaFacture.toLocaleString("fr-FR")} €
                  </div>
                </div>
              );
            })()}

            {/* Toggle Axonaut */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 12px", marginBottom: 16,
              background: useAxonaut ? COLORS.dorePale : COLORS.gris,
              border: `1px solid ${useAxonaut ? COLORS.dore + "55" : COLORS.grisBorder}`,
              borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={useAxonaut}
                onChange={(e) => setUseAxonaut(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: COLORS.dore, cursor: "pointer" }}
              />
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: useAxonaut ? COLORS.dore : COLORS.noir }}>
                  Créer aussi la facture dans Axonaut
                </div>
                <div style={{ color: COLORS.grisMoyen, marginTop: 2, lineHeight: 1.4 }}>
                  L&apos;API Axonaut est appelée côté serveur. Le statut renvoyé
                  (brouillon / envoyée / payée) sera affiché dans l&apos;historique.
                </div>
              </div>
            </label>

            {submitError && (
              <div style={{
                padding: "10px 12px", marginBottom: 12,
                background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
                borderRadius: 8, color: COLORS.rouge, fontSize: 12, fontWeight: 600,
              }}>{submitError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setSelectedProjet(null)}
                disabled={submitting}
                style={{
                  padding: "10px 18px", background: "transparent",
                  border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: COLORS.grisMoyen, cursor: "pointer",
                  opacity: submitting ? 0.5 : 1,
                }}
              >Annuler</button>
              <button
                onClick={() => facturer(selectedProjet.id, palierToInvoice)}
                disabled={submitting}
                style={{
                  padding: "10px 18px", background: COLORS.noir, border: "none",
                  borderRadius: 8, fontSize: 13, fontWeight: 600, color: COLORS.dore, cursor: "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >{submitting ? "Création…" : "Confirmer la facturation"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pastille de statut affichée dans l'historique des factures.
 * Adapte sa couleur selon le statut Axonaut (ou local si pas synchronisé).
 */
function AxonautStatusBadge({ facture }: { facture: Facture }) {
  // Si pas créée dans Axonaut → fallback sur le statut local (brouillon/envoyée)
  if (!facture.axonautId) {
    if (facture.envoye) {
      return <span style={pillStyle(COLORS.vertBg, COLORS.vert)}>✓ Envoyée</span>;
    }
    return <span style={pillStyle(COLORS.orangeBg, COLORS.orange)}>Brouillon (local)</span>;
  }

  // Statut Axonaut
  const status = facture.axonautStatus ?? "draft";
  const labels: Record<string, { bg: string; color: string; label: string }> = {
    draft:    { bg: "#ECEFF1",       color: "#546E7A",       label: "Brouillon Axonaut" },
    sent:     { bg: COLORS.orangeBg, color: COLORS.orange,   label: "Envoyée" },
    paid:     { bg: COLORS.vertBg,   color: COLORS.vert,     label: "✓ Payée" },
    late:     { bg: COLORS.rougeBg,  color: COLORS.rouge,    label: "En retard" },
    cancelled:{ bg: "#ECEFF1",       color: "#90A4AE",       label: "Annulée" },
  };
  const s = labels[status] ?? { bg: "#ECEFF1", color: "#546E7A", label: status };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={pillStyle(s.bg, s.color)}>{s.label}</span>
      {facture.axonautNumber && (
        <span style={{ fontSize: 9, color: COLORS.grisMoyen, fontFamily: "monospace" }}>
          #{facture.axonautNumber}
        </span>
      )}
    </div>
  );
}

function pillStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 700,
    background: bg, color, whiteSpace: "nowrap",
  };
}
