"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { COLORS, COLLABORATEURS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useBats, type Bat, type BatStatut, BAT_MAX_SIZE } from "@/lib/bat-context";
import BatPanel from "@/components/BatPanel";

// Tâches en attente (sans BAT) — restera statique pour la démo.
const PENDING_TASKS = [
  { id: 101, taskName: "Maquettes site e-commerce", projet: "Maison Relais Gourmet", client: "MRG", collabId: 1 },
  { id: 102, taskName: "Charte graphique",          projet: "BÉRYL Patrimoine",      client: "BÉRYL", collabId: 1 },
];

const STATUT_STYLES: Record<BatStatut, { bg: string; color: string; label: string }> = {
  envoye:   { bg: "#E1F5FE",      color: "#0277BD",    label: "En attente client" },
  valide:   { bg: COLORS.vertBg,  color: "#1B5E20",    label: "Validé / signé" },
  modifier: { bg: COLORS.rougeBg, color: COLORS.rouge, label: "À modifier" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function BatPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const { bats, hydrated, createBat, storageError, clearStorageError } = useBats();
  const [filter, setFilter] = useState<BatStatut | "all">("all");
  const [expandedBatId, setExpandedBatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageBat = canSeeMoney; // Direction + Admin

  if (!hydrated) {
    return (
      <div className="animate-fadeIn" style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen }}>
        Chargement…
      </div>
    );
  }

  const filtered = filter === "all" ? bats : bats.filter((b) => b.statut === filter);

  const stats = {
    total:    bats.length,
    envoye:   bats.filter((b) => b.statut === "envoye").length,
    valide:   bats.filter((b) => b.statut === "valide").length,
    modifier: bats.filter((b) => b.statut === "modifier").length,
  };

  const handleNewBatFromTask = (task: typeof PENDING_TASKS[number], file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > BAT_MAX_SIZE) {
      setError(`Fichier trop lourd (max ${formatSize(BAT_MAX_SIZE)}).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        createBat({
          taskId: task.id,
          taskName: task.taskName,
          projet: task.projet,
          client: task.client,
          collabId: task.collabId,
          pdfName: file.name,
          pdfDataUrl: reader.result as string,
          pdfSize: file.size,
          uploadedBy: currentUser.nom,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la création du BAT.");
      }
    };
    reader.onerror = () => setError("Erreur de lecture du fichier.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
        }}>BAT — Bons à tirer</h1>
        <p style={{ color: COLORS.grisMoyen, fontSize: 16, margin: 0 }}>
          Upload des PDF · génération de lien public client · validation par signature
        </p>
      </div>

      {(error || storageError) && (
        <div style={{
          padding: "12px 16px", marginBottom: 16,
          background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}44`,
          borderRadius: 10, color: COLORS.rouge, fontSize: 15, fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <span>{error || storageError}</span>
          <button
            onClick={() => { setError(null); clearStorageError(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.rouge, fontSize: 18 }}
          >×</button>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total BAT",         value: stats.total,    accent: true },
          { label: "En attente client", value: stats.envoye,   color: "#0277BD" },
          { label: "Validés",           value: stats.valide,   color: COLORS.vert },
          { label: "À modifier",        value: stats.modifier, color: COLORS.rouge },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.accent ? COLORS.noir : COLORS.blanc,
            borderRadius: 14, padding: "20px",
            border: kpi.accent ? "none" : `1px solid ${COLORS.grisBorder}`,
          }}>
            <div style={{
              fontSize: 13, color: kpi.accent ? "#888" : COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 32, fontWeight: 700,
              color: kpi.accent ? COLORS.dore : kpi.color,
              fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
            }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* À UPLOADER */}
      {canManageBat && PENDING_TASKS.length > 0 && (
        <div style={{
          background: COLORS.dorePale, border: `1px solid ${COLORS.dore}55`,
          borderRadius: 14, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.dore, marginBottom: 10 }}>
            ▲ Tâches en attente d&apos;envoi de BAT ({PENDING_TASKS.length})
          </div>
          {PENDING_TASKS.map((task) => {
            const collab = COLLABORATEURS.find((c) => c.id === task.collabId);
            return (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0", fontSize: 15,
              }}>
                <Avatar collab={collab} size={26} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: COLORS.noir }}>{task.taskName}</span>
                  <span style={{ color: COLORS.grisMoyen }}> — {task.projet}</span>
                </div>
                <label style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: COLORS.noir, color: COLORS.dore,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>
                  + Uploader le BAT
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleNewBatFromTask(task, f);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {([
          { id: "all" as const,      label: `Tous (${stats.total})` },
          { id: "envoye" as const,   label: `En attente (${stats.envoye})` },
          { id: "valide" as const,   label: `Validés (${stats.valide})` },
          { id: "modifier" as const, label: `À modifier (${stats.modifier})` },
        ]).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 16,
              border: `1px solid ${filter === f.id ? COLORS.dore : COLORS.grisBorder}`,
              background: filter === f.id ? COLORS.dorePale : COLORS.blanc,
              color:      filter === f.id ? COLORS.dore     : COLORS.grisMoyen,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: "40px 20px", textAlign: "center",
            background: COLORS.blanc, borderRadius: 16,
            border: `1px solid ${COLORS.grisBorder}`,
            color: COLORS.grisMoyen, fontStyle: "italic",
          }}>Aucun BAT à afficher.</div>
        )}

        {filtered.map((bat) => (
          <BatRow
            key={bat.id}
            bat={bat}
            isExpanded={expandedBatId === bat.id}
            onToggle={() => setExpandedBatId(expandedBatId === bat.id ? null : bat.id)}
            canManageBat={canManageBat}
          />
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
   BAT ROW
   ===================================================================== */
function BatRow({
  bat, isExpanded, onToggle, canManageBat,
}: {
  bat: Bat;
  isExpanded: boolean;
  onToggle: () => void;
  canManageBat: boolean;
}) {
  const collab = COLLABORATEURS.find((c) => c.id === bat.collabId);
  const stat = STATUT_STYLES[bat.statut];

  return (
    <div style={{
      background: COLORS.blanc, borderRadius: 16,
      border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 20px",
        display: "grid", gridTemplateColumns: "1fr auto",
        alignItems: "center", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: COLORS.noir }}>{bat.taskName}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: COLORS.gris, color: COLORS.grisMoyen,
              fontSize: 12, fontWeight: 700,
            }}>v{bat.version}</span>
            <span style={{
              padding: "3px 10px", borderRadius: 12,
              background: stat.bg, color: stat.color,
              fontSize: 13, fontWeight: 700,
            }}>{stat.label}</span>
          </div>
          <div style={{ fontSize: 14, color: COLORS.grisMoyen, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span><strong>Projet :</strong> {bat.projet}</span>
            <span>·</span>
            <span><strong>Client :</strong> {bat.client}</span>
            {collab && (
              <>
                <span>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Avatar collab={collab} size={18} /> {collab.nom}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            padding: "8px 14px", borderRadius: 8,
            background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
            color: COLORS.noir, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >{isExpanded ? "Fermer" : "Ouvrir ▾"}</button>
      </div>

      {isExpanded && (
        <div className="animate-fadeIn" style={{
          borderTop: `1px solid ${COLORS.grisBorder}`,
          padding: "20px", background: COLORS.gris,
        }}>
          <BatPanel bat={bat} canManageBat={canManageBat} />
        </div>
      )}
    </div>
  );
}
