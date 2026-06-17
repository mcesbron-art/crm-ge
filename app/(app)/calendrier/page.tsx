"use client";

import { useState, useMemo } from "react";
import Avatar from "@/components/ui/Avatar";
import { COLLABORATEURS, COLORS } from "@/lib/mock-data";

type Echeance = {
  taskId: number;
  taskName: string;
  projet: string;
  date: string; // YYYY-MM-DD
  collabId: number | null;
  priorite: "haute" | "moyenne" | "basse";
  abonnement?: boolean;
};

const ECHEANCES: Echeance[] = [
  { taskId: 4,  taskName: "Maquettes UI/UX",          projet: "Netzy",                  date: "2026-04-14", collabId: 1, priorite: "haute" },
  { taskId: 20, taskName: "Optimisation Ads BÉRYL",   projet: "BÉRYL Patrimoine",       date: "2026-04-17", collabId: 5, priorite: "haute" },
  { taskId: 1,  taskName: "Maquettes site e-commerce",projet: "Maison Relais Gourmet",  date: "2026-04-18", collabId: 1, priorite: "haute" },
  { taskId: 17, taskName: "Campagne SEA Netzy",       projet: "Netzy",                  date: "2026-04-18", collabId: 4, priorite: "haute" },
  { taskId: 19, taskName: "Module paiement MRG",      projet: "Maison Relais Gourmet",  date: "2026-04-19", collabId: 5, priorite: "haute" },
  { taskId: 8,  taskName: "Shooting photo printemps", projet: "Vins d'Anjou-Saumur",    date: "2026-04-20", collabId: 1, priorite: "haute" },
  { taskId: 14, taskName: "Audit SEO groupe-echo.fr", projet: "Groupe Écho (interne)",  date: "2026-04-21", collabId: 2, priorite: "moyenne" },
  { taskId: 5,  taskName: "Développement WordPress",  projet: "Netzy",                  date: "2026-04-22", collabId: 4, priorite: "haute" },
  { taskId: 10, taskName: "Charte graphique",         projet: "BÉRYL Patrimoine",       date: "2026-04-25", collabId: 1, priorite: "haute" },
  { taskId: 2,  taskName: "Intégration WooCommerce",  projet: "Maison Relais Gourmet",  date: "2026-04-28", collabId: 5, priorite: "moyenne" },
  { taskId: 3,  taskName: "Rédaction fiches produits",projet: "Maison Relais Gourmet",  date: "2026-04-28", collabId: 2, priorite: "basse" },
  { taskId: 23, taskName: "Suivi facturation Mars",   projet: "Groupe Écho (interne)",  date: "2026-04-30", collabId: 6, priorite: "haute" },
  { taskId: 7,  taskName: "Posts réseaux sociaux Mars", projet: "Vins d'Anjou-Saumur",   date: "2026-04-30", collabId: 3, priorite: "moyenne", abonnement: true },
  { taskId: 6,  taskName: "SEO on-page",              projet: "Netzy",                  date: "2026-05-01", collabId: 2, priorite: "moyenne" },
  { taskId: 11, taskName: "Supports print",           projet: "BÉRYL Patrimoine",       date: "2026-05-02", collabId: 1, priorite: "moyenne" },
  { taskId: 15, taskName: "Vidéo corporate BÉRYL",    projet: "BÉRYL Patrimoine",       date: "2026-05-10", collabId: 3, priorite: "haute" },
  { taskId: 16, taskName: "Stratégie RS Roul'Anjou",  projet: "Roul'Anjou",             date: "2026-05-15", collabId: 3, priorite: "moyenne" },
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const prioColors = {
  haute:   COLORS.rouge,
  moyenne: COLORS.orange,
  basse:   COLORS.vert,
} as const;

export default function CalendrierPage() {
  const [cursor, setCursor] = useState<{ year: number; month: number }>({ year: 2026, month: 3 });
  const [filterCollab, setFilterCollab] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filteredEcheances = filterCollab
    ? ECHEANCES.filter((e) => e.collabId === filterCollab)
    : ECHEANCES;

  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1);
    const dayOfWeek = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

    const cells: { date: Date | null; iso: string }[] = [];
    for (let i = 0; i < dayOfWeek; i++) cells.push({ date: null, iso: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(cursor.year, cursor.month, d);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: dt, iso });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: "" });

    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [cursor]);

  const echeancesByDay = useMemo(() => {
    const map = new Map<string, Echeance[]>();
    for (const e of filteredEcheances) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [filteredEcheances]);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => setCursor((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCursor((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const totalDuMois = filteredEcheances.filter((e) => {
    const [y, m] = e.date.split("-").map(Number);
    return y === cursor.year && m - 1 === cursor.month;
  }).length;

  const selectedTasks = selectedDay ? echeancesByDay.get(selectedDay) || [] : [];

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
        }}>Calendrier</h1>
        <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
          Échéances de tâches · {totalDuMois} échéance{totalDuMois > 1 ? "s" : ""} ce mois-ci
        </p>
      </div>

      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "12px 16px",
        marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <button onClick={goToday} style={{ ...navBtnStyle, padding: "6px 14px", width: "auto", fontSize: 12, fontWeight: 600 }}>Aujourd&apos;hui</button>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        <div style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 22, color: COLORS.noir, marginLeft: 8,
        }}>
          {MONTHS[cursor.month]} {cursor.year}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: COLORS.grisMoyen, marginRight: 4 }}>Filtrer :</span>
          <button onClick={() => setFilterCollab(null)} style={chipBtn(!filterCollab, COLORS.dore, COLORS.dorePale)}>Tous</button>
          {COLLABORATEURS.map((c) => (
            <button key={c.id} onClick={() => setFilterCollab(filterCollab === c.id ? null : c.id)}
              style={chipBtn(filterCollab === c.id, c.color, c.color + "18")}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block", marginRight: 6 }} />
              {c.nom}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedDay ? "1fr 320px" : "1fr", gap: 20 }}>
        <div style={{
          background: COLORS.blanc, borderRadius: 16,
          border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            background: COLORS.gris, borderBottom: `1px solid ${COLORS.grisBorder}`,
          }}>
            {DAYS.map((d) => (
              <div key={d} style={{
                padding: "10px 12px", fontSize: 11, fontWeight: 700,
                color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5,
                textAlign: "center",
              }}>{d}</div>
            ))}
          </div>

          {grid.map((week, wi) => (
            <div key={wi} style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: wi < grid.length - 1 ? `1px solid ${COLORS.grisBorder}` : "none",
            }}>
              {week.map((cell, ci) => {
                if (!cell.date) {
                  return <div key={ci} style={{ minHeight: 110, background: COLORS.grisLight }} />;
                }
                const echeances = echeancesByDay.get(cell.iso) || [];
                const isToday = cell.iso === todayISO;
                const isSelected = cell.iso === selectedDay;
                const isWeekend = ci >= 5;

                return (
                  <div
                    key={ci}
                    onClick={() => setSelectedDay(isSelected ? null : cell.iso)}
                    style={{
                      minHeight: 110, padding: 8,
                      borderRight: ci < 6 ? `1px solid ${COLORS.grisBorder}` : "none",
                      background: isSelected ? COLORS.dorePale : isWeekend ? "#FAFAF8" : COLORS.blanc,
                      cursor: "pointer", transition: "background 0.15s",
                      position: "relative",
                    }}
                  >
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 4,
                    }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 24, height: 24, borderRadius: "50%",
                        fontSize: 12, fontWeight: 600,
                        color: isToday ? COLORS.blanc : isWeekend ? COLORS.grisMoyen : COLORS.noir,
                        background: isToday ? COLORS.dore : "transparent",
                      }}>{cell.date.getDate()}</span>
                      {echeances.length > 3 && (
                        <span style={{ fontSize: 10, color: COLORS.grisMoyen }}>+{echeances.length - 3}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {echeances.slice(0, 3).map((e) => {
                        const collab = COLLABORATEURS.find((c) => c.id === e.collabId);
                        return (
                          <div key={e.taskId} style={{
                            background: collab?.color ? collab.color + "18" : COLORS.gris,
                            borderLeft: `3px solid ${collab?.color || COLORS.grisMoyen}`,
                            padding: "3px 6px", borderRadius: 4,
                            fontSize: 10.5, lineHeight: 1.3,
                            color: COLORS.noir, fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            <span style={{ color: prioColors[e.priorite] }}>●</span> {e.taskName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {selectedDay && (
          <div className="animate-slideIn" style={{
            background: COLORS.blanc, borderRadius: 16,
            border: `1px solid ${COLORS.grisBorder}`, padding: 20, height: "fit-content",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            }}>
              <div>
                <div style={{ fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {new Date(selectedDay).toLocaleDateString("fr-FR", { weekday: "long" })}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 700, color: COLORS.noir,
                  fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                }}>
                  {new Date(selectedDay).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  background: COLORS.gris, color: COLORS.grisMoyen, cursor: "pointer", fontSize: 14,
                }}
              >×</button>
            </div>

            {selectedTasks.length === 0 ? (
              <p style={{ color: COLORS.grisMoyen, fontSize: 13, fontStyle: "italic", margin: 0 }}>
                Aucune échéance ce jour-là.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedTasks.map((e) => {
                  const collab = COLLABORATEURS.find((c) => c.id === e.collabId);
                  return (
                    <div key={e.taskId} style={{
                      padding: "10px 12px",
                      borderLeft: `3px solid ${collab?.color || COLORS.grisMoyen}`,
                      background: COLORS.gris, borderRadius: "0 8px 8px 0",
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: COLORS.noir,
                        marginBottom: 4, display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ color: prioColors[e.priorite] }}>●</span>
                        {e.taskName}
                        {e.abonnement && (
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 3,
                            background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700,
                          }}>ABO</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 6 }}>{e.projet}</div>
                      {collab && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar collab={collab} size={20} />
                          <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab.nom}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: `1px solid ${COLORS.grisBorder}`,
  background: COLORS.blanc, cursor: "pointer", fontSize: 14, color: COLORS.noir,
};

function chipBtn(active: boolean, activeColor: string, activeBg: string): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 14,
    border: `1px solid ${active ? activeColor : COLORS.grisBorder}`,
    background: active ? activeBg : COLORS.blanc,
    color: active ? activeColor : COLORS.grisMoyen,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center",
  };
}
