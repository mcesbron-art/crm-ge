"use client";

import { useState } from "react";
import { IconX } from "@/components/ui/icons";

type Props = {
  taskLabel: string;
  onClose: () => void;
  onConfirm: (data: { link: string | null; comment: string | null }) => Promise<void>;
};


function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Ouverte au glisser-déposer d'une carte vers "BAT envoyé", ou au clic sur
 * "Enregistrer l'envoi du BAT" dans le détail de la tâche — le déplacement
 * n'est confirmé qu'à la validation de cette modale. Même recette visuelle
 * que TaskWaitModal/TaskBillingModal. La version est calculée côté serveur
 * (max(version)+1 pour la tâche) — pas de champ à remplir.
 */
export default function TaskBatSendModal({ taskLabel, onClose, onConfirm }: Props) {
  const [link, setLink] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ link: link.trim() || null, comment: comment.trim() || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 95, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Enregistrer l'envoi du BAT" className="modal-slide-in" style={{ width: 440, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 13, color: "#9A9078", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Enregistrer l&apos;envoi du BAT</span>
            <span onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer", flex: "none" }}><IconX /></span>
          </div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", marginTop: 12, lineHeight: 1.25, position: "relative" }}>{taskLabel}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 15, color: "#5C5A52", lineHeight: 1.5, textTransform: "capitalize" }}>
            Envoi enregistré le {todayLabel()}.
          </div>

          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Lien vers le BAT (optionnel)</label>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }} />
          </div>

          {showComment ? (
            <div>
              <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Commentaire (optionnel)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Précisions…" style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none", resize: "vertical" }} />
              {!comment.trim() && <span onClick={() => setShowComment(false)} style={{ display: "inline-block", marginTop: 6, fontSize: 14, color: "#A6A498", cursor: "pointer" }}>Masquer</span>}
            </div>
          ) : (
            <span onClick={() => setShowComment(true)} style={{ fontSize: 15, fontWeight: 600, color: "#B0892B", cursor: "pointer", width: "fit-content" }}>+ Ajouter un commentaire</span>
          )}

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={submit} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: "9px 20px", borderRadius: 10, cursor: saving ? "default" : "pointer", border: "none", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Envoi…" : "Enregistrer l'envoi"}
          </button>
        </div>
      </div>
    </div>
  );
}
