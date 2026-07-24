"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

export type ActiveTimer = {
  taskId: string;
  taskLabel: string;
  projectId: string;
  projectName: string;
  /** null = chrono en pause (voir accumulatedSeconds pour le temps déjà écoulé). */
  startedAt: string | null;
  accumulatedSeconds: number;
};

export type StopResult = { taskId: string; durationSeconds: number };

type StartArgs = { id: string; label: string; projectId: string; projectName: string };

type TimerContextValue = {
  activeTimer: ActiveTimer | null;
  elapsed: string;
  elapsedSeconds: number;
  busy: boolean;
  startTimer: (task: StartArgs) => Promise<void>;
  stopTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  /** S'abonne aux arrêts de chrono (le sien comme celui encaissé automatiquement
   *  en changeant de tâche). Ne rejoue jamais un événement passé : un composant
   *  qui se monte après coup ne reçoit rien, il doit recharger ses propres données. */
  onStop: (cb: (result: StopResult) => void) => () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function computeElapsedSeconds(timer: ActiveTimer | null, nowTs: number): number {
  if (!timer) return 0;
  const running = timer.startedAt ? Math.max(0, Math.floor((nowTs - new Date(timer.startedAt).getTime()) / 1000)) : 0;
  return timer.accumulatedSeconds + running;
}

function formatElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const listeners = useRef(new Set<(r: StopResult) => void>());

  // Restaure le chrono en cours (démarré avant un rechargement de page ou
  // depuis un autre appareil) — une seule fois, au montage du provider (donc
  // une seule fois par session de navigation, pas à chaque changement de page).
  useEffect(() => {
    fetch("/api/task-timers/active")
      .then(r => r.json())
      .then((d: { timer?: ActiveTimer | null }) => { if (d.timer) setActiveTimer(d.timer); })
      .catch(() => null);
  }, []);

  // Ne tique que si le chrono tourne réellement (pas en pause) : évite un
  // interval qui ré-affiche la même valeur figée chaque seconde pour rien.
  useEffect(() => {
    if (!activeTimer?.startedAt) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeTimer?.startedAt]);

  const notify = useCallback((result: StopResult) => {
    listeners.current.forEach(cb => cb(result));
  }, []);

  const startTimer = useCallback(async (task: StartArgs) => {
    if (busy) return;
    const previousBeforeCall = activeTimer;
    setBusy(true);
    setActiveTimer({ taskId: task.id, taskLabel: task.label, projectId: task.projectId, projectName: task.projectName, startedAt: new Date().toISOString(), accumulatedSeconds: 0 });
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/start`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d: { startedAt: string; previous: { taskId: string; durationSeconds: number } | null } = await res.json();
      setActiveTimer({ taskId: task.id, taskLabel: task.label, projectId: task.projectId, projectName: task.projectName, startedAt: d.startedAt, accumulatedSeconds: 0 });
      if (d.previous) notify(d.previous);
    } catch {
      setActiveTimer(previousBeforeCall);
    } finally {
      setBusy(false);
    }
  }, [busy, activeTimer, notify]);

  const stopTimer = useCallback(async () => {
    if (busy || !activeTimer) return;
    const task = activeTimer;
    setBusy(true);
    setActiveTimer(null);
    try {
      const res = await fetch(`/api/tasks/${task.taskId}/timer/stop`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d: { durationSeconds: number } = await res.json();
      if (d.durationSeconds > 0) notify({ taskId: task.taskId, durationSeconds: d.durationSeconds });
    } catch {
      setActiveTimer(task);
    } finally {
      setBusy(false);
    }
  }, [busy, activeTimer, notify]);

  const pauseTimer = useCallback(async () => {
    if (busy || !activeTimer || !activeTimer.startedAt) return;
    const previous = activeTimer;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${activeTimer.taskId}/timer/pause`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d: { accumulatedSeconds: number } = await res.json();
      setActiveTimer({ ...previous, startedAt: null, accumulatedSeconds: d.accumulatedSeconds });
    } catch {
      setActiveTimer(previous);
    } finally {
      setBusy(false);
    }
  }, [busy, activeTimer]);

  const resumeTimer = useCallback(async () => {
    if (busy || !activeTimer || activeTimer.startedAt) return;
    const previous = activeTimer;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${activeTimer.taskId}/timer/resume`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d: { startedAt: string } = await res.json();
      setActiveTimer({ ...previous, startedAt: d.startedAt });
    } catch {
      setActiveTimer(previous);
    } finally {
      setBusy(false);
    }
  }, [busy, activeTimer]);

  const resetTimer = useCallback(async () => {
    if (busy || !activeTimer) return;
    const previous = activeTimer;
    setBusy(true);
    setActiveTimer(null);
    try {
      const res = await fetch(`/api/tasks/${previous.taskId}/timer/reset`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setActiveTimer(previous);
    } finally {
      setBusy(false);
    }
  }, [busy, activeTimer]);

  const onStop = useCallback((cb: (result: StopResult) => void) => {
    listeners.current.add(cb);
    return () => { listeners.current.delete(cb); };
  }, []);

  const elapsedSeconds = computeElapsedSeconds(activeTimer, nowTs);

  const value: TimerContextValue = {
    activeTimer,
    elapsed: activeTimer ? formatElapsed(elapsedSeconds) : "",
    elapsedSeconds,
    busy,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    onStop,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer doit être utilisé dans <TimerProvider>");
  return ctx;
}
