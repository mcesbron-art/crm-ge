"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import {
  PROJETS,
  COLLABORATEURS,
  getRentabiliteColor,
} from "@/lib/mock-data";

function SimpleLineChart({
  isDark,
  height = 200,
}: {
  isDark: boolean;
  height?: number;
}) {
  const lineColor = isDark ? "#C5A55A" : "#C5A55A";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  return (
    <svg
      width="100%"
      height={height}
      viewBox="0 0 600 200"
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="0" y1="50" x2="600" y2="50" stroke={gridColor} strokeWidth="1" />
      <line x1="0" y1="100" x2="600" y2="100" stroke={gridColor} strokeWidth="1" />
      <line x1="0" y1="150" x2="600" y2="150" stroke={gridColor} strokeWidth="1" />

      <polyline
        points="0,120 75,100 150,95 225,110 300,85 375,75 450,90 525,70 600,65"
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        opacity="0.8"
      />

      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="0,120 75,100 150,95 225,110 300,85 375,75 450,90 525,70 600,65 600,200 0,200"
        fill="url(#areaGradient)"
      />
    </svg>
  );
}

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
  const bgColor = accent
    ? (isDark ? "#C5A55A" : "#F5EDD6")
    : (isDark ? "#1F1F1F" : "#FFFFFF");
  const textColor = accent
    ? (isDark ? "#FFFFFF" : "#8B6914")
    : (isDark ? "#E8E8E8" : "#1A1A1A");
  const labelColor = accent
    ? (isDark ? "rgba(255,255,255,0.8)" : "#8B6914")
    : (isDark ? "#999999" : "#666666");
  const borderColor = isDark ? "#2F2F2F" : "#E8E8E6";

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 12,
        padding: "16px 14px",
        flex: 1,
        minWidth: 120,
        border: `1px solid ${borderColor}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: accent
          ? "0 4px 12px rgba(197, 165, 90, 0.15)"
          : isDark
          ? "0 1px 3px rgba(0,0,0,0.2)"
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: labelColor,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.1,
          fontFamily: "Georgia, serif",
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: labelColor, marginTop: 3, fontWeight: 400 }}>
          {sub}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          fontSize: 18,
          opacity: accent ? 0.2 : 0.08,
          color: textColor,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function DashboardDemo() {
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
      .map((t) => ({ ...t, projet: p.nom }))
  );

  const bgColor = isDark ? "#0A0A0A" : "#FAF9F5";
  const cardBg = isDark ? "#1A1A1A" : "#FFFFFF";
  const textColor = isDark ? "#E8E8E8" : "#1A1A1A";
  const subtextColor = isDark ? "#999999" : "#666666";
  const borderColor = isDark ? "#2F2F2F" : "#E8E8E6";

  return (
    <div
      style={{
        background: bgColor,
        minHeight: "100vh",
        color: textColor,
        transition: "background-color 0.3s ease",
        padding: "24px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          paddingBottom: 16,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 28,
            color: textColor,
            margin: 0,
            fontWeight: 400,
          }}
        >
          Dashboard
        </h1>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              padding: "8px 16px",
              background: isDark ? "#1F1F1F" : "#F5F5F3",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: textColor,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#2F2F2F" : "#E8E8E6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? "#1F1F1F" : "#F5F5F3";
            }}
          >
            {isDark ? "☀️ Mode light" : "🌙 Mode dark"}
          </button>
          <button
            style={{
              padding: "8px 16px",
              background: "#C5A55A",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "#1A1A1A",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(197, 165, 90, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            + Nouveau projet
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="CA en production"
          value={`${(totalCA / 1000).toFixed(1)}k€`}
          sub={`Marge: ${(totalMarge / 1000).toFixed(1)}k€`}
          icon="€"
          accent
          isDark={isDark}
        />
        <KPICard
          label="Marge"
          value={`${(totalMarge / 1000).toFixed(1)}k€`}
          icon="📊"
          isDark={isDark}
        />
        <KPICard
          label="Tâches en cours"
          value={tachesEnCours}
          sub={`sur ${totalTaches}`}
          icon="▶"
          isDark={isDark}
        />
        <KPICard
          label="Alertes"
          value={alertes}
          sub={alertes > 0 ? "À surveiller" : "OK"}
          icon="⚠"
          isDark={isDark}
        />
      </div>

      {/* CHART SECTION */}
      <div
        style={{
          background: cardBg,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          padding: 20,
          marginBottom: 24,
          boxShadow: isDark
            ? "0 2px 8px rgba(0,0,0,0.2)"
            : "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: textColor,
            margin: "0 0 16px",
          }}
        >
          Chiffre d&apos;affaires
        </h3>
        <SimpleLineChart isDark={isDark} height={160} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* ALERTS SECTION */}
        <div>
          {tachesAlerte.length > 0 && (
            <div
              style={{
                background: isDark ? "#2F2515" : "#FFF8F0",
                border: `1px solid ${isDark ? "#4A3420" : "#FFE0B2"}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isDark ? "#FFB366" : "#E65100",
                  marginBottom: 12,
                }}
              >
                ⚠ Prochaines alertes
              </div>
              {tachesAlerte.slice(0, 4).map((t) => {
                const ratio = Math.round(
                  (t.tempsConsomme / t.tempsAlloue) * 100
                );
                const info = getRentabiliteColor(ratio);
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      fontSize: 14,
                      borderBottom: `1px solid ${
                        isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                      }`,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: info.color,
                        minWidth: 35,
                      }}
                    >
                      {ratio}%
                    </span>
                    <span style={{ color: textColor, flex: 1 }}>{t.nom}</span>
                    <span style={{ color: subtextColor, fontSize: 13 }}>
                      {t.projet}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROJETS TABLE */}
          <div
            style={{
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              overflow: "hidden",
              boxShadow: isDark
                ? "0 2px 8px rgba(0,0,0,0.2)"
                : "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
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
                gridTemplateColumns: "2fr 1fr 1fr 1fr 0.8fr",
                padding: "10px 16px",
                background: isDark ? "#141414" : "#F5F5F3",
                borderBottom: `1px solid ${borderColor}`,
                fontSize: 12,
                fontWeight: 600,
                color: subtextColor,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              <div>Projet</div>
              <div>Montant</div>
              <div style={{ textAlign: "right" }}>Temps</div>
              <div style={{ textAlign: "center" }}>Rentabilité</div>
              <div style={{ textAlign: "right" }}>Team</div>
            </div>
            {PROJETS.slice(0, 4).map((p) => {
              const marge = p.montantHT - p.coutRevient;
              const margePercent = Math.round((marge / p.montantHT) * 100);
              const totalAlloue = p.taches.reduce((s, t) => s + t.tempsAlloue, 0);
              const totalConsomme = p.taches.reduce(
                (s, t) => s + t.tempsConsomme,
                0
              );
              const ratioTemps =
                totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0;
              const rentaInfo = getRentabiliteColor(ratioTemps);

              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 0.8fr",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: `1px solid ${borderColor}`,
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark
                      ? "#2F2F2F"
                      : "#F9F9F9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: textColor,
                        fontSize: 14,
                      }}
                    >
                      {p.nom}
                    </div>
                    <div style={{ fontSize: 12, color: subtextColor }}>
                      {p.client}
                    </div>
                  </div>
                  <div style={{ color: textColor }}>
                    {p.montantHT.toLocaleString("fr-FR")} €
                  </div>
                  <div style={{ textAlign: "right", color: textColor }}>
                    {totalConsomme.toFixed(1)}h /{totalAlloue.toFixed(1)}h
                  </div>
                  <div style={{ textAlign: "center", color: rentaInfo.color }}>
                    {margePercent}%
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 2,
                    }}
                  >
                    {[...new Set(p.taches.map((t) => t.collab).filter(Boolean))]
                      .slice(0, 2)
                      .map((cid) => (
                        <Avatar
                          key={cid}
                          collab={COLLABORATEURS.find((c) => c.id === cid)}
                          size={24}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDEBAR - TEAM LOAD */}
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            border: `1px solid ${borderColor}`,
            padding: 16,
            boxShadow: isDark
              ? "0 2px 8px rgba(0,0,0,0.2)"
              : "0 1px 3px rgba(0,0,0,0.06)",
            height: "fit-content",
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: textColor,
              margin: "0 0 12px",
            }}
          >
            Charge équipe
          </h3>
          {COLLABORATEURS.slice(0, 5).map((c) => {
            const taches = PROJETS.flatMap((p) =>
              p.taches.filter((t) => t.collab === c.id)
            );
            const heures = taches.reduce((s, t) => s + t.tempsConsomme, 0);
            const charge = Math.min(Math.round((heures / 35) * 100), 100);
            return (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: textColor,
                    }}
                  >
                    {c.nom}
                  </span>
                  <span style={{ fontSize: 12, color: subtextColor }}>
                    {heures}h/35h
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: isDark ? "#2F2F2F" : "#E5E5E3",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${charge}%`,
                      height: "100%",
                      borderRadius: 2,
                      background:
                        charge > 90
                          ? "#E53935"
                          : charge > 70
                          ? "#FF9800"
                          : "#4CAF50",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
