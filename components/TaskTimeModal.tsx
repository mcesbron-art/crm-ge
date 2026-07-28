"use client";

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { chargeInfoSeconds, formatDuration } from "@/lib/task-charge";
import { TASK_STAGES, TASK_BILLING_TYPE_LABEL, TASK_BILLING_STATUS_LABEL, TASK_BILLING_STATUS_COLOR, TASK_BAT_STATUS_LABEL, TASK_BAT_STATUS_COLOR } from "@/lib/task-taxonomy";
import { useTimer } from "@/lib/timer-context";
import { useToast } from "@/lib/toast-context";
import DatePickerField from "@/components/DatePickerField";
import { IconX, IconPlayRounded as IconPlay } from "@/components/ui/icons";

type BillingInfo = { id: string; billingType: string; billingStatus: string; adminComment: string | null; requestedAt: string } | null;
type BatInfo = { id: string; version: number; status: string; sentAt: string; link: string | null; returnComment: string | null; rejectionReason: string | null } | null;

type Props = {
  taskId: string;
  taskLabel: string;
  projectId: string;
  projectName: string;
  initialTotalMinutes: number;
  estimatedMinutes: number | null;
  currentStage: string;
  /** Demande de facturation en cours sur cette tâche, le cas échéant (état seul, non modifiable ici — voir TaskBillingModal). */
  billing?: BillingInfo;
  /** Autorise l'affichage du bouton "Envoyer en facturation" (même règle que le déplacement de carte dans /mes-taches). */
  canSendToBilling?: boolean;
  /** Ouvre TaskBillingModal par-dessus ce panneau. */
  onRequestBilling?: () => void;
  /** Dernière révision de BAT sur cette tâche, le cas échéant (état seul, non modifiable ici — voir TaskBatSendModal/TaskBatResultModal). */
  bat?: BatInfo;
  /** Autorise l'affichage des actions BAT (direction ou assigné, cf. /mes-taches::canBat). */
  canSendBat?: boolean;
  /** Ouvre TaskBatSendModal par-dessus ce panneau. */
  onRequestBat?: () => void;
  /** Ouvre TaskBatResultModal par-dessus ce panneau. */
  onRequestBatResult?: () => void;
  /** Autorise la suppression définitive de la tâche (réservé admin, cf. DELETE /api/tasks/:id). */
  canDelete?: boolean;
  /** Appelé après suppression réussie — le parent retire la tâche de sa liste et ferme ce panneau. */
  onDeleted?: () => void;
  onClose: () => void;
  /** Appelé après un enregistrement réussi, avec le nouveau total (en secondes) et le statut effectif. */
  onSaved: (newTotalSeconds: number, newStage: string) => void;
};

type Entry = {
  id: string; date: string; durationMinutes: number; durationSeconds: number; note: string | null;
  collaborateurNom: string; collaborateurColor: string; canDelete: boolean;
};

const IconPause = () => (<svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="4" width="3.4" height="12" rx="1" /><rect x="11.6" y="4" width="3.4" height="12" rx="1" /></svg>);

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panneau latéral "Temps passé sur la tâche" — même recette visuelle que le
 * slide-over détail projet (ProjetsClient.tsx) : en-tête sombre avec
 * dégradé radial, titre Playfair, croix de fermeture, corps scrollable sur
 * fond clair, ouverture depuis la droite. Utilisé depuis /mes-taches et
 * depuis le slide-over projet, d'où son extraction en composant partagé.
 *
 * S'ouvre PAR-DESSUS le slide-over projet quand les deux sont actifs (zIndex
 * supérieur) plutôt que de remplacer son contenu : c'est une action modale
 * ponctuelle (ajouter/consulter du temps) déclenchée depuis le panneau
 * projet, pas une navigation — le refermer doit simplement redonner la main
 * au panneau projet inchangé, sans état à resynchroniser entre les deux.
 *
 * Le chrono de l'onglet "Chronomètre" est le MÊME chrono global que celui
 * affiché dans la sidebar (lib/timer-context.tsx) — pas une seconde
 * logique. "Pause" et "Arrêter" gèlent tous les deux le segment en cours
 * sans créer de saisie (même opération serveur, distincts uniquement dans
 * l'intention affichée) ; la saisie n'est créée qu'au clic sur "Valider",
 * qui envoie alors le temps accumulé comme durée puis réinitialise le
 * chrono pour ne jamais le recompter.
 */
export default function TaskTimeModal({ taskId, taskLabel, projectId, projectName, initialTotalMinutes, estimatedMinutes, currentStage, billing, canSendToBilling, onRequestBilling, bat, canSendBat, onRequestBat, onRequestBatResult, canDelete, onDeleted, onClose, onSaved }: Props) {
  const timer = useTimer();
  const toast = useToast();
  const chronoOwnsThisTask = timer.activeTimer?.taskId === taskId;
  const chronoRunning = chronoOwnsThisTask && !!timer.activeTimer?.startedAt;

  const [tab, setTab] = useState<"manual" | "chrono">(chronoOwnsThisTask ? "chrono" : "manual");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [stage, setStage] = useState(currentStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  // "Facturation" ne se rejoint que via l'envoi dédié (bouton plus bas,
  // type de facture requis) — jamais depuis ce dropdown générique. On
  // garde l'option seulement si la tâche y est déjà, pour ne pas afficher
  // un select vide sur une tâche actuellement en Facturation.
  const selectableStages = TASK_STAGES.filter(s =>
    (s.value !== "facturation" || currentStage === "facturation") &&
    (s.value !== "bat_envoye" || currentStage === "bat_envoye")
  );
  const billingStatusColor = billing ? (TASK_BILLING_STATUS_COLOR[billing.billingStatus] ?? TASK_BILLING_STATUS_COLOR.a_facturer) : "#8C8B83";
  const batStatusColor = bat ? (TASK_BAT_STATUS_COLOR[bat.status] ?? TASK_BAT_STATUS_COLOR.waiting_feedback) : "#8C8B83";

  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const loadEntries = useCallback(() => {
    setEntriesLoading(true);
    return fetch(`/api/time-entries?task_id=${taskId}`)
      .then(r => r.json())
      .then((d: { entries?: Entry[] }) => { if (Array.isArray(d.entries)) setEntries(d.entries); })
      .catch(() => setEntries([]))
      .finally(() => setEntriesLoading(false));
  }, [taskId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Accessibilité : focus initial, piège de focus, restitution au déclencheur.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => { previouslyFocused.current?.focus?.(); };
  }, []);

  const addedSeconds = (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
  const chronoSeconds = chronoOwnsThisTask ? timer.elapsedSeconds : 0;
  const durationSeconds = tab === "manual" ? addedSeconds : chronoSeconds;

  const isDirty = addedSeconds > 0 || note.trim() !== "" || stage !== currentStage || (chronoOwnsThisTask && chronoSeconds > 0);

  const liveTotalSeconds = entriesLoading ? initialTotalMinutes * 60 : entries.reduce((s, e) => s + e.durationSeconds, 0);
  const current = chargeInfoSeconds(liveTotalSeconds, estimatedMinutes);
  const preview = chargeInfoSeconds(liveTotalSeconds + durationSeconds, estimatedMinutes);

  const canValidate = durationSeconds > 0 && !(tab === "chrono" && chronoRunning) && !saving;

  const requestClose = () => {
    if (isDirty && !closeConfirm) { setCloseConfirm(true); return; }
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); requestClose(); return; }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables);
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (idx === 0 || idx === -1)) { e.preventDefault(); list[list.length - 1].focus(); }
      else if (!e.shiftKey && idx === list.length - 1) { e.preventDefault(); list[0].focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, closeConfirm]);

  const submit = async () => {
    if (!canValidate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_seconds: durationSeconds,
          date,
          note: note.trim() || undefined,
          new_stage: stage !== currentStage ? stage : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de l'enregistrement");
      }
      const d: { totalSeconds: number; stage: string } = await res.json();
      if (tab === "chrono") await timer.resetTimer();
      toast.success("Temps enregistré.");
      onSaved(d.totalSeconds, d.stage);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      toast.error("L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    const previous = entries;
    const removed = entries.find(e => e.id === id);
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (removed) onSaved(liveTotalSeconds - removed.durationSeconds, currentStage);
    } catch {
      setEntries(previous);
      setError("Échec de la suppression");
    }
  };

  const deleteTask = async () => {
    if (deletingTask) return;
    setDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Tâche supprimée.");
      onDeleted?.();
    } catch {
      setError("Échec de la suppression de la tâche");
      toast.error("La suppression a échoué.");
    } finally {
      setDeletingTask(false);
      setDeleteTaskConfirm(false);
    }
  };

  const chronoLabel = chronoRunning ? "En cours" : chronoOwnsThisTask && chronoSeconds > 0 ? "En pause" : "Arrêté";
  const chronoLabelColor = chronoRunning ? "#1F8A5B" : chronoOwnsThisTask && chronoSeconds > 0 ? "#C2410C" : "#A6A498";

  return (
    <div onClick={requestClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 90, display: "flex", justifyContent: "flex-end" }}>
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-time-modal-title"
        className="modal-slide-in"
        style={{ width: 480, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}
      >
        {/* header */}
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <span style={{ fontSize: 13, color: "#9A9078", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Temps passé sur la tâche</span>
            <span onClick={requestClose} aria-label="Fermer le panneau" role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); requestClose(); } }} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer", flex: "none" }}><IconX /></span>
          </div>
          <div id="task-time-modal-title" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", marginTop: 12, lineHeight: 1.25, position: "relative" }}>{taskLabel}</div>
        </div>

        {/* corps scrollable */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: current.bg, borderRadius: 10, padding: "10px 13px" }}>
            <span style={{ fontSize: 14.5, color: "#5C5A52", fontWeight: 600 }}>Cumulé actuellement</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: current.color }}>{current.label}</span>
          </div>

          <div style={{ fontSize: 15, color: "#5C5A52", lineHeight: 1.5 }}>
            Vous souhaitez ajouter du temps passé le <DatePickerField value={date} onChange={setDate} />.
          </div>

          {/* tabs */}
          <div role="tablist" style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 10, padding: 3, gap: 2 }}>
            {(["manual", "chrono"] as const).map(t => {
              const on = tab === t;
              return (
                <span
                  key={t} role="tab" aria-selected={on} tabIndex={0}
                  onClick={() => setTab(t)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTab(t); } }}
                  style={{ flex: 1, textAlign: "center", padding: "8px 10px", borderRadius: 7, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: on ? "#0A0A0A" : "#8C8B83", background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 2px rgba(20,20,15,.10)" : "none" }}
                >
                  {t === "manual" ? "Ajouter manuellement" : "Chronomètre"}
                </span>
              );
            })}
          </div>

          {tab === "manual" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Durée</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input aria-label="Heures" type="number" min={0} autoFocus value={hours} onChange={e => setHours(e.target.value)} placeholder="h" style={{ width: 64, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }} />
                  <input aria-label="Minutes" type="number" min={0} max={59} value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="min" style={{ width: 72, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }} />
                  <input aria-label="Secondes" type="number" min={0} max={59} value={seconds} onChange={e => setSeconds(e.target.value)} placeholder="s" style={{ width: 64, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0 6px" }}>
              {timer.activeTimer && !chronoOwnsThisTask && (
                <div style={{ fontSize: 14, color: "#8C6D2F", background: "#F6EFDD", borderRadius: 9, padding: "8px 12px", textAlign: "center", lineHeight: 1.4 }}>
                  Un chrono tourne actuellement sur « {timer.activeTimer.taskLabel} » — le démarrer ici l&apos;arrêtera et l&apos;enregistrera automatiquement.
                </div>
              )}
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Georgia, 'Times New Roman', serif", color: "#1C1B16", fontVariantNumeric: "tabular-nums" }}>
                {formatDuration(chronoSeconds)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: chronoLabelColor }}>{chronoLabel}</div>
              <div style={{ display: "flex", gap: 9 }}>
                {!chronoOwnsThisTask && (
                  <button onClick={() => timer.startTimer({ id: taskId, label: taskLabel, projectId, projectName })} disabled={timer.busy} style={chronoBtnStyle("#1F8A5B")}>
                    <IconPlay /> Démarrer
                  </button>
                )}
                {chronoRunning && (
                  <button onClick={() => timer.pauseTimer()} disabled={timer.busy} style={chronoBtnStyle("#C2410C")}>
                    <IconPause /> Pause
                  </button>
                )}
                {chronoOwnsThisTask && !chronoRunning && chronoSeconds > 0 && (
                  <>
                    <button onClick={() => timer.resumeTimer()} disabled={timer.busy} style={chronoBtnStyle("#1F8A5B")}>
                      <IconPlay /> Reprendre
                    </button>
                    {!resetConfirm ? (
                      <button onClick={() => setResetConfirm(true)} disabled={timer.busy} style={chronoBtnStyle("#8C8B83")}>Réinitialiser</button>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#B91C1C" }}>
                        Effacer {formatDuration(chronoSeconds)} ?
                        <button onClick={() => { setResetConfirm(false); timer.resetTimer(); }} style={{ ...chronoBtnStyle("#B91C1C"), padding: "6px 10px" }}>Oui</button>
                        <button onClick={() => setResetConfirm(false)} style={{ ...chronoBtnStyle("#8C8B83"), padding: "6px 10px" }}>Non</button>
                      </span>
                    )}
                  </>
                )}
              </div>
              {chronoRunning && (
                <div style={{ fontSize: 13.5, color: "#A6A498", textAlign: "center" }}>Mets le chrono en pause avant de valider.</div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="task-time-stage" style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Changer le statut de la tâche</label>
            <select id="task-time-stage" value={stage} onChange={e => setStage(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }}>
              {selectableStages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Facturation</label>
            {billing ? (
              <div style={{ background: `${billingStatusColor}12`, border: `1px solid ${billingStatusColor}40`, borderRadius: 9, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: billingStatusColor }}>Statut : {TASK_BILLING_STATUS_LABEL[billing.billingStatus] ?? billing.billingStatus}</div>
                <div style={{ fontSize: 13, color: "#8C8B83" }}>Type demandé : {TASK_BILLING_TYPE_LABEL[billing.billingType] ?? billing.billingType}</div>
                {billing.adminComment && <div style={{ fontSize: 14, color: "#5C5A52", marginTop: 2 }}>{billing.adminComment}</div>}
              </div>
            ) : canSendToBilling && onRequestBilling ? (
              <button type="button" onClick={onRequestBilling} style={{ width: "100%", background: "#fff", border: "1.5px solid #C9A24E", color: "#8C6D2F", fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
                Envoyer en facturation
              </button>
            ) : (
              <div style={{ fontSize: 14.5, color: "#A6A498" }}>Aucune demande de facturation sur cette tâche.</div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>BAT</label>
            {bat && (
              <div style={{ background: `${batStatusColor}12`, border: `1px solid ${batStatusColor}40`, borderRadius: 9, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, marginBottom: bat.status === "waiting_feedback" ? 0 : 8 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: batStatusColor }}>Statut : {TASK_BAT_STATUS_LABEL[bat.status] ?? bat.status}</div>
                <div style={{ fontSize: 13, color: "#8C8B83" }}>Version {bat.version} · envoyée le {new Date(bat.sentAt).toLocaleDateString("fr-FR")}</div>
                {bat.link && <a href={bat.link} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: "#2563EB" }}>Voir le lien du BAT</a>}
                {bat.rejectionReason && <div style={{ fontSize: 14, color: "#5C5A52", marginTop: 2 }}>Modifications demandées : {bat.rejectionReason}</div>}
                {bat.returnComment && <div style={{ fontSize: 14, color: "#5C5A52" }}>{bat.returnComment}</div>}
                {bat.status === "waiting_feedback" && canSendBat && onRequestBatResult && (
                  <button type="button" onClick={onRequestBatResult} style={{ width: "100%", background: "#fff", border: `1.5px solid ${batStatusColor}`, color: batStatusColor, fontSize: 14.5, fontWeight: 700, padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                    Enregistrer le retour client
                  </button>
                )}
              </div>
            )}
            {/* Envoyer une nouvelle révision reste possible tant qu'aucune n'est
                en attente de retour — après validation/refus comme avant tout
                premier envoi, pas seulement quand bat est encore null. */}
            {(!bat || bat.status !== "waiting_feedback") && (
              canSendBat && onRequestBat ? (
                <button type="button" onClick={onRequestBat} style={{ width: "100%", background: "#fff", border: "1.5px solid #C9A24E", color: "#8C6D2F", fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
                  Enregistrer l&apos;envoi du BAT
                </button>
              ) : !bat ? (
                <div style={{ fontSize: 14.5, color: "#A6A498" }}>Aucun BAT envoyé sur cette tâche.</div>
              ) : null
            )}
          </div>

          {showComment ? (
            <div>
              <label htmlFor="task-time-note" style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Commentaire (optionnel)</label>
              <textarea
                id="task-time-note" value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Description du temps passé…"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none", resize: "vertical" }}
              />
              {!note.trim() && (
                <span onClick={() => setShowComment(false)} style={{ display: "inline-block", marginTop: 6, fontSize: 14, color: "#A6A498", cursor: "pointer" }}>Masquer</span>
              )}
            </div>
          ) : (
            <span onClick={() => setShowComment(true)} style={{ fontSize: 15, fontWeight: 600, color: "#B0892B", cursor: "pointer", width: "fit-content" }}>+ Ajouter un commentaire</span>
          )}

          {durationSeconds > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: preview.bg, borderRadius: 10, padding: "10px 13px" }}>
              <span style={{ fontSize: 14.5, color: "#5C5A52", fontWeight: 600 }}>Après cette saisie</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: preview.color }}>{preview.label}</span>
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}

          {/* liste des saisies existantes */}
          <div>
            <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 10 }}>Saisies déjà enregistrées</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {entriesLoading ? (
                <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Chargement…</div>
              ) : entries.length === 0 ? (
                <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Aucune saisie de temps sur cette tâche</div>
              ) : entries.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "1px solid #ECEBE4", borderRadius: 10, padding: "10px 13px" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: e.collaborateurColor, flex: "none" }}>{getInitials(e.collaborateurNom)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1B16" }}>{e.collaborateurNom} · {formatDuration(e.durationSeconds)}</div>
                    <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  {e.canDelete && (
                    <span onClick={() => deleteEntry(e.id)} aria-label="Supprimer cette saisie" role="button" tabIndex={0} style={{ color: "#B5B2A6", cursor: "pointer", fontSize: 16, lineHeight: 1, flex: "none" }}>×</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        {deleteTaskConfirm ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
            <span style={{ fontSize: 14.5, color: "#B91C1C", lineHeight: 1.4 }}>Supprimer définitivement cette tâche et son historique de temps ?</span>
            <span style={{ display: "flex", gap: 8, flex: "none" }}>
              <button onClick={() => setDeleteTaskConfirm(false)} disabled={deletingTask} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 14px", borderRadius: 10, cursor: deletingTask ? "default" : "pointer", fontFamily: "inherit", opacity: deletingTask ? 0.6 : 1 }}>Annuler</button>
              <button onClick={deleteTask} disabled={deletingTask} style={{ background: "#B91C1C", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, padding: "9px 14px", borderRadius: 10, cursor: deletingTask ? "default" : "pointer", fontFamily: "inherit", opacity: deletingTask ? 0.6 : 1 }}>
                {deletingTask ? "Suppression…" : "Oui, supprimer"}
              </button>
            </span>
          </div>
        ) : closeConfirm ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
            <span style={{ fontSize: 14.5, color: "#B91C1C", lineHeight: 1.4 }}>Des données non enregistrées seront perdues.</span>
            <span style={{ display: "flex", gap: 8, flex: "none" }}>
              <button onClick={() => setCloseConfirm(false)} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Continuer la saisie</button>
              <button onClick={onClose} style={{ background: "#B91C1C", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Fermer sans enregistrer</button>
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
            {canDelete ? (
              <button onClick={() => setDeleteTaskConfirm(true)} style={{ background: "#fff", border: "1px solid #F5B5B3", color: "#C62828", fontSize: 14, fontWeight: 600, padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Supprimer la tâche</button>
            ) : <span />}
            <span style={{ display: "flex", gap: 10, flex: "none" }}>
              <button onClick={requestClose} style={{ background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={submit} disabled={!canValidate} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: "9px 20px", borderRadius: 10, cursor: canValidate ? "pointer" : "default", border: "none", fontFamily: "inherit", opacity: canValidate ? 1 : 0.6 }}>
                {saving ? "Enregistrement…" : "Valider"}
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function chronoBtnStyle(color: string): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${color}`,
    color, fontSize: 14.5, fontWeight: 700, padding: "8px 14px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit",
  };
}
