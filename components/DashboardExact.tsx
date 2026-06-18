"use client";

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
  isBlack = false,
  subColor,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: string;
  isBlack?: boolean;
  subColor?: string;
}) {
  const bgColor = isBlack ? "#0F0F0F" : "#FFFFFF";
  const textColor = isBlack ? "#FFFFFF" : "#1A1A1A";
  const labelColor = isBlack ? "#C5A55A" : "#666666";
  const borderColor = isBlack ? "#2F2F2F" : "#E8E8E8";
  const accentColor = isBlack ? "#C5A55A" : "#C5A55A";

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 20,
        padding: "24px 20px",
        border: `1px solid ${borderColor}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
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
            color: isBlack ? accentColor : textColor,
            lineHeight: 1.1,
            fontFamily: "Georgia, serif",
          }}
        >
          {value}
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: subColor || labelColor, marginTop: 4, fontWeight: 400 }}>
          {sub}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          fontSize: 20,
          opacity: 0.08,
          color: textColor,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function DashboardExact() {
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

  // Light theme colors
  const textColor = "#1A1A1A";
  const subtextColor = "#666666";
  const borderColor = "#E8E8E8";

  return (
    <div
      style={{
        minHeight: "100vh",
        color: textColor,
      }}
    >
      {/* INTEGRATED HEADER - Vos Direction + Dashboard + Buttons */}
      <div
        style={{
          borderBottom: `1px solid ${borderColor}`,
          marginBottom: 24,
          paddingBottom: 16,
        }}
      >
        {/* Top row - Vos Direction */}
        <div
          style={{
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
            <span style={{ color: "#C5A55A", fontWeight: 700 }}>★ Vos Direction</span>
            <span style={{ color: subtextColor }}>— accès complet aux montants, marges et rapports</span>
          </div>
        </div>

        {/* Bottom row - Dashboard Title + Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 28,
                color: textColor,
                margin: "0 0 2px",
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
                background: "#F0F0F0",
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
                background: "#000000",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              + Nouveau projet
            </button>
          </div>
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
          isBlack={true}
        />
        <KPICard
          label="CA en production"
          value={`${(totalCA / 1000).toFixed(1)}k€`}
          sub={`+12.4% Marge 25.4€`}
          icon="€"
        />
        <KPICard
          label="Tâches en cours"
          value={tachesEnCours}
          sub={`sur ${totalTaches} tâches`}
          icon="▶"
        />
        <KPICard
          label="Alertes rentabilité"
          value={alertes}
          sub="À surveiller temps de prod."
          icon="⚠"
          subColor="#E65100"
        />
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* LEFT COLUMN */}
        <div>
          {/* CA SECTION */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
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
              <InteractiveChart isDark={false} height={180} />
            </div>
          </div>

          {/* ALERTES SECTION */}
          <div
            style={{
              background: "#FFF8F0",
              borderRadius: 20,
              border: `1px solid #FFE0B2`,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#E65100",
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
                    borderBottom: `1px solid rgba(0,0,0,0.1)`,
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
              background: "#FFFFFF",
              borderRadius: 20,
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
                background: "#FFFFFF",
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
            background: "#FFFFFF",
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
                    background: "#E5E5E3",
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

    </div>
  );
}
