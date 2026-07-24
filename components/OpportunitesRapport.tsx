"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  STATUT_LABELS, STATUT_COLORS,
  type Opportunite,
} from "@/lib/opportunites-types";

/**
 * Bloc Opportunités à intégrer dans la page Rapports.
 * - Total / pipeline / gagnées / perdues
 * - Top 5 opportunités du moment (par montant)
 * - Performance par commercial (gagnées / perdues / taux conversion)
 */

export default function OpportunitesRapport() {
  const { canSeeMoney } = useAuth();
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/opportunites", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOpportunites(data.opportunites ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (error) {
    return (
      <section style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, padding: 20, marginTop: 20,
        color: COLORS.grisMoyen, fontSize: 14, fontStyle: "italic", textAlign: "center",
      }}>
        Module Opportunités non disponible : {error}
      </section>
    );
  }

  const totaux = {
    total: opportunites.length,
    enCours: opportunites.filter((o) => ["demande", "contacte", "devis"].includes(o.statut)).length,
    gagnees: opportunites.filter((o) => o.statut === "gagne").length,
    perdues: opportunites.filter((o) => o.statut === "perdu").length,
  };

  const pipeline = opportunites
    .filter((o) => ["demande", "contacte", "devis"].includes(o.statut))
    .reduce((s, o) => s + (o.montant_estime ?? 0), 0);
  const ca_gagne = opportunites
    .filter((o) => o.statut === "gagne")
    .reduce((s, o) => s + (o.montant_estime ?? 0), 0);

  // Top 5 par montant (en cours uniquement)
  const top5 = [...opportunites]
    .filter((o) => ["demande", "contacte", "devis"].includes(o.statut))
    .filter((o) => o.montant_estime && o.montant_estime > 0)
    .sort((a, b) => (b.montant_estime ?? 0) - (a.montant_estime ?? 0))
    .slice(0, 5);

  // Stats par commercial
  const parCommercial: Record<string, { nom: string; gagne: number; perdu: number; encours: number; ca: number }> = {};
  for (const o of opportunites) {
    const nom = o.commercial?.nom ?? "?";
    if (!parCommercial[nom]) {
      parCommercial[nom] = { nom, gagne: 0, perdu: 0, encours: 0, ca: 0 };
    }
    if (o.statut === "gagne") {
      parCommercial[nom].gagne++;
      parCommercial[nom].ca += o.montant_estime ?? 0;
    } else if (o.statut === "perdu") {
      parCommercial[nom].perdu++;
    } else {
      parCommercial[nom].encours++;
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{
        fontFamily: "var(--font-dm-serif-display), Georgia, serif",
        fontSize: 22, color: COLORS.noir, margin: "0 0 14px", fontWeight: 400,
      }}>★ Opportunités commerciales</h2>

      {/* KPI */}
      <div className="grid-kpi-4" style={{ marginBottom: 20 }}>
        <KpiBox label="Total" value={totaux.total} />
        <KpiBox label="En cours" value={totaux.enCours} sub={canSeeMoney && pipeline > 0 ? `${(pipeline / 1000).toFixed(1)}k€ pipeline` : undefined} color={COLORS.bleu} />
        <KpiBox label="Gagnées" value={totaux.gagnees} sub={canSeeMoney && ca_gagne > 0 ? `${(ca_gagne / 1000).toFixed(1)}k€ remportés` : undefined} color={COLORS.vert} />
        <KpiBox label="Perdues" value={totaux.perdues} color={COLORS.rouge} />
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <div style={{
          background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
          borderRadius: 14, padding: 18, marginBottom: 20,
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 16, color: COLORS.noir, margin: "0 0 10px", fontWeight: 400,
          }}>Top {top5.length} opportunités en cours (par montant estimé)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                <th style={thStyle}>Titre</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Commercial</th>
                <th style={thStyle}>Statut</th>
                {canSeeMoney && <th style={{ ...thStyle, textAlign: "right" }}>Montant</th>}
              </tr>
            </thead>
            <tbody>
              {top5.map((o) => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                  <td style={tdStyle}><strong>{o.titre}</strong></td>
                  <td style={tdStyle}>{o.client?.nom ?? "—"}</td>
                  <td style={tdStyle}>{o.commercial?.nom ?? "—"}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: STATUT_COLORS[o.statut].bg,
                      color: STATUT_COLORS[o.statut].color,
                    }}>{STATUT_LABELS[o.statut]}</span>
                  </td>
                  {canSeeMoney && (
                    <td style={{ ...tdStyle, textAlign: "right", color: COLORS.dore, fontWeight: 700 }}>
                      {(o.montant_estime ?? 0).toLocaleString("fr-FR")} €
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Performance par commercial */}
      {Object.values(parCommercial).length > 0 && (
        <div style={{
          background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
          borderRadius: 14, padding: 18,
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 16, color: COLORS.noir, margin: "0 0 10px", fontWeight: 400,
          }}>Performance par commercial</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                <th style={thStyle}>Commercial</th>
                <th style={{ ...thStyle, textAlign: "center" }}>En cours</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Gagnées</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Perdues</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Taux conversion</th>
                {canSeeMoney && <th style={{ ...thStyle, textAlign: "right" }}>CA gagné</th>}
              </tr>
            </thead>
            <tbody>
              {Object.values(parCommercial).map((s) => {
                const decided = s.gagne + s.perdu;
                const taux = decided > 0 ? Math.round((s.gagne / decided) * 100) : 0;
                return (
                  <tr key={s.nom} style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                    <td style={tdStyle}><strong>{s.nom}</strong></td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{s.encours}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: COLORS.vert, fontWeight: 700 }}>{s.gagne}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: COLORS.rouge, fontWeight: 700 }}>{s.perdu}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: taux >= 50 ? COLORS.vert : COLORS.orange }}>
                      {decided > 0 ? `${taux}%` : "—"}
                    </td>
                    {canSeeMoney && (
                      <td style={{ ...tdStyle, textAlign: "right", color: COLORS.dore, fontWeight: 700 }}>
                        {s.ca.toLocaleString("fr-FR")} €
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KpiBox({
  label, value, sub, color,
}: {
  label: string; value: number; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{
        fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase",
        letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 700, color: color ?? COLORS.noir,
        fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px", textAlign: "left",
  fontSize: 12, fontWeight: 700, color: COLORS.grisMoyen,
  textTransform: "uppercase", letterSpacing: 0.5,
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px", fontSize: 14, color: COLORS.noir,
};
