export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** Détail heures/minutes/secondes — utilisé là où la précision de la
 *  seconde est disponible (chrono, saisie manuelle avec secondes). */
export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  if (m > 0) return s > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${m} min`;
  return `${s} s`;
}

export type ChargeInfo = { color: string; bg: string; label: string; ratio: number | null };

// Seuils : ≤100% du temps estimé = vert, jusqu'à +20% = orange, au-delà = rouge.
// Palette reprise de dueStyle()/BAT status déjà utilisés ailleurs dans l'app
// (pas de nouvelle couleur introduite).
const NEUTRAL = { color: "#8C6D2F", bg: "#F6EFDD" };
const OK      = { color: "#1F8A5B", bg: "#E7F3EB" };
const WARN    = { color: "#C2410C", bg: "#FBEAE0" };
const OVER    = { color: "#DC2626", bg: "#FDECEC" };

export function chargeInfo(actualMinutes: number, estimatedMinutes: number | null | undefined): ChargeInfo {
  if (!estimatedMinutes || estimatedMinutes <= 0) {
    return { ...NEUTRAL, label: formatMinutes(actualMinutes), ratio: null };
  }
  const ratio = actualMinutes / estimatedMinutes;
  const label = `${formatMinutes(actualMinutes)} / ${formatMinutes(estimatedMinutes)}`;
  if (ratio <= 1) return { ...OK, label, ratio };
  if (ratio <= 1.2) return { ...WARN, label, ratio };
  return { ...OVER, label, ratio };
}

/** Même logique que chargeInfo, mais sur la durée exacte en secondes —
 *  utilisé dans le panneau "Temps passé sur la tâche" pour le cumul
 *  affiché avec précision h/min/s (l'estimation reste en minutes : une
 *  estimation n'a jamais de sens à la seconde près). */
export function chargeInfoSeconds(actualSeconds: number, estimatedMinutes: number | null | undefined): ChargeInfo {
  if (!estimatedMinutes || estimatedMinutes <= 0) {
    return { ...NEUTRAL, label: formatDuration(actualSeconds), ratio: null };
  }
  const estimatedSeconds = estimatedMinutes * 60;
  const ratio = actualSeconds / estimatedSeconds;
  const label = `${formatDuration(actualSeconds)} / ${formatMinutes(estimatedMinutes)}`;
  if (ratio <= 1) return { ...OK, label, ratio };
  if (ratio <= 1.2) return { ...WARN, label, ratio };
  return { ...OVER, label, ratio };
}
