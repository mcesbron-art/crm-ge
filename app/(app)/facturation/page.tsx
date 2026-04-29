"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import AccessDenied from "@/components/AccessDenied";
import type { AxonautInvoice } from "@/lib/axonaut";

/**
 * Page Facturation — affiche les VRAIES factures Axonaut en lecture directe.
 */

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Brouillon",     bg: "#ECEFF1",       color: "#546E7A" },
  sent:      { label: "Envoyée",       bg: COLORS.orangeBg, color: COLORS.orange },
  paid:      { label: "✓ Payée",       bg: COLORS.vertBg,   color: COLORS.vert },
  late:      { label: "⚠ En retard",   bg: COLORS.rougeBg,  color: COLORS.rouge },
  cancelled: { label: "Annulée",       bg: "#ECEFF1",       color: "#90A4AE" },
};

export default function FacturationPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const [invoices, setInvoices] = useState<AxonautInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  if (!canSeeMoney) {
    return (
      <AccessDenied
        message="La facturation est réservée à la Direction et aux Admins."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/axonaut/invoices", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Chargement impossible");
      setInvoices(data.invoices ?? []);
      setSyncedAt(data.synced_at ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // Filtres
  const filtered = invoices.filter((inv) => {
    if (search && !`${inv.title ?? ""} ${inv.number} ${inv.company?.name ?? ""}`
      .toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && inv.status !== statusFilter) return false;
    return true;
  });

  // KPIs
  const totalHT      = filtered.reduce((s, i) => s + (i.pre_tax_amount ?? 0), 0);
  const totalPaye    = filtered.filter((i) => i.status === "paid").reduce((s, i) => s + i.pre_tax_amount, 0);
  const totalImpaye  = filtered.filter((i) => ["sent", "late"].includes(i.status)).reduce((s, i) => s + i.pre_tax_amount, 0);
  const totalRetard  = filtered.filter((i) => i.status === "late").reduce((s, i) => s + i.pre_tax_amount, 0);

  const statusOptions = [...new Set(invoices.map((i) => i.status))];

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Facturation</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Données live depuis Axonaut · {invoices.length} facture{invoices.length > 1 ? "s" : ""}
            {syncedAt && (
              <span style={{ marginLeft: 8, fontSize: 11 }}>
                · maj {new Date(syncedAt).toLocaleTimeString("fr-FR")}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadInvoices}
          disabled={loading}
          style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.grisBorder}`,
            background: COLORS.blanc, color: COLORS.noir, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >{loading ? "Chargement…" : "↻ Rafraîchir"}</button>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", marginBottom: 16,
          background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
          borderRadius: 10, color: COLORS.rouge, fontSize: 13, fontWeight: 600,
        }}>
          {error}
          <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>
            Vérifiez que <code>AXONAUT_API_KEY</code> est bien configurée dans Vercel + redéployé.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
        <Kpi label="Total facturé" value={`${(totalHT / 1000).toFixed(1)}k€`} sub={`${filtered.length} factures HT`} accent />
        <Kpi label="Payées"        value={`${(totalPaye / 1000).toFixed(1)}k€`}   color={COLORS.vert} />
        <Kpi label="Impayées"      value={`${(totalImpaye / 1000).toFixed(1)}k€`} color={COLORS.orange} />
        <Kpi label="En retard"     value={`${(totalRetard / 1000).toFixed(1)}k€`} color={COLORS.rouge} />
      </div>

      {/* Filtres */}
      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "10px 14px",
        marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (numéro, client…)"
          style={{
            flex: 1, minWidth: 200, padding: "6px 10px",
            border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
            fontSize: 12, outline: "none",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "6px 10px", borderRadius: 6,
            border: `1px solid ${COLORS.grisBorder}`, fontSize: 12,
            background: COLORS.blanc, cursor: "pointer",
          }}
        >
          <option value="">Tous statuts</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]?.label ?? s}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      <div className="responsive-table-wrapper" style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr 1fr 1fr",
          padding: "10px 16px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>Numéro</div>
          <div>Titre</div>
          <div>Client</div>
          <div style={{ textAlign: "right" }}>Montant HT</div>
          <div style={{ textAlign: "center" }}>Statut</div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen }}>
            Chargement des factures Axonaut…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen, fontStyle: "italic" }}>
            {invoices.length === 0
              ? "Aucune facture dans Axonaut."
              : "Aucune facture ne correspond aux filtres."}
          </div>
        ) : (
          filtered.map((inv) => {
            const status = STATUS_LABELS[inv.status] ?? { label: inv.status, bg: "#ECEFF1", color: "#546E7A" };
            return (
              <div key={inv.id} style={{
                display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr 1fr 1fr",
                padding: "12px 16px", borderBottom: `1px solid ${COLORS.grisBorder}`,
                alignItems: "center", fontSize: 13,
              }}>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.grisMoyen }}>
                  #{inv.number}
                </div>
                <div style={{ fontWeight: 600, color: COLORS.noir }}>
                  {inv.title || "(sans titre)"}
                  {inv.date && (
                    <div style={{ fontSize: 10, color: COLORS.grisMoyen, fontWeight: 400, marginTop: 2 }}>
                      {new Date(inv.date).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
                <div style={{ color: COLORS.noir }}>
                  {inv.company?.name ?? "—"}
                </div>
                <div style={{ textAlign: "right", fontWeight: 700, color: COLORS.noir }}>
                  {inv.pre_tax_amount.toLocaleString("fr-FR")} €
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                    background: status.bg, color: status.color,
                  }}>{status.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: COLORS.grisMoyen, textAlign: "center", fontStyle: "italic" }}>
        Lecture directe Axonaut · pour facturer un palier, utilisez le module dédié dans la fiche projet.
      </p>
    </div>
  );
}

function Kpi({
  label, value, sub, accent, color,
}: {
  label: string; value: string; sub?: string;
  accent?: boolean; color?: string;
}) {
  return (
    <div style={{
      background: accent ? COLORS.noir : COLORS.blanc,
      border: accent ? "none" : `1px solid ${COLORS.grisBorder}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{
        fontSize: 11, color: accent ? "#888" : COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: accent ? COLORS.dore : color ?? COLORS.noir,
        fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent ? "#666" : COLORS.grisMoyen, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
