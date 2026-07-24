"use client";

import { useRouter } from "next/navigation";
import { useTimer } from "@/lib/timer-context";

const IconPlay = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.5v11l9-5.5z" /></svg>
);
const IconPause = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><rect x="5.5" y="4.5" width="3.2" height="11" rx="1" /><rect x="11.3" y="4.5" width="3.2" height="11" rx="1" /></svg>
);
const IconStop = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="4.5" y="4.5" width="11" height="11" rx="2" /></svg>
);

/**
 * Mini-player mobile — le chrono actif est autrement invisible sur mobile dès
 * que le tiroir de la sidebar est fermé (.app-sidebar passe hors écran sous
 * 1024px, cf. app/globals.css). Masqué par CSS au-dessus de 1024px
 * (.mobile-timer-bar), pas de logique dupliquée : consomme lib/timer-context.tsx
 * comme la sidebar.
 */
export default function MobileActiveTimerBar() {
  const router = useRouter();
  const { activeTimer, elapsed, busy, pauseTimer, resumeTimer, stopTimer } = useTimer();

  if (!activeTimer) return null;
  const isPaused = !activeTimer.startedAt;

  return (
    <div
      className="mobile-timer-bar"
      style={{
        position: "fixed",
        left: 10,
        right: 10,
        bottom: 10,
        zIndex: 35,
        alignItems: "center",
        gap: 10,
        background: isPaused ? "#1D1B17" : "linear-gradient(135deg,#3A2308,#241305)",
        border: `1.5px solid ${isPaused ? "#5C5A52" : "#C9A24E"}`,
        borderRadius: 14,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isPaused ? "#8C8B83" : "#E4A93A", boxShadow: isPaused ? "none" : "0 0 6px 1px rgba(228,169,58,.7)", animation: isPaused ? "none" : "pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />

      <button
        type="button"
        onClick={() => router.push("/mes-taches")}
        title="Voir la tâche"
        style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F4ECD7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {activeTimer.taskLabel}
        </div>
      </button>

      <span style={{ fontSize: 16, fontWeight: 800, color: isPaused ? "#C9C6BB" : "#E4C77B", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {elapsed}
      </span>

      {isPaused ? (
        <button
          type="button"
          className="btn"
          aria-label="Reprendre le chrono"
          disabled={busy}
          onClick={() => resumeTimer()}
          style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(31,138,91,.16)", border: "none", color: "#4ADE80", flexShrink: 0 }}
        >
          <IconPlay />
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          aria-label="Mettre le chrono en pause"
          disabled={busy}
          onClick={() => pauseTimer()}
          style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(194,65,12,.16)", border: "none", color: "#FB923C", flexShrink: 0 }}
        >
          <IconPause />
        </button>
      )}
      <button
        type="button"
        className="btn"
        aria-label="Arrêter le chrono"
        disabled={busy}
        onClick={() => stopTimer()}
        style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(220,38,38,.14)", border: "none", color: "#F87171", flexShrink: 0 }}
      >
        <IconStop />
      </button>
    </div>
  );
}
