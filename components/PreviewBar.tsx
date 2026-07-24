"use client";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

/**
 * Barre sticky en haut des pages — bascule "Vue Admin / Vue Collaborateur"
 * pour les Admins.
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

  const barBgColor = isDark ? "#0F0F0F" : "#F9F9F8";
  const barBorderColor = isDark ? "#2a2a2a" : "#E8E8E6";
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
      {/* Toggle 2 boutons */}
      <div
        style={{
          display: "flex", padding: 4, gap: 2,
          background: toggleBgColor, borderRadius: 10,
          transition: "background 0.3s ease",
        }}
      >
        <button
          onClick={() => setPreviewMode("real")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: !isCollab ? "#161616" : "transparent",
            color:      !isCollab ? "#FFFFFF" : inactiveBtnColor,
            transition: "all 0.15s",
          }}
        >Vue Admin</button>
        <button
          onClick={() => setPreviewMode("collab")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: isCollab ? "#161616" : "transparent",
            color:      isCollab ? "#FFFFFF" : inactiveBtnColor,
            transition: "all 0.15s",
          }}
        >Vue Collaborateur</button>
      </div>
    </div>
  );
}
