"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  /** Date au format YYYY-MM-DD (jamais construite via toISOString côté appelant, pour éviter tout décalage de fuseau horaire). */
  value: string;
  onChange: (value: string) => void;
  /** Désactive la sélection de dates futures — comportement par défaut demandé en l'absence de règle métier existante. */
  disableFuture?: boolean;
  /** Désactive la sélection de dates passées — pour une date de relance, qui n'a de sens qu'aujourd'hui ou plus tard. */
  disablePast?: boolean;
};

const WEEKDAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const POPOVER_WIDTH = 268;
const VIEWPORT_MARGIN = 12;

function parseLocalDate(value: string): { y: number; m: number; d: number } {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m: m - 1, d };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toValue(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function formatDisplay(value: string): string {
  const { y, m, d } = parseLocalDate(value);
  return `${pad2(d)}/${pad2(m + 1)}/${y}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/** Lundi = 0 ... Dimanche = 6 (convention française), pour aligner la grille sous les en-têtes WEEKDAYS. */
function mondayFirstWeekday(y: number, m: number, d: number): number {
  const jsDay = new Date(y, m, d).getDay(); // 0 = dimanche
  return (jsDay + 6) % 7;
}

export default function DatePickerField({ value, onChange, disableFuture = true, disablePast = false }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const today = new Date();
  const todayYMD = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  const [viewY, setViewY] = useState(selected.y);
  const [viewM, setViewM] = useState(selected.m);
  const triggerRef = useRef<HTMLSpanElement>(null);
  // Position calculée depuis la position réelle du déclencheur à l'écran
  // (position: fixed, jamais relative au parent) — un ancrage statique
  // (left:0 ou right:0) déborde selon où le déclencheur tombe dans sa
  // phrase, qui varie d'un usage à l'autre du composant (constaté : ça
  // débordait à droite dans TaskTimeModal, puis à gauche dans TaskWaitModal
  // avec un ancrage fixe opposé — d'où la mesure dynamique).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) { setCoords(null); return; }
    setViewY(selected.y);
    setViewM(selected.m);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
      );
      setCoords({ top: rect.bottom + 8, left });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monthLabel = new Date(viewY, viewM, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const isDisabledDate = (y: number, m: number, d: number) => {
    const t = new Date(y, m, d).getTime();
    const t0 = new Date(todayYMD.y, todayYMD.m, todayYMD.d).getTime();
    if (disableFuture && t > t0) return true;
    if (disablePast && t < t0) return true;
    return false;
  };

  const select = (y: number, m: number, d: number) => {
    if (isDisabledDate(y, m, d)) return;
    onChange(toValue(y, m, d));
    setOpen(false);
  };

  const goToday = () => select(todayYMD.y, todayYMD.m, todayYMD.d);

  const nDays = daysInMonth(viewY, viewM);
  const leadOffset = mondayFirstWeekday(viewY, viewM, 1);
  const prevMonthDays = daysInMonth(viewY, viewM === 0 ? 11 : viewM - 1);

  type Cell = { y: number; m: number; d: number; inMonth: boolean };
  const cells: Cell[] = [];
  for (let i = leadOffset - 1; i >= 0; i--) {
    const m = viewM === 0 ? 11 : viewM - 1;
    const y = viewM === 0 ? viewY - 1 : viewY;
    cells.push({ y, m, d: prevMonthDays - i, inMonth: false });
  }
  for (let d = 1; d <= nDays; d++) cells.push({ y: viewY, m: viewM, d, inMonth: true });
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const nextDate = new Date(last.y, last.m, last.d + 1);
    cells.push({ y: nextDate.getFullYear(), m: nextDate.getMonth(), d: nextDate.getDate(), inMonth: false });
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}
        style={{ color: "#B0892B", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}
      >
        {formatDisplay(value)}
      </span>

      {open && coords && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 95 }} />
          <div className="modal-panel-in" style={{
            position: "fixed", top: coords.top, left: coords.left, zIndex: 96,
            background: "#fff", border: "1px solid #E2E1DA", borderRadius: 12,
            boxShadow: "0 16px 40px -12px rgba(16,15,11,.35)", padding: 14, width: POPOVER_WIDTH,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button
                type="button"
                aria-label="Mois précédent"
                onClick={() => setViewM(m => { if (m === 0) { setViewY(y => y - 1); return 11; } return m - 1; })}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#8C8B83", fontSize: 15, padding: 4 }}
              >‹</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16", textTransform: "capitalize" }}>{monthLabel}</span>
              <button
                type="button"
                aria-label="Mois suivant"
                onClick={() => setViewM(m => { if (m === 11) { setViewY(y => y + 1); return 0; } return m + 1; })}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#8C8B83", fontSize: 15, padding: 4 }}
              >›</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {WEEKDAYS.map(w => (
                <span key={w} style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#A6A498", padding: "4px 0" }}>{w}</span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((c, i) => {
                const isSelected = c.y === selected.y && c.m === selected.m && c.d === selected.d;
                const isToday = c.y === todayYMD.y && c.m === todayYMD.m && c.d === todayYMD.d;
                const disabled = isDisabledDate(c.y, c.m, c.d);
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={disabled}
                    onClick={() => select(c.y, c.m, c.d)}
                    style={{
                      width: "100%", aspectRatio: "1", border: isToday && !isSelected ? "1px solid #C9A24E" : "1px solid transparent",
                      borderRadius: 8, background: isSelected ? "#1C1B16" : "transparent",
                      color: disabled ? "#D6D4CB" : isSelected ? "#F4ECD7" : c.inMonth ? "#33322C" : "#C7C5BB",
                      fontSize: 14.5, fontWeight: isSelected ? 700 : 500,
                      cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goToday}
              style={{
                marginTop: 10, width: "100%", background: "#F0EFEA", border: "1px solid #E5E4DD",
                borderRadius: 8, padding: "7px 0", fontSize: 14, fontWeight: 600, color: "#5C5A52",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Aujourd&apos;hui
            </button>
          </div>
        </>
      )}
    </span>
  );
}
