"use client";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

/**
 * Barre sticky en haut des pages — bascule "Vue Direction / Vue Collaborateur"
 * pour les utilisateurs qui peuvent voir les chiffres (Direction + Admin).
 *
 * Cette bascule ne change PAS l'utilisateur connecté ; elle force seulement
 * un aperçu de l'interface telle que la verra un collaborateur.
 */
export default function PreviewBar() {
  const { currentUser, previewMode, setPreviewMode } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // Le bouton n'a aucun sens pour un vrai collaborateur (déjà en vue collab)
  if (currentUser.role === "collaborateur") return null;

  const isCollab = previewMode === "collab";

  const barBgColor = isDark
    ? (isCollab ? "#1a1a1a" : "#0F0F0F")
    : (isCollab ? "#E8EAF6" : "#F9F9F8");

  const barBorderColor = isDark
    ? "#2a2a2a"
    : (isCollab ? "#C5CAE9" : "#E8E8E6");

  const textColor = isDark ? "#CCCCCC" : "#666";
  const labelColor = isDark ? "#E8E8E8" : (isCollab ? "#3949AB" : "#C5A55A");
  const toggleBgColor = isDark ? "#1a1a1a" : "#E8E8E6";
  const inactiveBtnColor = isDark ? "#555555" : "#999999";

  return (
    <div
      className="preview-bar"
      style={{
        background: barBgColor,
        borderBottom: `1px solid ${barBorderColor}`,
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Indicateur mode actif */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        {isCollab ? (
          <>
            <span style={{ fontSize: 14 }}>🔍</span>
            <span style={{ fontWeight: 700, color: labelColor }}>Aperçu Vue Collaborateur</span>
            <span style={{ color: textColor }}>—</span>
            <span style={{ color: textColor }}>
              vous voyez l&apos;interface comme un collaborateur (sans montants ni rapports)
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>★</span>
            <span style={{ fontWeight: 700, color: labelColor }}>
              Vue {currentUser.role === "direction" ? "Direction" : "Admin"}
            </span>
            <span style={{ color: textColor }}>—</span>
            <span style={{ color: textColor }}>accès complet aux montants, marges et rapports</span>
          </>
        )}
      </div>

      {/* Toggle 2 boutons */}
      <div
        style={{
          display: "flex", padding: 3, gap: 2,
          background: toggleBgColor, borderRadius: 8,
          transition: "background 0.3s ease",
        }}
      >
        <button
          onClick={() => setPreviewMode("real")}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: !isCollab ? "#C5A55A" : "transparent",
            color:      !isCollab ? "#1A1A1A" : inactiveBtnColor,
            transition: "all 0.15s",
          }}
        >Vue Direction</button>
        <button
          onClick={() => setPreviewMode("collab")}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: isCollab ? "#C5A55A" : "transparent",
            color:      isCollab ? "#1A1A1A" : inactiveBtnColor,
            transition: "all 0.15s",
          }}
        >Vue Collaborateur</button>
      </div>
    </div>
  );
}
