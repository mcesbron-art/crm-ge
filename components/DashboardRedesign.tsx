"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { typography } from "@/lib/typography";

/* ─── Types API ─── */
type PersonalWidgets = {
  weekLabel: string;
  weekTotal: string;
  timeDays: { label: string; date: string; hours: string; hoursColor: string; statusDot: string; statusColor: string; statusLabel: string; dash: number; ringColor: string }[];
  hasMissingDays: boolean;
  missingCount: number;
  overtime: {
    balance: string; pending: string; refused: string;
    rows: { id: string; project: string; client: string; accent: string; hours: string; statusLabel: string; statusColor: string; statusBg: string }[];
  };
};
type TaskItem = {
  id: string; ref: string; priority: string; prioColor: string; prioBg: string;
  title: string; project: string; due: string; dueColor: string; dueWeight: number;
  ownerName: string; ownerColor: string;
};
type TicketItem = {
  id: string; ref: string; status: string; statusColor: string; statusBg: string; statusDot: string;
  title: string; client: string; due: string; dueColor: string; dueWeight: number;
  ownerName: string; ownerColor: string;
};
type DashboardData = {
  kpi: { tasksCount: number; ticketsOpen: number; dueToday: number };
  tasks: TaskItem[];
  moreTasks: number;
  tickets: TicketItem[];
  moreTickets: number;
  personal: PersonalWidgets;
};

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/* Circonférence utilisée côté serveur pour calculer `dash` (anneau, avant
   refonte) — reconvertie ici en pourcentage pour la barre horizontale, sans
   toucher à /api/dashboard. */
const RING_CIRC = 2 * Math.PI * 27;
function pctFromDash(dash: number): number {
  return Math.max(0, Math.min(100, Math.round((dash / RING_CIRC) * 100)));
}

/* Style commun des grands nombres de KPI — Inter (pas Playfair, cf. la
   harmonisation typographique du reste du CRM) mais volontairement plus
   grand/gras que le corps de texte pour rester le point focal des cartes. */
const statNumber = (color: string, size = 28): React.CSSProperties => ({
  fontFamily: typography.pageTitle.fontFamily,
  fontSize: size,
  fontWeight: 800,
  lineHeight: 1,
  color,
});
const eyebrow = (color: string): React.CSSProperties => ({
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  fontWeight: 700,
  color,
});

/* ─── Icônes ─── */
const IconTicket = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5.5" width="14" height="9" rx="2" /><line x1="10" y1="5.5" x2="10" y2="14.5" strokeDasharray="1.6 1.6" />
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" />
  </svg>
);
const IconOvertime = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" />
  </svg>
);

// Ligne cliquable — renvoie directement vers la tâche (Mes tâches, avec
// deep-link ?open=) ou le ticket (sa page de détail dédiée), avec un effet
// de survol. Extrait en composant à part car un Hook (useState du survol) ne
// peut pas être appelé dans un callback .map().
function TaskRow({ t }: { t: TaskItem }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/mes-taches?open=${t.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 20px", borderBottom: "1px solid #F2F1EB", textDecoration: "none", color: "inherit", background: hover ? "#FBFAF6" : "transparent", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.prioColor, background: t.prioBg, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>{t.priority}</span>
        <span style={{ fontSize: 12, color: "#A6A498" }}>{t.ref}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", lineHeight: 1.35 }}>{t.title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#8C8B83", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.project}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
          <span style={{ fontSize: 11.5, fontWeight: t.dueWeight, color: t.dueColor }}>{t.due}</span>
          <span title={t.ownerName} style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: "#fff", background: t.ownerColor }}>{getInitials(t.ownerName)}</span>
        </span>
      </div>
    </Link>
  );
}

function TicketRow({ tk }: { tk: TicketItem }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/tickets/${tk.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 20px", borderBottom: "1px solid #F2F1EB", textDecoration: "none", color: "inherit", background: hover ? "#FBFAF6" : "transparent", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: tk.statusColor, background: tk.statusBg, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tk.statusDot }} />{tk.status}
        </span>
        <span style={{ fontSize: 12, color: "#A6A498" }}>{tk.ref}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", lineHeight: 1.35 }}>{tk.title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#8C8B83", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tk.client}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
          <span style={{ fontSize: 11.5, fontWeight: tk.dueWeight, color: tk.dueColor }}>{tk.due}</span>
          <span title={tk.ownerName} style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: "#fff", background: tk.ownerColor }}>{getInitials(tk.ownerName)}</span>
        </span>
      </div>
    </Link>
  );
}

/* ─── Composant principal ─── */
// Dashboard unique — identique pour Admin et Collaborateur : chacun voit ses
// propres tâches/tickets assignés, son temps passé et ses heures
// supplémentaires. Pas de vue "indicateurs globaux" séparée pour l'Admin
// (remplacement complet demandé par l'utilisateur, cf. historique de la
// page /dashboard).
export default function DashboardRedesign() {
  const { currentUser } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return fetch("/api/dashboard")
      .then(r => r.json())
      .then((d: DashboardData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ margin: "-32px -40px", minHeight: "100vh", background: "#F5F5F2", position: "relative" }}>

      {/* Content */}
      <div style={{ padding: "24px 30px 40px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Title row */}
        <div>
          <h1 style={typography.pageTitle}>
            Bonjour {currentUser.nom.split(" ")[0]}
          </h1>
          <div style={{ ...typography.description, marginTop: 5 }}>Voici un aperçu rapide de vos tâches et tickets en cours</div>
        </div>

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: 60, color: "#A6A498", fontSize: 18.5 }}>Chargement…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <div style={{ background: "#0A0A0A", borderRadius: 16, padding: "18px 20px", color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -36, right: -26, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.28),transparent 70%)" }} />
                <span style={{ ...eyebrow("#B79B5E"), position: "relative" }}>Tâches en cours</span>
                <div style={{ ...statNumber("#F4ECD7", 31), marginTop: 12, position: "relative" }}>{data.kpi.tasksCount}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <span style={eyebrow("#9A998F")}>Tickets ouverts</span>
                <div style={{ ...statNumber("#16150F", 29), marginTop: 12 }}>{data.kpi.ticketsOpen}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <span style={eyebrow("#9A998F")}>Échéances aujourd&apos;hui</span>
                <div style={{ ...statNumber("#C2410C", 29), marginTop: 12 }}>{data.kpi.dueToday}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
              {/* Tâches widget */}
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "rgba(201,162,78,.07)", borderBottom: "1px solid #F0EFEA" }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(201,162,78,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B0892B", flex: "none" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M6.5 10.2 8.7 12.5 13.5 7.5" /></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={typography.cardTitle}>Tâches</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                      <Link href="/mes-taches" className="link-underline-hover" style={{ fontSize: 12, fontWeight: 600, color: "#B0892B" }}>Tout voir</Link>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.tasks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 0", color: "#A6A498", fontSize: 15 }}>Aucune tâche en cours</div>
                  ) : data.tasks.map(t => <TaskRow key={t.id} t={t} />)}
                </div>
                {data.moreTasks > 0 && (
                  <Link href="/mes-taches" className="link-underline-hover" style={{ display: "block", padding: "13px 20px", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "#B0892B", background: "#FBFAF6" }}>
                    Voir {data.moreTasks} tâche(s) supplémentaire(s)
                  </Link>
                )}
              </div>

              {/* Tickets widget */}
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "rgba(37,99,235,.06)", borderBottom: "1px solid #F0EFEA" }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: "#E6EEFB", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flex: "none" }}>
                    <IconTicket />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={typography.cardTitle}>Tickets</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                      <Link href="/tickets" className="link-underline-hover" style={{ fontSize: 12, fontWeight: 600, color: "#B0892B" }}>Tout voir</Link>
                      <span style={{ color: "#D2D0C7" }}>|</span>
                      <Link href="/tickets" className="link-underline-hover" style={{ fontSize: 12, fontWeight: 600, color: "#B0892B" }}>Ajouter</Link>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.tickets.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 0", color: "#A6A498", fontSize: 15 }}>Aucun ticket ouvert</div>
                  ) : data.tickets.map(tk => <TicketRow key={tk.id} tk={tk} />)}
                </div>
                {data.moreTickets > 0 && (
                  <Link href="/tickets" className="link-underline-hover" style={{ display: "block", padding: "13px 20px", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "#B0892B", background: "#FBFAF6" }}>
                    Voir {data.moreTickets} ticket(s) supplémentaire(s)
                  </Link>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            {/* ── TEMPS PASSÉ WIDGET ── */}
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 20px", background: "rgba(31,138,91,.06)", borderBottom: "1px solid #F0EFEA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: "#E7F3EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F8A5B", flex: "none" }}><IconClock /></span>
                  <div>
                    <div style={typography.cardTitle}>Temps passé</div>
                    <div style={{ ...typography.description, marginTop: 2 }}>Semaine du {data.personal.weekLabel}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#33322C", background: "#F0EFEA", borderRadius: 99, padding: "5px 12px", whiteSpace: "nowrap" }}>{data.personal.weekTotal}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "16px 20px 6px" }}>
                {data.personal.timeDays.map((d, i) => (
                  <div key={i} title={`${d.label} ${d.date} · ${d.hours} · ${d.statusLabel}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                    <div style={{ width: 34, flex: "none", fontSize: 12.5, fontWeight: 700, color: "#1C1B16" }}>{d.label}</div>
                    <div style={{ flex: 1, height: 9, borderRadius: 99, background: "#F0EEE6", position: "relative", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${pctFromDash(d.dash)}%`, background: d.ringColor, transition: "width 0.4s ease" }} />
                    </div>
                    <span style={{ width: 40, flex: "none", textAlign: "right", ...statNumber(d.hoursColor, 12.5) }}>{d.hours}</span>
                    <span style={{ width: 14, flex: "none", display: "flex", justifyContent: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.statusDot, display: "block" }} />
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 20px 16px", justifyContent: "center" }}>
                <span style={typography.help}>Barre pleine = objectif journalier de {Math.round((currentUser.base || 35) / 5)}h atteint</span>
              </div>
              {data.personal.hasMissingDays && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderTop: "1px solid #F0EFEA", background: "#FBF3EC" }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M10 3.5 17 16H3z" /><line x1="10" y1="8.4" x2="10" y2="11.6" /><circle cx="10" cy="13.8" r="0.5" fill="#C2410C" /></svg>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#B7501A" }}>{data.personal.missingCount} jour(s) sans saisie de temps cette semaine</span>
                </div>
              )}
              <div style={{ padding: "14px 20px 18px", borderTop: "1px solid #F0EFEA", display: "flex", justifyContent: "center" }}>
                <Link href="/mes-taches" className="btn btn-primary">Saisir mon temps</Link>
              </div>
            </div>

            {/* ── HEURES SUPPLÉMENTAIRES WIDGET ── */}
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 20px", background: "rgba(201,162,78,.07)", borderBottom: "1px solid #F0EFEA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(201,162,78,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B0892B", flex: "none" }}><IconOvertime /></span>
                  <div>
                    <div style={typography.cardTitle}>Heures supplémentaires</div>
                    <div style={{ ...typography.description, marginTop: 2 }}>Solde disponible et détail par projet</div>
                  </div>
                </div>
                <Link href="/absences" className="link-underline-hover" style={{ fontSize: 12, fontWeight: 600, color: "#B0892B", whiteSpace: "nowrap" }}>Tout voir</Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, padding: "18px 20px 6px" }}>
                <div style={{ background: "#0A0A0A", borderRadius: 14, padding: 16, color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -30, right: -22, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.28),transparent 70%)" }} />
                  <span style={{ ...eyebrow("#B79B5E"), position: "relative" }}>Solde validé</span>
                  <div style={{ ...statNumber("#F4ECD7", 27), marginTop: 10, position: "relative" }}>{data.personal.overtime.balance}</div>
                </div>
                <div style={{ background: "#F7F6F2", border: "1px solid #ECEBE4", borderRadius: 14, padding: 16 }}>
                  <span style={eyebrow("#9A998F")}>En attente</span>
                  <div style={{ ...statNumber("#B0892B", 25), marginTop: 10 }}>{data.personal.overtime.pending}</div>
                </div>
                <div style={{ background: "#F7F6F2", border: "1px solid #ECEBE4", borderRadius: 14, padding: 16 }}>
                  <span style={eyebrow("#9A998F")}>Refusées</span>
                  <div style={{ ...statNumber("#5C5A52", 25), marginTop: 10 }}>{data.personal.overtime.refused}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", padding: "6px 20px 4px" }}>
                <div style={{ padding: "12px 0 6px" }}>
                  <span style={eyebrow("#A6A498")}>Détail par projet</span>
                </div>
                {data.personal.overtime.rows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#A6A498", fontSize: 15 }}>Aucune déclaration d&apos;heures supplémentaires</div>
                ) : data.personal.overtime.rows.map(o => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: "1px solid #F2F1EB" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: o.accent, flex: "none" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.project}</div>
                      <div style={{ fontSize: 11.5, color: "#A6A498", marginTop: 1 }}>{o.client}</div>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: o.statusColor, background: o.statusBg, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>{o.statusLabel}</span>
                    <span style={{ ...statNumber("#16150F", 13.5), width: 56, textAlign: "right" }}>{o.hours}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
