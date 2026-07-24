"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import AccessDenied from "@/components/AccessDenied";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";

/* ─── Types API (app/api/rapports/temps/route.ts) ─── */
type Kpi = {
  hoursLabel: string; hoursNote: string;
  occLabel: string; occColor: string; occNote: string;
  overrunCount: number; overrunNote: string;
  clientCount: number; clientNote: string;
};
type CollabRow = {
  id: string; nom: string; initials: string; color: string; pole: string;
  hoursLabel: string; occLabel: string; occColor: string;
  days: { label: string; pct: number; color: string }[];
  periodeMinutes: number;
};
type ProjectRow = {
  id: string; name: string; client: string;
  type: string; typeLabel: string; typeColor: string;
  estimeLabel: string; passeLabel: string; over: boolean; pct: number; color: string; chargeLabel: string;
  passeMinutes: number; estimeMinutes: number;
};
type TypeRow = { value: string; label: string; color: string; hoursLabel: string; pct: number; projectCount: number };
type ClientRow = {
  name: string; projects: string; hoursLabel: string; pct: number; color: string;
  overrun: boolean; overrunLabel: string; hoursMinutes: number;
};
type RapportsData = {
  period: { from: string; to: string };
  periodLabel: string; updatedAt: string;
  kpi: Kpi;
  collabRows: CollabRow[];
  projectRows: ProjectRow[];
  typeRows: TypeRow[];
  clientRows: ClientRow[];
};

type PeriodKey = "semaine" | "mois" | "trimestre" | "annee";
const PERIOD_OPTS: { key: PeriodKey; label: string }[] = [
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
  { key: "trimestre", label: "Trimestre" },
  { key: "annee", label: "Année" },
];

type TabKey = "collab" | "projet" | "type" | "client";
const TAB_OPTS: { key: TabKey; label: string }[] = [
  { key: "collab", label: "Par collaborateur" },
  { key: "projet", label: "Par projet" },
  { key: "type", label: "Par type de projet" },
  { key: "client", label: "Par client" },
];

/* Style commun des grands nombres de KPI — Georgia Extra-Bold (mêmes tokens
   que le reste de l'app, cf. lib/typography.ts), pas le Playfair du modèle. */
const statNumber = (color: string, size = 32): React.CSSProperties => ({
  fontFamily: typography.pageTitle.fontFamily,
  fontSize: size,
  fontWeight: 800,
  lineHeight: 1,
  color,
});
const eyebrow = (color: string): React.CSSProperties => ({
  fontSize: 10.5,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  fontWeight: 700,
  color,
});

function csvCell(v: string | number | undefined | null): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const content = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RapportsPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("semaine");
  const [tab, setTab] = useState<TabKey>("collab");
  const [data, setData] = useState<RapportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch(`/api/rapports/temps?period=${period}`)
      .then(r => r.json())
      .then((d: RapportsData & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Impossible de charger les données de temps."))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (!canSeeMoney) {
    return (
      <AccessDenied
        message="Les rapports de temps sont réservés à la Direction et aux Admins."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  function exportExcel() {
    if (!data) return;
    if (tab === "collab") {
      downloadCsv("rapport-temps-collaborateurs.csv",
        ["Collaborateur", "Spécialité", "Temps", "Occupation"],
        data.collabRows.map(r => [csvCell(r.nom), csvCell(r.pole), csvCell(r.hoursLabel), csvCell(r.occLabel)]));
    } else if (tab === "projet") {
      downloadCsv("rapport-temps-projets.csv",
        ["Projet", "Client", "Type", "Estimé", "Passé", "Charge"],
        data.projectRows.map(r => [csvCell(r.name), csvCell(r.client), csvCell(r.typeLabel), csvCell(r.estimeLabel), csvCell(r.passeLabel), csvCell(r.chargeLabel)]));
    } else if (tab === "type") {
      downloadCsv("rapport-temps-types.csv",
        ["Type de projet", "Temps passé", "Part", "Nombre de projets"],
        data.typeRows.map(r => [csvCell(r.label), csvCell(r.hoursLabel), csvCell(`${r.pct}%`), csvCell(r.projectCount)]));
    } else {
      downloadCsv("rapport-temps-clients.csv",
        ["Client", "Projets", "Temps total", "Dépassement"],
        data.clientRows.map(r => [csvCell(r.name), csvCell(r.projects), csvCell(r.hoursLabel), csvCell(r.overrunLabel)]));
    }
  }

  return (
    <div style={{ margin: "-32px -40px", minHeight: "100vh", background: "#F5F5F2" }} className="rapports-print-root">

      <div style={{ padding: "24px 30px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={typography.pageTitle}>Rapports de temps</h1>
            <div style={{ ...typography.description, marginTop: 5 }}>
              {data ? `${data.periodLabel} · maj ${data.updatedAt}` : "Chargement…"}
            </div>
          </div>
          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 10, padding: 3, gap: 2 }}>
              {PERIOD_OPTS.map(opt => {
                const on = period === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className="btn"
                    onClick={() => setPeriod(opt.key)}
                    style={{ padding: "8px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, color: on ? "#0A0A0A" : "#8C8B83", background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 2px rgba(20,20,15,.10)" : "none", border: "none", whiteSpace: "nowrap" }}
                  >{opt.label}</button>
                );
              })}
            </div>
            <Button variant="secondary" onClick={() => window.print()}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v8" /><path d="M7 8.5 10 11l3-2.5" /><path d="M4 14.5v1.6c0 .5.4 1 1 1h10c.6 0 1-.5 1-1v-1.6" /></svg>
              Exporter PDF
            </Button>
            <Button variant="primary" onClick={exportExcel} disabled={!data}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="7" y1="7" x2="13" y2="13" /><line x1="13" y1="7" x2="7" y2="13" /></svg>
              Exporter Excel
            </Button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 10, padding: "12px 16px", color: "#DC2626", fontSize: 14.5 }}>{error}</div>
        )}

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: 60, color: "#A6A498", fontSize: 16 }}>Chargement…</div>
        ) : (
          <>
            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <div style={{ background: "#0A0A0A", borderRadius: 16, padding: 20, color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -30, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.28),transparent 70%)" }} />
                <span style={{ ...eyebrow("#B79B5E"), position: "relative" }}>Heures totales</span>
                <div style={{ ...statNumber("#F4ECD7", 34), marginTop: 12, position: "relative" }}>{data.kpi.hoursLabel}</div>
                <div style={{ fontSize: 12, color: "#8E8876", marginTop: 9, position: "relative" }}>{data.kpi.hoursNote}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <span style={eyebrow("#9A998F")}>Taux d&apos;occupation</span>
                <div style={{ ...statNumber(data.kpi.occColor, 28), marginTop: 12 }}>{data.kpi.occLabel}</div>
                <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 9 }}>{data.kpi.occNote}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <span style={eyebrow("#9A998F")}>Projets en dépassement</span>
                <div style={{ ...statNumber("#C2410C", 28), marginTop: 12 }}>{data.kpi.overrunCount}</div>
                <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 9 }}>{data.kpi.overrunNote}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <span style={eyebrow("#9A998F")}>Clients suivis</span>
                <div style={{ ...statNumber("#16150F", 28), marginTop: 12 }}>{data.kpi.clientCount}</div>
                <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 9 }}>{data.kpi.clientNote}</div>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="no-print" style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 12, padding: 4, gap: 4 }}>
              {TAB_OPTS.map(opt => {
                const on = tab === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className="btn"
                    onClick={() => setTab(opt.key)}
                    style={{ flex: 1, textAlign: "center", padding: "11px 10px", borderRadius: 9, fontSize: 13, fontWeight: 700, color: on ? "#F4ECD7" : "#8C8B83", background: on ? "#0A0A0A" : "transparent", boxShadow: on ? "0 4px 12px -4px rgba(0,0,0,.3)" : "none", border: "none", whiteSpace: "nowrap" }}
                  >{opt.label}</button>
                );
              })}
            </div>

            {/* ══ PAR COLLABORATEUR ══ */}
            {tab === "collab" && (
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 8px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 14px" }}>
                  <h3 style={typography.cardTitle}>Temps par collaborateur</h3>
                  <span style={{ fontSize: 12.5, color: "#9A998F" }}>{data.kpi.hoursLabel} au total</span>
                </div>
                {data.collabRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#A6A498", fontSize: 15 }}>Aucun collaborateur actif.</div>
                ) : data.collabRows.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid #F2F1EB" }}>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: r.color, flex: "none" }}>{r.initials}</span>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1B16" }}>{r.nom}</div>
                      <div style={{ fontSize: 12, color: "#A6A498", marginTop: 1 }}>{r.pole}</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ textAlign: "right", minWidth: 96 }}>
                      <div style={statNumber("#1C1B16", 16.5)}>{r.hoursLabel}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: r.occColor, marginTop: 2 }}>{r.occLabel} occupation</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", flex: "none" }}>
                      {r.days.map((d, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 20 }}>
                          <div style={{ width: 16, height: 40, display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: `${d.pct}%`, minHeight: d.pct > 0 ? 3 : 0, borderRadius: 3, background: d.color, transition: "height 0.4s ease" }} />
                          </div>
                          <span style={{ fontSize: 9, color: "#B6B5AD" }}>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ PAR PROJET ══ */}
            {tab === "projet" && (
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 14px" }}>
                  <h3 style={typography.cardTitle}>Temps par projet</h3>
                  <span style={{ fontSize: 12.5, color: "#9A998F" }}>{data.projectRows.length} projets actifs</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1.3fr 1.1fr 0.9fr 0.9fr 1.4fr", gap: 14, paddingBottom: 11, borderBottom: "1px solid #EEEDE6" }}>
                  <span style={typography.label}>Projet</span>
                  <span style={typography.label}>Client</span>
                  <span style={typography.label}>Type</span>
                  <span style={{ ...typography.label, textAlign: "right" }}>Estimé</span>
                  <span style={{ ...typography.label, textAlign: "right" }}>Passé</span>
                  <span style={{ ...typography.label, textAlign: "right" }}>Charge</span>
                </div>
                {data.projectRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#A6A498", fontSize: 15 }}>Aucun projet actif.</div>
                ) : data.projectRows.map(p => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.9fr 1.3fr 1.1fr 0.9fr 0.9fr 1.4fr", gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                    <span style={{ fontSize: 12.5, color: "#8C8B83", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.client}</span>
                    <span><span style={{ fontSize: 11, fontWeight: 700, color: p.typeColor, background: `${p.typeColor}1A`, borderRadius: 99, padding: "3px 9px", whiteSpace: "nowrap" }}>{p.typeLabel}</span></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#8C8B83", textAlign: "right" }}>{p.estimeLabel}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: p.over ? "#C2410C" : "#1C1B16", textAlign: "right" }}>{p.passeLabel}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "flex-end" }}>
                      <div style={{ width: 54, height: 6, borderRadius: 99, background: "#EFEDE5", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, width: `${p.pct}%`, background: p.color }} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: p.color, width: 74, textAlign: "right" }}>{p.chargeLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ PAR TYPE DE PROJET ══ */}
            {tab === "type" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                  <h3 style={{ ...typography.cardTitle, marginBottom: 18 }}>Répartition du temps par type de prestation</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                    {data.typeRows.map(t => (
                      <div key={t.value}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#33322C" }}>{t.label}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#74726A" }}>{t.hoursLabel} · {t.pct}%</span>
                        </div>
                        <div style={{ height: 9, borderRadius: 99, background: "#F0EEE6", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 99, background: t.color, width: `${t.pct}%` }} />
                        </div>
                      </div>
                    ))}
                    {data.typeRows.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#A6A498", fontSize: 15 }}>Aucune donnée.</div>}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                  <h3 style={{ ...typography.cardTitle, marginBottom: 18 }}>Nombre de projets par type</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {data.typeRows.map(t => (
                      <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: "1px solid #F2F1EB" }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: t.color, flex: "none" }} />
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#1C1B16" }}>{t.label}</span>
                        <span style={statNumber("#33322C", 13)}>{t.projectCount}</span>
                        <span style={{ fontSize: 11.5, color: "#A6A498", width: 56, textAlign: "right" }}>projets</span>
                      </div>
                    ))}
                    {data.typeRows.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#A6A498", fontSize: 15 }}>Aucune donnée.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ══ PAR CLIENT ══ */}
            {tab === "client" && (
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 14px" }}>
                  <h3 style={typography.cardTitle}>Temps par client</h3>
                  <span style={{ fontSize: 12.5, color: "#9A998F" }}>{data.kpi.clientCount} clients suivis</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.7fr 2fr 0.9fr 1.3fr 1fr", gap: 14, paddingBottom: 11, borderBottom: "1px solid #EEEDE6" }}>
                  <span style={typography.label}>Client</span>
                  <span style={typography.label}>Projets</span>
                  <span style={{ ...typography.label, textAlign: "right" }}>Temps total</span>
                  <span style={typography.label}>Charge</span>
                  <span style={{ ...typography.label, textAlign: "right" }}>Dépassement</span>
                </div>
                {data.clientRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#A6A498", fontSize: 15 }}>Aucun client suivi.</div>
                ) : data.clientRows.map(c => (
                  <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1.7fr 2fr 0.9fr 1.3fr 1fr", gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                    <span style={{ fontSize: 12.5, color: "#8C8B83", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.projects}</span>
                    <span style={{ ...statNumber("#1C1B16", 13.5), textAlign: "right" }}>{c.hoursLabel}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#EFEDE5", overflow: "hidden", maxWidth: 80 }}>
                        <div style={{ height: "100%", borderRadius: 99, width: `${c.pct}%`, background: c.color }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.color }}>{c.pct}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {c.overrun ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#C2410C", background: "#FBEAE0", borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3.5 17 16H3z" /><line x1="10" y1="8.4" x2="10" y2="11.6" /></svg>{c.overrunLabel}
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#1F8A5B", background: "#E7F3EB", borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>Conforme</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
