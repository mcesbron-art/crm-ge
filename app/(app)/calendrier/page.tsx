"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/* ─── Constants ─── */
const AV: Record<string, string> = {
  N: "#7C3AED", AD: "#0E7C66", T: "#2563EB", NK: "#BE185D", J: "#16A34A",
};
const ROSTER: Record<string, string> = {
  N: "Nina R.", AD: "Adèle D.", T: "Thomas L.", NK: "Naïma K.", J: "Julien P.",
};
const ORDER = ["N", "AD", "T", "NK", "J"];
const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const MONTHS_SHORT = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const DAYS_SHORT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const H0 = 8, H1 = 19, HH = 56; // hour height in px
const ACCENT = "#C9A24E";

/* ─── Types ─── */
type CalEvent = {
  id: number;
  date: Date;
  start: number;
  end: number;
  title: string;
  sub: string;
  owners: string[];
  online: boolean;
};
type PackedEvent = CalEvent & { _lane: number; _lanes: number };

/* ─── Event data ─── */
let _uid = 0;
function ev(y: number, m: number, d: number, start: number, end: number, title: string, sub: string, owners: string[], online: boolean): CalEvent {
  return { id: ++_uid, date: new Date(y, m, d), start, end, title, sub, owners, online };
}
const EVENTS: CalEvent[] = [
  ev(2026,5,29,9,9.5,"Point équipe hebdo","Teams · Toute l'équipe",["T","NK","AD","J","N"],true),
  ev(2026,5,29,10,11.5,"RDV Maison Relais — panier","Teams · Visio client",["T"],true),
  ev(2026,5,29,11.75,13,"Maquettes page panier","Maison Relais Gourmet",["T"],false),
  ev(2026,5,29,14,15,"Brief newsletter","Maison Relais Gourmet",["NK"],false),
  ev(2026,5,29,9.5,12.5,"Shooting produits","InterLoire · Sur site",["J"],false),
  ev(2026,5,29,15,17,"Calibrage colorimétrie","InterLoire",["J"],false),
  ev(2026,5,30,9.5,11,"Déclinaisons logo","BÉRYL Patrimoine",["T"],false),
  ev(2026,5,30,11,12,"Call BÉRYL — charte","Teams · Visio client",["N"],true),
  ev(2026,5,30,14,16,"Charte graphique v2","BÉRYL Patrimoine",["N"],false),
  ev(2026,5,30,10,12,"Intégration responsive","Netzy — Refonte",["AD"],false),
  ev(2026,5,30,16,17,"Revue BAT Netzy","Teams · Visio interne",["AD","T"],true),
  ev(2026,6,1,9,10,"RDV Studio Mira — storyboard","Teams · Visio client",["NK"],true),
  ev(2026,6,1,10.5,12.5,"Storyboard film de marque","Studio Mira",["NK"],false),
  ev(2026,6,1,14,15.5,"Planning éditorial juillet","InterLoire",["NK"],false),
  ev(2026,6,1,13.5,15,"Intégration responsive (suite)","Netzy — Refonte",["AD"],false),
  ev(2026,6,2,9,9.5,"Point équipe hebdo","Teams · Toute l'équipe",["T","NK","AD","J","N"],true),
  ev(2026,6,2,10,12,"Cadrage refonte newsletter","Maison Relais Gourmet",["NK"],false),
  ev(2026,6,2,14,17,"Maquettes UI/UX home","Netzy — Refonte",["T"],false),
  ev(2026,6,2,11,12,"RDV InterLoire — planning","Teams · Visio client",["J","NK"],true),
  ev(2026,6,3,9.5,11,"Recette intégration mobile","Netzy — Refonte",["AD"],false),
  ev(2026,6,3,11,12,"Envoi BAT clients","Diffusion",["T"],false),
  ev(2026,6,3,14,15,"Rétro hebdo","Teams · Toute l'équipe",["T","NK","AD","J","N"],true),
  ev(2026,5,17,10,12,"Atelier marque","Studio Mira",["NK"],false),
  ev(2026,5,18,14,16,"Campagne emailing juin","Maison Relais",["NK"],false),
  ev(2026,5,19,9,10,"Point mensuel direction","Teams · Visio",["T","N"],true),
  ev(2026,5,22,10,12,"Kickoff Netzy refonte","Netzy · Visio",["T","AD"],true),
  ev(2026,5,23,9.5,12.5,"Shooting Vins d'Anjou","InterLoire · Sur site",["J"],false),
  ev(2026,5,24,14,17,"Maquettes UI/UX home","Netzy — Refonte",["T"],false),
  ev(2026,5,25,10,11.5,"Calibrage photos","InterLoire",["J"],false),
  ev(2026,5,26,14,16,"Revue charte v2","BÉRYL Patrimoine",["N"],false),
];

/* ─── Helpers ─── */
function mondayOf(d: Date): Date {
  const c = new Date(d);
  const off = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - off);
  c.setHours(0, 0, 0, 0);
  return c;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtH(dec: number): string {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}
function packDay(list: CalEvent[]): PackedEvent[] {
  const evs = list.slice().sort((a, b) => a.start - b.start || a.end - b.end) as PackedEvent[];
  let cluster: PackedEvent[] = [], clusterEnd = -1;
  const flush = () => {
    const cols: number[] = [];
    cluster.forEach((e) => {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i] <= e.start + 0.001) { e._lane = i; cols[i] = e.end; placed = true; break; }
      }
      if (!placed) { e._lane = cols.length; cols.push(e.end); }
    });
    cluster.forEach((e) => (e._lanes = cols.length));
    cluster = [];
  };
  evs.forEach((e) => {
    if (cluster.length === 0) { cluster.push(e); clusterEnd = e.end; return; }
    if (e.start >= clusterEnd - 0.001) { flush(); cluster.push(e); clusterEnd = e.end; }
    else { cluster.push(e); clusterEnd = Math.max(clusterEnd, e.end); }
  });
  if (cluster.length) flush();
  return evs;
}

/* ─── Nav Button ─── */
function NavBtn({ onClick, children, label }: { onClick: () => void; children?: React.ReactNode; label?: string }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 34, padding: label ? "0 14px" : "0",
        width: label ? "auto" : 34,
        borderRadius: 9, border: `1px solid ${h ? ACCENT : "#E6E5DE"}`,
        background: "#fff", color: h ? "#16150F" : "#5C5A52",
        cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 600,
        transition: "border-color .1s, color .1s",
      }}
    >
      {children || label}
    </button>
  );
}

/* ─── Event Block (week view) ─── */
function EventBlock({ event, H0, HH, onClick }: { event: PackedEvent; H0: number; HH: number; onClick: () => void }) {
  const [h, setH] = useState(false);
  const color = AV[event.owners[0]] || ACCENT;
  const onePct = 100 / (event._lanes || 1);
  const dur = event.end - event.start;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        position: "absolute",
        top: (event.start - H0) * HH,
        height: Math.max(20, dur * HH - 4),
        left: `calc(${event._lane * onePct}% + 3px)`,
        width: `calc(${onePct}% - 6px)`,
        background: color + "1A",
        borderLeft: `3px solid ${color}`,
        borderRadius: 7,
        padding: "5px 7px",
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: h ? "0 8px 18px -8px rgba(20,20,15,.32)" : "0 1px 2px rgba(20,20,15,.05)",
        transform: h ? "translateY(-1px)" : "none",
        zIndex: h ? 5 : 1,
        transition: "transform .12s ease, box-shadow .12s ease",
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, fontSize: 12.5, fontWeight: 600, color }}>
        {event.online && (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4.5M13 6V4.5"/>
          </svg>
        )}
        {fmtH(event.start)} – {fmtH(event.end)}
      </div>
      <div style={{ fontSize: 12.5, color: "#8C8B83", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.sub}</div>
    </div>
  );
}

/* ─── Event Modal ─── */
function EventModal({ evId, onClose }: { evId: number; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const me = EVENTS.find((e) => e.id === evId);
  if (!me) return null;

  const color = AV[me.owners[0]] || ACCENT;
  const d = me.date;
  const dateLabel = `${DAYS_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const timeLabel = `${fmtH(me.start)} – ${fmtH(me.end)}`;

  return createPortal(
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(10,10,8,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 32, fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-panel-in" style={{ width: 480, maxHeight: "90vh", overflowY: "auto", background: "#F5F5F2", borderRadius: 20, boxShadow: "0 40px 90px -34px rgba(0,0,0,.6)", border: "1px solid rgba(0,0,0,.06)" }}>
        {/* Header */}
        <div style={{ background: "#0A0A0A", padding: "20px 22px", borderRadius: "20px 20px 0 0", borderTop: `4px solid ${color}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color, marginBottom: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                {me.online ? "Réunion en visio" : "Événement"}
              </div>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 21, fontWeight: 800, color: "#F4ECD7", lineHeight: 1.2 }}>{me.title}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9A988F", background: "#161512", border: "1px solid #242220", fontSize: 15, lineHeight: 1, flex: "none", fontFamily: "inherit" }}>✕</button>
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", border: "1px solid #EAE9E3", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "#B08D32" }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.6 1.6"/></svg>
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16" }}>{dateLabel}</div>
              <div style={{ fontSize: 14.5, color: "#8C8B83" }}>{timeLabel}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", border: "1px solid #EAE9E3", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "#B08D32" }}>
              {me.online ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4.5M13 6V4.5"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5c3 0 5.5 2.4 5.5 5.4 0 3.6-5.5 9.6-5.5 9.6S4.5 11.5 4.5 7.9C4.5 4.9 7 2.5 10 2.5Z"/><circle cx="10" cy="8" r="1.8"/></svg>
              )}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16" }}>{me.online ? "Microsoft Teams" : "Sur site / agence"}</div>
              <div style={{ fontSize: 14.5, color: "#8C8B83" }}>{me.sub}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, letterSpacing: ".13em", textTransform: "uppercase" as const, color: "#9A998F", fontWeight: 700, marginBottom: 10 }}>Participants</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {me.owners.map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: AV[k] || "#999", flex: "none" }}>{k}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#33322C" }}>{ROSTER[k] || k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "16px 22px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", borderRadius: "0 0 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "#8C8B83", fontWeight: 600 }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: "#0F6CBD", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M3.6 6.2 10 11l6.4-4.8"/></svg>
            </span>
            Synchronisé via Outlook
          </span>
          <button onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", border: "1px solid #0A0A0A", fontSize: 15, fontWeight: 600, padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
            Ouvrir dans Outlook
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Page principale ─── */
export default function CalendrierPage() {
  const [view, setView] = useState<"semaine" | "mois">("semaine");
  const [active, setActive] = useState<Record<string, boolean>>(() => {
    const a: Record<string, boolean> = {};
    ORDER.forEach((k) => (a[k] = true));
    return a;
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [modalId, setModalId] = useState<number | null>(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;

  const allOn = ORDER.every((k) => active[k]);
  const toggleCollab = (k: string) => setActive((a) => ({ ...a, [k]: !a[k] }));
  const setAll = () => { const a: Record<string, boolean> = {}; ORDER.forEach((k) => (a[k] = true)); setActive(a); };

  const visibleEvents = EVENTS.filter((e) => e.owners.some((o) => active[o]));

  // ── Week view ──
  const DAY_COUNT = 5;
  const weekStart = mondayOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7));
  const days = Array.from({ length: DAY_COUNT }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const isToday = sameDay(date, today);
    const events = packDay(visibleEvents.filter((e) => sameDay(e.date, date)));
    return { date, isToday, events };
  });
  const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
  const gridHeightPx = (H1 - H0) * HH;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + DAY_COUNT - 1);
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
    : `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  // ── Month view ──
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const mM = base.getMonth(), mY = base.getFullYear();
  const firstMon = mondayOf(base);
  const monthLastDay = new Date(mY, mM + 1, 0);
  const totalCells = Math.ceil((monthLastDay.getDate() + (base.getDay() + 6) % 7) / 7) * 7;
  const monthWeeks = Array.from({ length: totalCells / 7 }, (_, w) =>
    Array.from({ length: 7 }, (_, di) => {
      const cellDate = new Date(firstMon);
      cellDate.setDate(firstMon.getDate() + w * 7 + di);
      const inMonth = cellDate.getMonth() === mM;
      const isToday = sameDay(cellDate, today);
      const evs = visibleEvents.filter((e) => sameDay(e.date, cellDate)).sort((a, b) => a.start - b.start);
      return { date: cellDate, inMonth, isToday, events: evs };
    })
  );
  const monthLabel = MONTHS[mM].charAt(0).toUpperCase() + MONTHS[mM].slice(1) + " " + mY;

  const rangeLabel = view === "semaine" ? weekLabel : monthLabel;
  const prev = () => view === "semaine" ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1);
  const next = () => view === "semaine" ? setWeekOffset((w) => w + 1) : setMonthOffset((m) => m + 1);
  const goToday = () => { setWeekOffset(0); setMonthOffset(0); };

  const GRID_COLS = `64px repeat(${DAY_COUNT}, 1fr)`;

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>

      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Calendrier</h1>
            <div style={{ fontSize: 15.5, color: "#8C8B83", marginTop: 5 }}>
              Calendriers d'équipe synchronisés via Microsoft Outlook · {visibleEvents.length} événements affichés
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Outlook sync badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "8px 13px" }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: "#0F6CBD", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="14" height="11" rx="2"/><path d="M3.6 6.2 10 11l6.4-4.8"/>
                </svg>
              </span>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#33322C" }}>Microsoft Outlook</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#1F8A5B", fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1F8A5B" }} />
                  Synchronisé · il y a 4 min
                </div>
              </div>
            </div>
            {/* View toggle */}
            <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E5E4DD", borderRadius: 10, padding: 3, gap: 2 }}>
              <button onClick={() => setView("semaine")} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit", background: view === "semaine" ? "#0A0A0A" : "transparent", color: view === "semaine" ? "#E4C77B" : "#8C8B83", transition: "all .15s" }}>Semaine</button>
              <button onClick={() => setView("mois")} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit", background: view === "mois" ? "#0A0A0A" : "transparent", color: view === "mois" ? "#E4C77B" : "#8C8B83", transition: "all .15s" }}>Mois</button>
            </div>
            {/* New event */}
            <button style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15.5, fontWeight: 600, padding: "10px 17px", borderRadius: 10, cursor: "pointer", border: "1px solid #0A0A0A", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouvel événement
            </button>
          </div>
        </div>

        {/* Collaborator filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#fff", border: "1px solid #EAE9E3", borderRadius: 14, padding: "13px 16px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#A09E92" }}>Calendriers</span>
          <button onClick={setAll} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid", color: allOn ? "#1A1206" : "#7C7B73", background: allOn ? ACCENT : "#fff", borderColor: allOn ? ACCENT : "#EAE9E3", transition: "all .12s" }}>Tous</button>
          <span style={{ width: 1, height: 22, background: "#EAE9E3", flex: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {ORDER.map((k) => {
              const on = active[k];
              return (
                <button key={k} onClick={() => toggleCollab(k)} title={ROSTER[k]} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 13px 5px 5px", borderRadius: 99, cursor: "pointer", background: on ? "#FBFAF6" : "#fff", border: `1.5px solid ${on ? ACCENT : "#EAE9E3"}`, fontFamily: "inherit", transition: "all .12s ease" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: AV[k], opacity: on ? 1 : 0.35 }}>{k}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: on ? "#1C1B16" : "#A6A498" }}>{ROSTER[k]}</span>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: AV[k] }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar card */}
        <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", overflow: "hidden" }}>

          {/* Nav header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid #EFEEE8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NavBtn onClick={prev}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
              </NavBtn>
              <NavBtn onClick={next}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l5 5-5 5"/></svg>
              </NavBtn>
              <NavBtn onClick={goToday} label="Aujourd'hui" />
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 21, fontWeight: 700, color: "#16150F", margin: "0 0 0 6px", letterSpacing: "-.01em" }}>{rangeLabel}</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, color: "#A09E92", fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#9A998F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4.5M13 6V4.5"/></svg>
                Visio Teams
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#9A998F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5c3 0 5.5 2.4 5.5 5.4 0 3.6-5.5 9.6-5.5 9.6S4.5 11.5 4.5 7.9C4.5 4.9 7 2.5 10 2.5Z"/><circle cx="10" cy="8" r="1.8"/></svg>
                Sur site
              </span>
            </div>
          </div>

          {/* ── WEEK VIEW ── */}
          {view === "semaine" && (
            <div>
              {/* Day header */}
              <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, borderBottom: "1px solid #EFEEE8", background: "#FAFAF7" }}>
                <div style={{ borderRight: "1px solid #EFEEE8" }} />
                {days.map((day, i) => (
                  <div key={i} style={{ padding: "11px 8px", textAlign: "center" as const, borderRight: i < days.length - 1 ? "1px solid #EFEEE8" : "none" }}>
                    <div style={{ fontSize: 12.5, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: day.isToday ? "#B08D32" : "#A09E92" }}>{DAYS_SHORT[i]}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 30, height: 30, marginTop: 4, borderRadius: 9, fontSize: 15, fontWeight: 800, color: day.isToday ? "#1A1206" : "#33322C", background: day.isToday ? ACCENT : "transparent", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      {day.date.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Time grid */}
              <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, maxHeight: 582, overflowY: "auto" }}>
                {/* Time axis */}
                <div style={{ position: "relative", height: gridHeightPx, borderRight: "1px solid #EFEEE8" }}>
                  {hours.map((h) => (
                    <div key={h} style={{ position: "absolute", top: (h - H0) * HH, right: 8, transform: "translateY(-7px)", fontSize: 12.5, fontWeight: 600, color: "#B4B2A7" }}>
                      {(h < 10 ? "0" : "") + h}:00
                    </div>
                  ))}
                </div>
                {/* Day columns */}
                {days.map((day, di) => {
                  const showNow = day.isToday && weekOffset === 0 && nowH >= H0 && nowH <= H1;
                  return (
                    <div key={di} style={{
                      position: "relative", height: gridHeightPx,
                      borderRight: di < days.length - 1 ? "1px solid #EFEEE8" : "none",
                      background: day.isToday ? "rgba(201,162,78,.04)" : "#fff",
                      backgroundImage: `repeating-linear-gradient(to bottom, #F2F1EB 0, #F2F1EB 1px, transparent 1px, transparent ${HH}px)`,
                    }}>
                      {day.events.map((e) => (
                        <EventBlock key={e.id} event={e as PackedEvent} H0={H0} HH={HH} onClick={() => setModalId(e.id)} />
                      ))}
                      {showNow && (
                        <div style={{ position: "absolute", left: 0, right: 0, top: (nowH - H0) * HH, height: 0, borderTop: "2px solid #C2530B", zIndex: 6, pointerEvents: "none" }}>
                          <span style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#C2530B" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MONTH VIEW ── */}
          {view === "mois" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #EFEEE8", background: "#FAFAF7" }}>
                {DAYS_SHORT.map((d) => (
                  <div key={d} style={{ padding: "10px 8px", textAlign: "center" as const, fontSize: 12.5, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: "#A09E92" }}>{d}</div>
                ))}
              </div>
              {monthWeeks.map((week, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < monthWeeks.length - 1 ? "1px solid #EFEEE8" : "none" }}>
                  {week.map((cell, ci) => {
                    const shown = cell.events.slice(0, 3);
                    const more = cell.events.length - 3;
                    return (
                      <div key={ci} style={{ minHeight: 118, borderRight: ci < 6 ? "1px solid #EFEEE8" : "none", padding: 8, background: cell.inMonth ? "#fff" : "#FAFAF7", display: "flex", flexDirection: "column" as const, gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 26, borderRadius: 8, fontSize: 15, fontWeight: 700, color: cell.isToday ? "#1A1206" : (cell.inMonth ? "#33322C" : "#C0BEB3"), background: cell.isToday ? ACCENT : "transparent", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                            {cell.date.getDate()}
                          </span>
                        </div>
                        {shown.map((e) => {
                          const color = AV[e.owners[0]] || ACCENT;
                          const timeShort = fmtH(e.start).replace(":00", "h").replace(":30", "h30");
                          return (
                            <div key={e.id} onClick={() => setModalId(e.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: color + "1A", borderLeft: `3px solid ${color}`, borderRadius: 5, padding: "3px 6px", cursor: "pointer", overflow: "hidden" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color, flex: "none" }}>{timeShort}</span>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#33322C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                            </div>
                          );
                        })}
                        {more > 0 && (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#A09E92", paddingLeft: 4 }}>+ {more} autre{more > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Event modal */}
      {modalId !== null && <EventModal evId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
