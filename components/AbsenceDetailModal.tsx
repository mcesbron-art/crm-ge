"use client";

import { useState } from "react";
import { ABSENCE_TYPE_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_COLOR } from "@/lib/absence-taxonomy";
import { IconX } from "@/components/ui/icons";

type Absence = {
  id: string; type: string; startDate: string; endDate: string; days: number; status: string;
  createdAt: string; processedAt: string | null;
  collaborateur: { id: string; nom: string; color: string | null } | null;
  processedByNom: string | null;
};

type Props = {
  absence: Absence;
  canManage: boolean;
  canEditValidated: boolean;
  onClose: () => void;
  onValidate: () => Promise<void>;
  onReject: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
};

const IconPencil = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 3.5l3 3L6 17H3v-3z" /></svg>);
const IconTrash = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6m-7 0 .6 10a1.4 1.4 0 001.4 1.3h4a1.4 1.4 0 001.4-1.3L15 6" /></svg>);

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Détail d'une demande d'absence — s'ouvre au clic sur une ligne du
 * tableau, aussi bien en vue Direction/Admin (boutons Valider/Refuser)
 * qu'en vue Collaborateur (lecture seule sur ses propres demandes, pas de
 * bouton d'action). Même recette de panneau latéral que les autres
 * détails de l'app (BillingRequestDrawer, TaskBatResultModal…).
 *
 * Une fois l'absence validée, seule la direction (canEditValidated — PAS
 * l'admin, cf. app/api/absences/[id]/route.ts) peut encore la modifier ou
 * la supprimer, pour corriger une erreur ou annuler un congé déjà acté.
 */
export default function AbsenceDetailModal({ absence, canManage, canEditValidated, onClose, onValidate, onReject, onEdit, onDelete }: Props) {
  const [saving, setSaving] = useState<"validate" | "reject" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const statusColor = REQUEST_STATUS_COLOR[absence.status] ?? REQUEST_STATUS_COLOR.attente;
  const canAct = canManage && absence.status === "attente";
  const canEdit = canEditValidated && absence.status === "validee";

  const run = async (action: "validate" | "reject") => {
    if (saving) return;
    setSaving(action);
    setError(null);
    try {
      await (action === "validate" ? onValidate() : onReject());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      setSaving(null);
    }
  };

  const runDelete = async () => {
    if (saving) return;
    setSaving("delete");
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la suppression");
      setSaving(null);
      setDeleteConfirm(false);
    }
  };

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 90, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Détail de l'absence" className="modal-slide-in" style={{ width: 460, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <span onClick={onClose} style={{ position: "absolute", top: 18, right: 18, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: statusColor.color, background: `${statusColor.color}26`, borderRadius: 99, padding: "3px 10px", position: "relative" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor.dot }} />
            {REQUEST_STATUS_LABEL[absence.status] ?? absence.status}
          </span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", marginTop: 12, lineHeight: 1.25, position: "relative" }}>{ABSENCE_TYPE_LABEL[absence.type] ?? absence.type}</div>
          <div style={{ fontSize: 15, color: "#AEA890", marginTop: 5, position: "relative" }}>{fmtDate(absence.startDate)} → {fmtDate(absence.endDate)}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", background: absence.collaborateur?.color ?? "#8C846F", flex: "none" }}>{getInitials(absence.collaborateur?.nom ?? "—")}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16" }}>{absence.collaborateur?.nom ?? "—"}</div>
              <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 1 }}>Demandeur</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 }}>
              <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Date de la demande</div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1B16", marginTop: 6 }}>{fmtDate(absence.createdAt)}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 }}>
              <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Nombre de jours</div>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: "#1C1B16", marginTop: 6 }}>{absence.days}</div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
            <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Période</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>Du {fmtDate(absence.startDate)} au {fmtDate(absence.endDate)}</div>
          </div>

          {absence.processedByNom && (
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
              <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Traitée par</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>{absence.processedByNom}{absence.processedAt ? ` · ${fmtDateTime(absence.processedAt)}` : ""}</div>
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          {canAct ? (
            <>
              <button onClick={() => run("reject")} disabled={!!saving} style={{ flex: 1, background: "#fff", border: "1.5px solid #C2410C", color: "#C2410C", fontSize: 15, fontWeight: 700, padding: 10, borderRadius: 10, cursor: saving ? "default" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                {saving === "reject" ? "…" : "Refuser"}
              </button>
              <button onClick={() => run("validate")} disabled={!!saving} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(135deg,#3FBF77,#1F8A5B)", color: "#fff", fontSize: 15, fontWeight: 700, padding: 10, borderRadius: 10, cursor: saving ? "default" : "pointer", border: "none", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                {saving === "validate" ? "…" : "Valider"}
              </button>
            </>
          ) : canEdit && deleteConfirm ? (
            <>
              <span style={{ flex: 1, display: "flex", alignItems: "center", fontSize: 14, color: "#B91C1C", fontWeight: 600 }}>Supprimer définitivement cette absence ?</span>
              <button onClick={() => setDeleteConfirm(false)} disabled={saving === "delete"} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Non</button>
              <button onClick={runDelete} disabled={saving === "delete"} style={{ background: "#B91C1C", color: "#fff", fontSize: 15, fontWeight: 700, padding: "10px 16px", borderRadius: 10, cursor: saving === "delete" ? "default" : "pointer", border: "none", fontFamily: "inherit", opacity: saving === "delete" ? 0.6 : 1 }}>
                {saving === "delete" ? "…" : "Oui, supprimer"}
              </button>
            </>
          ) : canEdit ? (
            <>
              <button onClick={() => setDeleteConfirm(true)} title="Supprimer" style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #E2E1DA", color: "#C2410C", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
                <IconTrash />Supprimer
              </button>
              <button onClick={onEdit} title="Modifier" style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
                <IconPencil />Modifier
              </button>
              <button onClick={onClose} style={{ flex: 1, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, cursor: "pointer", border: "none", fontFamily: "inherit" }}>Fermer</button>
            </>
          ) : (
            <button onClick={onClose} style={{ flex: 1, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, cursor: "pointer", border: "none", fontFamily: "inherit" }}>Fermer</button>
          )}
        </div>
      </div>
    </div>
  );
}
