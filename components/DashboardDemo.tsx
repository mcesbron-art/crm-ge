"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import StatutBadge from "@/components/ui/StatutBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  PROJETS,
  COLLABORATEURS,
  getRentabiliteColor,
  type Projet,
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
        borderRadius: 16,
        padding: "28px 24px",
        flex: 1,
        minWidth: 200,
        border: `1px solid ${borderColor}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: accent
          ? "0 8px 24px rgba(197, 165, 90, 0.15)"
          : isDark
          ? "0 2px 8px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: labelColor,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 14,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.1,
          fontFamily: "Georgia, serif",
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: labelColor, marginTop: 6, fontWeight: 400 }}>
          {sub}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          fontSize: 32,
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
  const canSeeMoney = true;

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

  // Colors based on theme
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
        padding: "32px 32px 64px",
      }}
    >
      <div className="animate-fadeIn">
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 40,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 36,
                color: textColor,
                margin: "0 0 8px",
                fontWeight: 400,
              }}
            >
              Dashboard
            </h1>
            <p style={{ color: subtextColor, fontSize: 14, margin: 0 }}>
              Semaine du 10 au 16 mars 2026
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                padding: "10px 20px",
                background: isDark ? "#1F1F1F" : "#F5F5F3",
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                fontSize: 13,
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
              {isDark ? "☀️ Mode clair" : "🌙 Mode sombre"}
            </button>
            <button
              style={{
                padding: "10px 20px",
                background: "#C5A55A",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1A1A",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(197, 165, 90, 0.2)";
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

        {/* KPI CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginBottom: 40,
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
            sub={`Marge: ${(totalMarge / 1000).toFixed(1)}k€`}
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
            sub={alertes > 0 ? "Tâches à surveiller" : "Tout est OK"}
            icon="⚠"
            isDark={isDark}
          />
        </div>

        {/* ALERTS */}
        {tachesAlerte.length > 0 && (
          <div
            style={{
              background: isDark ? "#2F2515" : "#FFF8F0",
              border: `1px solid ${isDark ? "#4A3420" : "#FFE0B2"}`,
              borderRadius: 16,
              padding: "20px 24px",
              marginBottom: 32,
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
              ⚠ Alertes temps de production
            </div>
            {tachesAlerte.slice(0, 3).map((t) => {
              const ratio = Math.round((t.tempsConsomme / t.tempsAlloue) * 100);
              const info = getRentabiliteColor(ratio);
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, color: info.color, minWidth: 40 }}>
                    {ratio}%
                  </span>
                  <span style={{ color: textColor, fontWeight: 500, flex: 1 }}>
                    {t.nom}
                  </span>
                  <span style={{ color: subtextColor }}>— {t.projet}</span>
                  <Avatar
                    collab={COLLABORATEURS.find((c) => c.id === t.collab)}
                    size={22}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* PROJETS TABLE */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            border: `1px solid ${borderColor}`,
            overflow: "hidden",
            marginBottom: 32,
            boxShadow: isDark
              ? "0 4px 12px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 24px",
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                color: textColor,
                margin: 0,
                fontWeight: 400,
              }}
            >
              Projets en cours
            </h3>
            <span style={{ fontSize: 12, color: subtextColor }}>
              {PROJETS.length} projets
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr",
              padding: "12px 24px",
              background: isDark ? "#141414" : "#F5F5F3",
              borderBottom: `1px solid ${borderColor}`,
              fontSize: 11,
              fontWeight: 600,
              color: subtextColor,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <div>Projet</div>
            <div>Statut</div>
            <div style={{ textAlign: "right" }}>Montant</div>
            <div style={{ textAlign: "right" }}>Temps</div>
            <div style={{ paddingLeft: 8 }}>Rentabilité</div>
            <div style={{ textAlign: "right" }}>Équipe</div>
          </div>
          {PROJETS.slice(0, 5).map((p) => {
            const marge = p.montantHT - p.coutRevient;
            const margePercent = Math.round((marge / p.montantHT) * 100);
            const totalAlloue = p.taches.reduce((s, t) => s + t.tempsAlloue, 0);
            const totalConsomme = p.taches.reduce((s, t) => s + t.tempsConsomme, 0);
            const ratioTemps = totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0;
            const rentaInfo = getRentabiliteColor(ratioTemps);

            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom: `1px solid ${borderColor}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "#2F2F2F" : "#F5F5F3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: textColor, fontSize: 14, marginBottom: 2 }}>
                    {p.nom}
                  </div>
                  <div style={{ fontSize: 12, color: subtextColor }}>
                    {p.client}
                  </div>
                </div>
                <div>
                  <StatutBadge statut={p.statut} type="projet" />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: textColor, fontSize: 14 }}>
                    {p.montantHT.toLocaleString("fr-FR")} €
                  </div>
                  <div style={{ fontSize: 12, color: rentaInfo.color, fontWeight: 500 }}>
                    Marge {margePercent}%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: textColor }}>
                    <span style={{ fontWeight: 600 }}>{totalConsomme.toFixed(1)}h</span>
                    <span style={{ color: subtextColor }}> / {totalAlloue.toFixed(1)}h</span>
                  </div>
                </div>
                <div style={{ padding: "0 8px" }}>
                  <ProgressBar consumed={totalConsomme} allocated={totalAlloue} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {[...new Set(p.taches.map((t) => t.collab).filter(Boolean))]
                    .slice(0, 2)
                    .map((cid) => (
                      <div key={cid} style={{ marginLeft: -6 }}>
                        <Avatar collab={COLLABORATEURS.find((c) => c.id === cid)} size={28} />
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* TEAM LOAD */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            border: `1px solid ${borderColor}`,
            overflow: "hidden",
            boxShadow: isDark
              ? "0 4px 12px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                color: textColor,
                margin: 0,
                fontWeight: 400,
              }}
            >
              Charge équipe cette semaine
            </h3>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              padding: 24,
            }}
          >
            {COLLABORATEURS.map((c) => {
              const taches = PROJETS.flatMap((p) =>
                p.taches.filter((t) => t.collab === c.id)
              );
              const heures = taches.reduce((s, t) => s + t.tempsConsomme, 0);
              const charge = Math.min(Math.round((heures / 35) * 100), 100);
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px",
                    borderRadius: 12,
                    background: isDark ? "#141414" : "#F5F5F3",
                    border: `1px solid ${borderColor}`,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C5A55A";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(197, 165, 90, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Avatar collab={c} size={40} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
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
                        {heures}h / 35h
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: isDark ? "#2F2F2F" : "#E5E5E3",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${charge}%`,
                          height: "100%",
                          borderRadius: 3,
                          background:
                            charge > 90
                              ? "#E53935"
                              : charge > 70
                              ? "#FF9800"
                              : "#4CAF50",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: subtextColor, marginTop: 6 }}>
                      {taches.length} tâche{taches.length > 1 ? "s" : ""} · {c.pole}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
