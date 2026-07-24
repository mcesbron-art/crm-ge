/** Durée totale écoulée d'un chrono de tâche : le temps déjà cumulé avant la
 *  pause courante, plus le segment en cours si le chrono tourne encore
 *  (started_at non nul). Utilisé côté serveur par les routes start/stop/pause. */
export function totalElapsedSeconds(startedAt: string | null, accumulatedSeconds: number): number {
  if (!startedAt) return accumulatedSeconds;
  const running = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
  return accumulatedSeconds + Math.max(0, running);
}
