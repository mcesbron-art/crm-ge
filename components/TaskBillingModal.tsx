"use client";

import { useState } from "react";
import { TASK_BILLING_TYPES } from "@/lib/task-taxonomy";

type Props = {
  taskLabel: string;
  onClose: () => void;
  onConfirm: (data: { billingType: string }) => Promise<void>;
};

const IconX = () => (<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>);

/**
 * Ouverte au glisser-déposer d'une carte vers "Facturation", ou au clic sur
 * "Envoyer en facturation" dans le détail de la tâche — le déplacement/la
 * demande n'est confirmé(e) qu'à la validation de cette modale. Même
 * recette visuelle que TaskWaitModal, contenu volontairement réduit : le
 * collaborateur ne choisit QUE le type de facture, jamais le montant, le
 * pourcentage ni aucune information comptable — celles-ci sont réservées à
 * direction/admin depuis l'onglet Facturation.
 */
export default function TaskBillingModal({ taskLabel, onClose, onConfirm }: Props) {
  const [billingType, setBillingType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !!billingType && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ billingType: billingType! });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 95, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Envoyer en facturation" className="modal-slide-in" style={{ width: 440, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 13, color: "#9A9078", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Envoyer en facturation</span>
            <span onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer", flex: "none" }}><IconX /></span>
          </div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", marginTop: 12, lineHeight: 1.25, position: "relative" }}>{taskLabel}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 8 }}>Type de facture</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TASK_BILLING_TYPES.map(t => {
                const on = billingType === t.value;
                return (
                  <span
                    key={t.value}
                    onClick={() => setBillingType(t.value)}
                    role="radio"
                    aria-checked={on}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBillingType(t.value); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, fontSize: 15.5, fontWeight: 600, cursor: "pointer",
                      color: on ? "#fff" : "#33322C", background: on ? "#0A0A0A" : "#fff", border: `1.5px solid ${on ? "#0A0A0A" : "#E5E4DD"}`,
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${on ? "#C9A24E" : "#D6D4CB"}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A24E" }} />}
                    </span>
                    {t.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: 14, color: "#A6A498", lineHeight: 1.5 }}>
            Le montant, le n° et la date de facture seront renseignés par la comptabilité depuis l&apos;onglet Facturation.
          </div>

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={submit} disabled={!canSave} style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: "9px 20px", borderRadius: 10, cursor: canSave ? "pointer" : "default", border: "none", fontFamily: "inherit", opacity: canSave ? 1 : 0.6 }}>
            {saving ? "Envoi…" : "Envoyer en facturation"}
          </button>
        </div>
      </div>
    </div>
  );
}
