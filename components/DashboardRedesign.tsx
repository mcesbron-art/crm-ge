"use client";

import { useState } from "react";
import { InteractiveChart } from "@/components/InteractiveChart";
import {
  PROJETS,
  COLLABORATEURS,
  getRentabiliteColor,
} from "@/lib/mock-data";

function KPICard({
  label,
  value,
  sub,
  icon,
  accent = false,
  isDark = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: string;
  accent?: boolean;
  isDark?: boolean;
}) {
  const bgColor = accent ? "#C5A55A" : (isDark ? "#1A1A1A" : "#FFFFFF");
  const textColor = accent ? "#FFFFFF" : (isDark ? "#E8E8E8" : "#1A1A1A");
  const labelColor = accent
    ? "rgba(255,255,255,0.85)"
    : (isDark ? "#999999" : "#666666");
  const borderColor = isDark ? "#2F2F2F" : "#E0E0E0";

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 12,
        padding: "20px 16px",
        border: `1px solid ${accent ? "transparent" : borderColor}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: accent
          ? "0 4px 12px rgba(197, 165, 90, 0.25)"
          : isDark
          ? "0 1px 3px rgba(0,0,0,0.2)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: labelColor,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.1,
            fontFamily: "Georgia, serif",
          }}
        >
          {value}
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: labelColor, marginTop: 4, fontWeight: 400 }}>
          {sub}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          fontSize: 20,
          opacity: accent ? 0.25 : 0.08,
          color: textColor,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function DashboardRedesign() {
  const [isDark, setIsDark] = useState(false);

  const totalCA = PROJETS.reduce((s, p) => s + p.montantHT, 0);
  const totalMarge = PROJETS.reduce((s, p) => s + (p.montantHT - p.coutRevient), 0);
  const totalTaches = PROJETS.reduce((s, p) => s + p.taches.length, 0);
  const tachesEnCours = PROJETS.reduce(
    (s, p) => s + p.taches.filter((t) => t.statut === "En cours").length,
    0
  );
  const alertes = PROJETS.reduce(
    (s, p) =>
      s +
      p.taches.filter(
        (t) => t.tempsAlloue > 0 && t.tempsConsomme / t.tempsAlloue >= 0.75
      ).length,
    0
  );

  const tachesAlerte = PROJETS.flatMap((p) =>
    p.taches
      .filter(
        (t) => t.tempsAlloue > 0 && t.tempsConsomme / t.tempsAlloue >= 0.75
      )
      .map((t, idx) => ({
        ...t,
        projet: p.nom,
        id: `${p.id}-${idx}`,
      }))
  );

  // Colors
  const bgColor = isDark ? "#0A0A0A" : "#FFFFFF";
  const pageContainerBg = isDark ? "#0A0A0A" : "#FFFFFF";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const textColor = isDark ? "#E8E8E8" : "#1A1A1A";
  const subtextColor = isDark ? "#999999" : "#666666";
  const borderColor = isDark ? "#2F2F2F" : "#E0E0E0";
  const sectionBg = isDark ? "#1A1A1A" : "#F9F9F9";

  return (
    <div
      style={{
        background: pageContainerBg,
        minHeight: "100vh",
        color: textColor,
      }}
    >
      {/* TOP HEADER - Vos Direction */}
      <div
        style={{
          background: isDark ? "#1A1A1A" : "#FFFFFF",
          borderBottom: `1px solid ${borderColor}`,
          padding: "12px 0",
          marginBottom: 20,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
          <span style={{ color: "#C5A55A", fontWeight: 700 }}>🔺 Vos Direction</span>
          <span style={{ color: subtextColor }}>accès complet aux montants, marges et rapports</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              padding: "6px 12px",
              background: isDark ? "#2F2F2F" : "#F0F0F0",
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              color: textColor,
              cursor: "pointer",
            }}
          >
            Vos Collaborateur
          </button>
          <button
            style={{
              padding: "6px 12px",
              background: "#000000",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Vos Direction
          </button>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 32,
              color: textColor,
              margin: "0 0 4px",
              fontWeight: 400,
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: subtextColor, fontSize: 12, margin: 0 }}>
            Semaine du 10 au 16 mars 2026
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{
              padding: "8px 14px",
              background: isDark ? "#1F1F1F" : "#F0F0F0",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: textColor,
              cursor: "pointer",
            }}
          >
            📥 Exporter PDF
          </button>
          <button
            style={{
              padding: "8px 14px",
              background: "#C5A55A",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#1A1A1A",
              cursor: "pointer",
            }}
          >
            + Nouveau projet
          </button>
        </div>
      </div>

      {/* KPI ROW - 4 CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Projets actifs"
          value={PROJETS.filter((p) => p.statut !== "Clôturé").length}
          sub={`${totalTaches} tâches au total`}
          icon="▣"
          accent
          isDark={isDark}
        />
        <KPICard
          label="CA en production"
          value={`${(totalCA / 1000).toFixed(1)}k€`}
          sub={`+12.4% Marge 25.4€`}
          icon="€"
          isDark={isDark}
        />
        <KPICard
          label="Tâches en cours"
          value={tachesEnCours}
          sub={`sur ${totalTaches} tâches`}
          icon="▶"
          isDark={isDark}
        />
        <KPICard
          label="Alertes rentabilité"
          value={alertes}
          sub={`à surveiller temps de prod.`}
          icon="⚠"
          isDark={isDark}
        />
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* LEFT COLUMN */}
        <div>
          {/* CA SECTION */}
          <div
            style={{
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: textColor,
                    margin: "0 0 8px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  CA EN PRODUCTION
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#C5A55A", fontWeight: 600 }}>
                    🔺 Cet période
                  </span>
                  <span style={{ color: subtextColor }}>Période précédente</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#C5A55A",
                }}
              >
                34.7 k€
              </span>
            </div>
            <div style={{ height: "180px" }}>
              <InteractiveChart isDark={isDark} height={180} />
            </div>
          </div>

          {/* ALERTES SECTION */}
          <div
            style={{
              background: isDark ? "#2F2515" : "#FFF8F0",
              borderRadius: 12,
              border: `1px solid ${isDark ? "#4A3420" : "#FFE0B2"}`,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? "#FFB366" : "#E65100",
                marginBottom: 12,
              }}
            >
              ⚠ Alertes temps de production
            </div>
            {tachesAlerte.slice(0, 5).map((t, idx) => {
              const ratio = Math.round(
                (t.tempsConsomme / t.tempsAlloue) * 100
              );
              const info = getRentabiliteColor(ratio);
              const colors = ["#6366F1", "#EC4899", "#10B981", "#8B5CF6", "#F59E0B"];
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    fontSize: 12,
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: info.color,
                      minWidth: 30,
                    }}
                  >
                    {ratio}%
                  </span>
                  <span style={{ color: textColor, flex: 1 }}>
                    {t.nom.substring(0, 30)}
                  </span>
                  <span style={{ color: subtextColor, fontSize: 11 }}>
                    — {t.projet}
                  </span>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: colors[idx % colors.length],
                      flexShrink: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* PROJETS SECTION */}
          <div
            style={{
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}` }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: textColor,
                  margin: 0,
                }}
              >
                Projets en cours
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "10px 16px",
                background: sectionBg,
                borderBottom: `1px solid ${borderColor}`,
                fontSize: 10,
                fontWeight: 600,
                color: subtextColor,
                textTransform: "uppercase",
              }}
            >
              <div>Projet</div>
              <div style={{ textAlign: "right" }}>Montant</div>
              <div style={{ textAlign: "right" }}>Temps</div>
              <div style={{ textAlign: "right" }}>Rentabilité</div>
            </div>
            {PROJETS.slice(0, 5).map((p) => {
              const marge = p.montantHT - p.coutRevient;
              const margePercent = Math.round((marge / p.montantHT) * 100);
              const totalAlloue = p.taches.reduce((s, t) => s + t.tempsAlloue, 0);
              const totalConsomme = p.taches.reduce(
                (s, t) => s + t.tempsConsomme,
                0
              );

              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: `1px solid ${borderColor}`,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: textColor }}>
                      {p.nom}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: subtextColor,
                      }}
                    >
                      {p.client}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: textColor,
                    }}
                  >
                    {p.montantHT.toLocaleString("fr-FR")} €
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: textColor,
                    }}
                  >
                    {totalConsomme}h / {totalAlloue}h
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: "#C5A55A",
                      fontWeight: 600,
                    }}
                  >
                    {margePercent}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN - OPPORTUNITIES */}
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            border: `1px solid ${borderColor}`,
            padding: 20,
            height: "fit-content",
          }}
        >
          <h3
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: textColor,
              margin: "0 0 16px",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Opportunités
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Devis envoyés", value: 24, percentage: 90 },
              { label: "Devis signés", value: 16, percentage: 65 },
              { label: "Devis signés", value: 9, percentage: 35 },
              { label: "En production", value: 5, percentage: 20 },
              { label: "Facturés", value: 3, percentage: 12 },
            ].map((item, idx) => (
              <div key={idx}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, color: subtextColor }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
                    {item.value}
                  </span>
                </div>
                <div
                  style={{
                    height: "4px",
                    background: isDark ? "#2F2F2F" : "#E5E5E3",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      height: "100%",
                      background: "#C5A55A",
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Dark Mode Button - Floating */}
      <button
        onClick={() => setIsDark(!isDark)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: isDark ? "#FFC107" : "#1A1A1A",
          border: "none",
          color: isDark ? "#1A1A1A" : "#FFFFFF",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
        }}
        title={isDark ? "Mode light" : "Mode dark"}
      >
        {isDark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
