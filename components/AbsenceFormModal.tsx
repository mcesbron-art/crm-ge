"use client";

import { useState } from "react";
import { ABSENCE_TYPES } from "@/lib/absence-taxonomy";
import DatePickerField from "@/components/DatePickerField";
import { IconX, IconChevronDown as IconChevron } from "@/components/ui/icons";

type Props = {
  onClose: () => void;
  onConfirm: (data: { type: string; startDate: string; endDate: string; days: number }) => Promise<void>;
  initial?: { type: string; startDate: string; endDate: string; days: number };
};

const IconCalendar = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><line x1="3" y1="8.4" x2="17" y2="8.4" /></svg>);

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calendarDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const diff = (Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000;
  return diff + 1;
}

/**
 * "Ajouter une absence" — même recette de panneau latéral que
 * TaskBatSendModal/TaskBillingModal. Le nombre de jours est pré-rempli à
 * partir des dates (jours calendaires inclusifs) mais reste modifiable —
 * la demande peut concerner des jours ouvrés seulement.
 *
 * Réutilisé aussi en mode édition (prop `initial`) par la direction pour
 * corriger une absence déjà validée — voir AbsenceDetailModal.
 */
export default function AbsenceFormModal({ onClose, onConfirm, initial }: Props) {
  const isEdit = !!initial;
  const [type, setType] = useState<string>(initial?.type ?? ABSENCE_TYPES[0].value);
  const [typeOpen, setTypeOpen] = useState(false);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayLocal());
  const [endDate, setEndDate] = useState(initial?.endDate ?? todayLocal());
  const [days, setDays] = useState(String(initial?.days ?? calendarDays(todayLocal(), todayLocal())));
  const [daysTouched, setDaysTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDates = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    if (!daysTouched) setDays(String(calendarDays(nextStart, nextEnd)));
  };

  const daysNum = Number(days);
  const canSave = !saving && !!type && !!startDate && !!endDate && endDate >= startDate && Number.isFinite(daysNum) && daysNum > 0;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ type, startDate, endDate, days: daysNum });
      setSaved(true);
      setTimeout(onClose, 850);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.45)", zIndex: 90, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isEdit ? "Modifier l'absence" : "Ajouter une absence"} className="modal-slide-in" style={{ width: 460, maxWidth: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconCalendar /></span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>{isEdit ? "Modifier l'absence" : "Ajouter une absence"}</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 17 }}>
          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 7 }}>Type d&apos;absence</label>
            <div style={{ position: "relative" }}>
              <div onClick={() => setTypeOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${typeOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
                <span style={{ fontSize: 15.5, color: "#1C1B16", fontWeight: 600 }}>{ABSENCE_TYPES.find(t => t.value === type)?.label}</span>
                <IconChevron />
              </div>
              {typeOpen && (
                <>
                  <div onClick={() => setTypeOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                  <div style={{ position: "absolute", top: 48, left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 280, overflowY: "auto" }}>
                    {ABSENCE_TYPES.map(t => (
                      <div key={t.value} onClick={() => { setType(t.value); setTypeOpen(false); }} style={{ padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: type === t.value ? 700 : 500, color: "#33322C", background: type === t.value ? "#F5F4EF" : "transparent" }}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Date de début</label>
              <DatePickerField value={startDate} onChange={v => applyDates(v, endDate)} disableFuture={false} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Date de fin</label>
              <DatePickerField value={endDate} onChange={v => applyDates(startDate, v)} disableFuture={false} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Nombre de jours</label>
            <input type="number" min={0.5} step={0.5} value={days} onChange={e => { setDays(e.target.value); setDaysTouched(true); }} placeholder="Ex. 5" style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" }} />
          </div>

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
          {!isEdit && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#8C8B83" }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#B0892B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" /></svg>
              Envoyé pour validation à la direction
            </span>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: 10, borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={submit} disabled={!canSave} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: 10, borderRadius: 10, cursor: canSave ? "pointer" : "default", border: "none", fontFamily: "inherit", opacity: canSave ? 1 : 0.6 }}>
              {isEdit
                ? (saved ? "Modifié ✓" : saving ? "Enregistrement…" : "Enregistrer les modifications")
                : (saved ? "Demande envoyée ✓" : saving ? "Envoi…" : "Envoyer la demande")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
