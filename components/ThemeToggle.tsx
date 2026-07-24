"use client";

import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <button
      onClick={toggleMode}
      style={{
        padding: "8px 16px",
        background: mode === "dark" ? "#FFF8F0" : "#1A1A1A",
        border: "none",
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        color: mode === "dark" ? "#1A1A1A" : "#FFE0B2",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
    >
      {mode === "light" ? "🌙" : "☀️"}
    </button>
  );
}
