"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Barre sticky en haut des pages — bascule "Vue Direction / Vue Collaborateur"
 * pour les utilisateurs qui peuvent voir les chiffres (Direction + Admin).
 *
 * Cette bascule ne change PAS l'utilisateur connecté ; elle force seulement
 * un aperçu de l'interface telle que la verra un collaborateur.
 */
export default function PreviewBar() {
  const { currentUser, previewMode, setPreviewMode } = useAuth();

  // Le bouton n'a aucun sens pour un vrai collaborateur (déjà en vue collab)
  if (currentUser.role === "collaborateur") return null;

  const isCollab = previewMode === "collab";

  return (
    <div
      className="preview-bar"
      style={{
        background: isCollab ? "#E8EAF6" : "#F9F9F8",
        borderBottom: isCollab ? "1px solid #C5CAE9" : "1px solid #E8E8E6",
      }}
    >
      {/* Indicateur mode actif */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        {isCollab ? (
          <>
            <span style={{ fontSize: 14 }}>🔍</span>
            <span style={{ fontWeight: 700, color: "#3949AB" }}>Aperçu Vue Collaborateur</span>
            <span style={{ color: "#666" }}>—</span>
            <span style={{ color: "#666" }}>
              vous voyez l&apos;interface comme un collaborateur (sans montants ni rapports)
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>★</span>
            <span style={{ fontWeight: 700, color: "#C5A55A" }}>
              Vue {currentUser.role === "direction" ? "Direction" : "Admin"}
            </span>
            <span style={{ color: "#999" }}>—</span>
            <span style={{ color: "#999" }}>accès complet aux montants, marges et rapports</span>
          </>
        )}
      </div>

      {/* Toggle 2 boutons */}
      <div
        style={{
          display: "flex", padding: 3, gap: 2,
          background: "#E8E8E6", borderRadius: 8,
        }}
      >
        <button
          onClick={() => setPreviewMode("real")}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: !isCollab ? "#C5A55A" : "transparent",
            color:      !isCollab ? "#1A1A1A" : "#999999",
            transition: "all 0.15s",
          }}
        >Vue Direction</button>
        <button
          onClick={() => setPreviewMode("collab")}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: isCollab ? "#C5A55A" : "transparent",
            color:      isCollab ? "#1A1A1A" : "#999999",
            transition: "all 0.15s",
          }}
        >Vue Collaborateur</button>
      </div>
    </div>
  );
}
