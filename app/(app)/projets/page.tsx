"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import type { AxonautQuotation } from "@/lib/axonaut";

/**
 * Page Projets — affiche les devis Axonaut "validated" et "accepted"
 * comme projets en cours de production.
 *
 * Lecture directe Axonaut. Les tâches/timer/BAT sont gérés ailleurs (Kanban).
 */

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:       { label: "Brouillon",      bg: "#ECEFF1",       color: "#546E7A" },
  sent:        { label: "Envoyé client",  bg: "#E1F5FE",       color: "#0277BD" },
  validated:   { label: "Validé",         bg: COLORS.dorePale, color: COLORS.dore },
  accepted:    { label: "Accepté",        bg: COLORS.vertBg,   color: COLORS.vert },
  refused:     { label: "Refusé",         bg: COLORS.rougeBg,  color: COLORS.rouge },
  in_progress: { label: "En production",  bg: COLORS.vertBg,   color: COLORS.vert },
};

const PROJET_STATUSES = ["validated", "accepted", "in_progress"];

export default function ProjetsPage() {
  const { canSeeMoney } = useAuth();
  const [quotations, setQuotations] = useState<AxonautQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    loadQuotations();
  }, []);

  async function loadQuotations() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/axonaut/quotations", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Chargement impossible");
      setQuotations(data.quotations ?? []);
      setSyncedAt(data.synced_at ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // Par défaut on affiche que les devis validés/acceptés/en prod ; sinon tous
  const filtered = quotations
    .filter((q) => showAll || PROJET_STATUSES.includes(q.status))
    .filter((q) =>
      !search ||
      `${q.title ?? ""} ${q.number} ${q.company?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const totalCA   = filtered.reduce((s, q) => s + (q.pre_tax_amount ?? 0), 0);
  const totalEnCours = filtered.filter((q) => PROJET_STATUSES.includes(q.status)).length;

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Projets</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Devis Axonaut validés / acceptés · {filtered.length} projet{filtered.length > 1 ? "s" : ""}
            {syncedAt && (
              <span style={{ marginLeft: 8, fontSize: 11 }}>
                · maj {new Date(syncedAt).toLocaleTimeString("fr-FR")}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadQuotations}
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

      {canSeeMoney && (
        <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
          <Kpi label="Projets actifs"  value={String(totalEnCours)} accent />
          <Kpi label="CA en cours"     value={`${(totalCA / 1000).toFixed(1)}k€`} color={COLORS.dore} />
          <Kpi label="Total devis"     value={String(quotations.length)} sub="tout statut confondu" />
          <Kpi label="Acceptés"        value={String(quotations.filter((q) => q.status === "accepted").length)} color={COLORS.vert} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "10px 14px",
        marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (numéro, titre, client)…"
          style={{
            flex: 1, minWidth: 220, padding: "6px 10px",
            border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
            fontSize: 12, outline: "none",
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.grisMoyen, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            style={{ accentColor: COLORS.dore }}
          />
          Voir TOUS les devis (incluant brouillons / refusés)
        </label>
      </div>

      {/* Liste */}
      <div className="responsive-table-wrapper" style={{
        background: COLORS.blanc, borderRadius: 16,
        border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: canSeeMoney
            ? "1fr 2fr 1.5fr 1fr 1fr 1fr"
            : "1fr 2fr 1.5fr 1fr 1fr",
          padding: "10px 16px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>N° devis</div>
          <div>Titre</div>
          <div>Client</div>
          <div style={{ textAlign: "center" }}>Date</div>
          {canSeeMoney && <div style={{ textAlign: "right" }}>Montant HT</div>}
          <div style={{ textAlign: "center" }}>Statut</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen }}>
            Chargement des devis Axonaut…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen, fontStyle: "italic" }}>
            {quotations.length === 0
              ? "Aucun devis dans Axonaut."
              : "Aucun projet dans cette sélection. Cochez 'Voir TOUS les devis' pour les afficher tous."}
          </div>
        ) : (
          filtered.map((q) => {
            const status = STATUS_LABELS[q.status] ?? { label: q.status, bg: "#ECEFF1", color: "#546E7A" };
            return (
              <div key={q.id} style={{
                display: "grid",
                gridTemplateColumns: canSeeMoney
                  ? "1fr 2fr 1.5fr 1fr 1fr 1fr"
                  : "1fr 2fr 1.5fr 1fr 1fr",
                padding: "12px 16px", borderBottom: `1px solid ${COLORS.grisBorder}`,
                alignItems: "center", fontSize: 13,
              }}>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.grisMoyen }}>
                  #{q.number}
                </div>
                <div style={{ fontWeight: 600, color: COLORS.noir }}>{q.title || "(sans titre)"}</div>
                <div>{q.company?.name ?? "—"}</div>
                <div style={{ textAlign: "center", fontSize: 12, color: COLORS.grisMoyen }}>
                  {q.date ? new Date(q.date).toLocaleDateString("fr-FR") : "—"}
                </div>
                {canSeeMoney && (
                  <div style={{ textAlign: "right", fontWeight: 700, color: COLORS.noir }}>
                    {q.pre_tax_amount.toLocaleString("fr-FR")} €
                  </div>
                )}
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
        Lecture directe Axonaut · les tâches de production sont dans le Kanban.
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
