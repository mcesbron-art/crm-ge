"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { typography } from "@/lib/typography";
import { chargeInfo } from "@/lib/task-charge";
import { TASK_PRIORITY_COLOR, TASK_STAGES, TASK_STAGE_COLOR, TASK_STAGE_LABEL, TASK_WAIT_REASON_LABEL, TASK_BILLING_STATUS_LABEL, TASK_BILLING_STATUS_COLOR, TASK_BAT_STATUS_LABEL, TASK_BAT_STATUS_COLOR } from "@/lib/task-taxonomy";
import { useTimer } from "@/lib/timer-context";
import { useToast } from "@/lib/toast-context";
import TaskTimeModal from "@/components/TaskTimeModal";
import TaskWaitModal from "@/components/TaskWaitModal";
import TaskBillingModal from "@/components/TaskBillingModal";
import TaskBatSendModal from "@/components/TaskBatSendModal";
import TaskBatResultModal from "@/components/TaskBatResultModal";
import { IconClock, IconSearch, IconStop, IconPlayRounded } from "@/components/ui/icons";

const ACCENT = "#C9A24E";
const GRID = "28px minmax(190px,1.4fr) 108px 92px 110px 120px 140px 96px 96px 96px 150px 150px 118px";
const PRIORITY_OPTIONS = ["Urgente", "Haute", "Normale", "Basse"] as const;

const IconKanban = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="3.6" height="12" rx="1.2" /><rect x="8.2" y="4" width="3.6" height="8.5" rx="1.2" /><rect x="13.4" y="4" width="3.6" height="12" rx="1.2" /></svg>);
const IconList = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="16" y2="6" /><line x1="6" y1="10" x2="16" y2="10" /><line x1="6" y1="14" x2="16" y2="14" /><circle cx="3.5" cy="6" r="0.6" fill="currentColor" /><circle cx="3.5" cy="10" r="0.6" fill="currentColor" /><circle cx="3.5" cy="14" r="0.6" fill="currentColor" /></svg>);

function taskDueState(t: Task): "ok" | "soon" | "over" | "done" {
  if (t.done) return "done";
  if (!t.dueDate) return "ok";
  const diff = (new Date(t.dueDate).getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "over";
  if (diff <= 3) return "soon";
  return "ok";
}
function dueStyle(state: string) {
  if (state === "over") return { color: "#DC2626", fontWeight: 700 };
  if (state === "soon") return { color: "#C2410C", fontWeight: 700 };
  if (state === "done") return { color: "#1F8A5B", fontWeight: 600 };
  return { color: "#8C8B83", fontWeight: 500 };
}

type Task = {
  id: string; label: string; done: boolean;
  projectId: string; projectName: string; projectClient: string; projectStatus: string;
  assignedTo: string | null; assigneeNom: string | null; assigneeColor: string; assigneePole: string | null;
  estimatedMinutes: number | null; dueDate: string | null;
  priority: string; taskType: string | null; startDate: string | null; endDate: string | null;
  stage: string;
  totalMinutes: number;
  waiting: { reason: string; waitingFor: string | null; comment: string | null; followUpDate: string | null; startedAt: string } | null;
  billing: { id: string; billingType: string; billingStatus: string; adminComment: string | null; requestedAt: string; updatedAt: string } | null;
  bat: { id: string; version: number; status: string; sentAt: string; link: string | null; returnComment: string | null; rejectionReason: string | null } | null;
};

type Collab = { id: string; nom: string; color: string | null; avatar: string | null };

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function Th({ label, k, sortKey, sortDir, onSort }: { label: string; k: string; sortKey: string; sortDir: number; onSort: (k: string) => void }) {
  const active = k === sortKey;
  return (
    <span onClick={() => onSort(k)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: active ? "#16150F" : "#A09E92", cursor: "pointer" }}>
      {label}<span style={{ color: active ? ACCENT : "#C8C6BB", fontSize: 12 }}>{active ? (sortDir === 1 ? "↑" : "↓") : "↕"}</span>
    </span>
  );
}
function ThLabel({ label }: { label: string }) {
  return <span style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: "#A09E92" }}>{label}</span>;
}

function StageBadge({ stage }: { stage: string }) {
  const color = TASK_STAGE_COLOR[stage] ?? TASK_STAGE_COLOR.brief;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color, background: `${color}1A`, borderRadius: 99, padding: "3px 9px", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />
      {TASK_STAGE_LABEL[stage] ?? stage}
    </span>
  );
}

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ fontFamily: "inherit", fontSize: 14.5, fontWeight: 600, color: value === "all" ? "#7C7B73" : "#33322C", background: value === "all" ? "#F0EFEA" : "#fff", border: `1px solid ${value === "all" ? "#E5E4DD" : ACCENT}`, borderRadius: 99, padding: "6px 10px", outline: "none", cursor: "pointer" }}
    >
      <option value="all">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FilterToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span onClick={onClick} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: active ? "#0A0A0A" : "#7C7B73", background: active ? "#fff" : "#F0EFEA", border: `1px solid ${active ? ACCENT : "#E5E4DD"}` }}>
      {children}
    </span>
  );
}

export default function MesTachesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canSeeMoney, effectiveRole } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [timeModalTask, setTimeModalTask] = useState<Task | null>(null);
  const [pendingWait, setPendingWait] = useState<Task | null>(null);
  const [pendingBilling, setPendingBilling] = useState<Task | null>(null);
  const [pendingBatSend, setPendingBatSend] = useState<Task | null>(null);
  const [pendingBatResult, setPendingBatResult] = useState<Task | null>(null);
  const [sortKey, setSortKey] = useState("dueDate");
  const [sortDir, setSortDir] = useState(1);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [drag, setDrag] = useState<{ id: string; fromStage: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const { activeTimer, elapsed, startTimer: startSharedTimer, stopTimer: stopSharedTimer, onStop } = useTimer();
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  // "me" = comportement par défaut (mes tâches uniquement, tous rôles) ;
  // "all" / un id de collaborateur ne sont honorés côté serveur que pour
  // direction/admin — voir /api/tasks. Défaut à "me" pour ne pas surprendre
  // l'utilisateur à l'ouverture de la page.
  const [collabFilter, setCollabFilter] = useState<string>("me");

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterPole, setFilterPole] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  useEffect(() => {
    if (!canSeeMoney) return;
    fetch("/api/collaborateurs")
      .then(r => r.json())
      .then((d: { collaborateurs?: Collab[] }) => { if (Array.isArray(d.collaborateurs)) setCollaborateurs(d.collaborateurs); })
      .catch(() => null);
  }, [canSeeMoney]);

  const load = useCallback(() => {
    setLoading(true);
    const param = collabFilter !== "me" ? `&assigned_to=${collabFilter}` : "";
    return fetch(`/api/tasks?mine=1${param}`)
      .then(r => r.json())
      .then((d: { tasks?: Task[] }) => { if (Array.isArray(d.tasks)) setTasks(d.tasks); })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [collabFilter]);

  useEffect(() => { load(); }, [load]);

  // Deep-link depuis une autre page (ex: dashboard) : /mes-taches?open=<taskId>
  // ouvre directement le panneau de temps de la tâche concernée, une fois la
  // liste chargée (la tâche y figure forcément : même règle d'accès que le
  // widget dashboard, cf. /api/tasks?mine=1).
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || tasks.length === 0) return;
    const task = tasks.find(t => t.id === openId);
    if (task) setTimeModalTask(task);
    router.replace("/mes-taches", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tasks]);

  // Le contexte partagé notifie chaque arrêt de chrono (explicite ou
  // encaissé automatiquement en changeant de tâche) : on met à jour le total
  // de la tâche concernée sans recharger toute la liste.
  useEffect(() => onStop(({ taskId, durationSeconds }) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, totalMinutes: t.totalMinutes + Math.ceil(durationSeconds / 60) } : t));
  }), [onStop]);

  const startTimer = (task: Task) => startSharedTimer({ id: task.id, label: task.label, projectId: task.projectId, projectName: task.projectName });
  const stopTimer = () => stopSharedTimer();

  const toggleDone = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: task.done } : t));
    }
  };

  const moveStage = async (taskId: string, fromStage: string, toStage: string) => {
    if (fromStage === toStage) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage: toStage } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage: fromStage } : t));
    }
  };

  // "Attente d'éléments" ne suit pas le glisser-déposer libre des autres
  // colonnes : le déplacement n'est confirmé qu'après la modale (motif,
  // personne attendue, relance) — voir startWait, appelé par TaskWaitModal.
  const startWait = async (task: Task, data: { reason: string; waitingFor: string | null; comment: string | null; followUpDate: string | null }) => {
    const res = await fetch(`/api/tasks/${task.id}/wait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: data.reason, waiting_for: data.waitingFor, comment: data.comment, follow_up_date: data.followUpDate }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec du déplacement");
    }
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t, stage: "attente_elements",
      waiting: { reason: data.reason, waitingFor: data.waitingFor, comment: data.comment, followUpDate: data.followUpDate, startedAt: new Date().toISOString() },
    } : t));
    setPendingWait(null);
    toast.success("Tâche déplacée en attente d'éléments.");
  };

  const resolveWait = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/wait/resolve`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d: { stage: string } = await res.json();
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stage: d.stage, waiting: null } : t));
      toast.success("Éléments reçus.");
    } catch {
      toast.error("Échec de la mise à jour.");
    }
  };

  // "Facturation" ne suit pas non plus le glisser-déposer libre : le
  // déplacement n'est confirmé qu'après le choix du type de facture — voir
  // startBilling, appelé par TaskBillingModal.
  const startBilling = async (task: Task, data: { billingType: string }) => {
    const res = await fetch(`/api/tasks/${task.id}/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billing_type: data.billingType }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'envoi en facturation");
    }
    const d: { billingRequestId: string; requestedAt?: string } = await res.json();
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t, stage: "facturation",
      billing: { id: d.billingRequestId, billingType: data.billingType, billingStatus: "a_facturer", adminComment: null, requestedAt: now, updatedAt: now },
    } : t));
    setPendingBilling(null);
    toast.success("Tâche envoyée en facturation.");
  };

  // "BAT envoyé" ne suit pas non plus le glisser-déposer libre : la version
  // est calculée côté serveur (voir send_task_bat, migration 027).
  const startBat = async (task: Task, data: { link: string | null; comment: string | null }) => {
    const res = await fetch(`/api/tasks/${task.id}/bat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: data.link, comment: data.comment }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'envoi du BAT");
    }
    const d: { revisionId: string } = await res.json();
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t, stage: "bat_envoye",
      bat: { id: d.revisionId, version: (t.bat?.version ?? 0) + 1, status: "waiting_feedback", sentAt: now, link: data.link, returnComment: null, rejectionReason: null },
    } : t));
    setPendingBatSend(null);
    toast.success("Envoi du BAT enregistré.");
  };

  // Si validé + "Facturation" choisi comme prochaine étape, tasks.stage ne
  // bouge pas côté serveur (voir record_bat_result, migration 027) : on
  // enchaîne ici sur la modale de facturation déjà existante, qui est le
  // seul chemin légitime vers cette colonne (type de facture requis).
  const recordBatResult = async (task: Task, data: { status: "validated" | "rejected"; comment: string | null; rejectionReason: string | null; nextStage: string | null }) => {
    if (!task.bat) return;
    const res = await fetch(`/api/tasks/${task.id}/bat/${task.bat.id}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: data.status, comment: data.comment, rejection_reason: data.rejectionReason, next_stage: data.nextStage }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'enregistrement");
    }
    setPendingBatResult(null);

    if (data.status === "rejected") {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stage: "a_faire", bat: { ...t.bat!, status: "rejected", returnComment: data.comment, rejectionReason: data.rejectionReason } } : t));
      toast.success("BAT refusé — tâche renvoyée en À faire.");
    } else if (data.nextStage === "attente_diffusion") {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stage: "attente_diffusion", bat: { ...t.bat!, status: "validated", returnComment: data.comment } } : t));
      toast.success("BAT validé — tâche envoyée en Attente de diffusion.");
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, bat: { ...t.bat!, status: "validated", returnComment: data.comment } } : t));
      toast.success("BAT validé — choisis le type de facture pour terminer.");
      setPendingBilling(task);
    }
  };

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(1); }
  };

  const PRIO_RANK: Record<string, number> = { Urgente: 0, Haute: 1, Normale: 2, Basse: 3 };
  const STAGE_RANK: Record<string, number> = Object.fromEntries(TASK_STAGES.map((s, i) => [s.value, i]));

  // Permission de déplacer/gérer une tâche : sur sa propre vue ("me"), toutes
  // les tâches affichées lui sont déjà assignées par construction de la
  // requête serveur ; sinon (vue "Tous" ou d'un collègue), seuls
  // direction/admin peuvent même sélectionner cette vue — même règle que
  // POST /api/tasks/[id]/time-entry et PATCH /api/tasks/[id]/stage.
  const canManage = collabFilter === "me" || canSeeMoney;
  const canTrackTime = collabFilter === "me";
  // Envoyer en facturation exige d'être l'assigné OU d'avoir view_all_tasks
  // (direction) côté serveur (POST /api/tasks/[id]/billing) — plus strict
  // que canManage, qui admin obtient via view_billing sans être l'assigné.
  // Sans ce garde-fou séparé, un admin regardant les tâches d'un collègue
  // voit le bouton/le glisser-déposer puis se prend un 403.
  const canBilling = collabFilter === "me" || can(effectiveRole, "view_all_tasks");
  const canBat = canBilling;

  const visible = tasks.filter(t => showDone || !t.done);

  const clientOptions = Array.from(new Set(visible.map(t => t.projectClient).filter(Boolean))).sort();
  const projectOptions = Array.from(new Set(visible.map(t => t.projectName).filter(Boolean))).sort();
  const poleOptions = Array.from(new Set(visible.map(t => t.assigneePole).filter((p): p is string => !!p))).sort();

  const filtersActive = search.trim() !== "" || filterPriority !== "all" || filterClient !== "all" || filterProject !== "all" || filterPole !== "all" || filterOverdue || filterActiveOnly;
  const resetFilters = () => {
    setSearch(""); setFilterPriority("all"); setFilterClient("all"); setFilterProject("all"); setFilterPole("all");
    setFilterOverdue(false); setFilterActiveOnly(false);
  };

  const filtered = visible.filter(t => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterClient !== "all" && t.projectClient !== filterClient) return false;
    if (filterProject !== "all" && t.projectName !== filterProject) return false;
    if (filterPole !== "all" && t.assigneePole !== filterPole) return false;
    if (filterOverdue && taskDueState(t) !== "over") return false;
    if (filterActiveOnly && activeTimer?.taskId !== t.id) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.label.toLowerCase().includes(q) && !t.projectClient.toLowerCase().includes(q) && !t.projectName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    switch (sortKey) {
      case "label":       av = a.label.toLowerCase(); bv = b.label.toLowerCase(); break;
      case "priority":    av = PRIO_RANK[a.priority] ?? 9; bv = PRIO_RANK[b.priority] ?? 9; break;
      case "stage":       av = STAGE_RANK[a.stage] ?? 9; bv = STAGE_RANK[b.stage] ?? 9; break;
      case "taskType":    av = a.taskType ?? ""; bv = b.taskType ?? ""; break;
      case "projectClient": av = a.projectClient.toLowerCase(); bv = b.projectClient.toLowerCase(); break;
      case "projectName": av = a.projectName.toLowerCase(); bv = b.projectName.toLowerCase(); break;
      case "startDate":   av = a.startDate ?? ""; bv = b.startDate ?? ""; break;
      case "endDate":     av = a.endDate ?? ""; bv = b.endDate ?? ""; break;
      case "dueDate":     av = a.dueDate ?? "9999"; bv = b.dueDate ?? "9999"; break;
      case "charge":      av = a.totalMinutes; bv = b.totalMinutes; break;
      default:            av = a.dueDate ?? "9999"; bv = b.dueDate ?? "9999";
    }
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  const pendingCount = tasks.filter(t => !t.done).length;

  const kanbanCols = TASK_STAGES.map(s => ({
    key: s.value,
    label: s.label,
    items: filtered.filter(t => t.stage === s.value).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
  }));

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }`}</style>
      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={typography.pageTitle}>
              {collabFilter === "me" ? "Mes tâches" : collabFilter === "all" ? "Toutes les tâches" : `Tâches de ${collaborateurs.find(c => c.id === collabFilter)?.nom.split(" ")[0] ?? "…"}`}
            </h1>
            <div style={{ ...typography.description, marginTop: 5 }}>
              {collabFilter === "me" ? "Tâches qui te sont assignées, tous projets confondus" : collabFilter === "all" ? "Tous collaborateurs confondus, tous projets" : "Tous projets confondus"} · {pendingCount} en cours
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 10, padding: 3, gap: 2 }}>
              {(["kanban", "list"] as const).map(v => {
                const on = view === v;
                return (
                  <span key={v} onClick={() => setView(v)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 7, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: on ? "#0A0A0A" : "#8C8B83", background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 2px rgba(20,20,15,.10)" : "none" }}>
                    {v === "kanban" ? <IconKanban /> : <IconList />}
                    {v === "kanban" ? "Kanban" : "Liste"}
                  </span>
                );
              })}
            </div>
            <button className="btn" onClick={() => setShowDone(s => !s)} style={{ display: "flex", alignItems: "center", gap: 8, background: showDone ? "#0A0A0A" : "#fff", border: "1px solid #E2E1DA", color: showDone ? "#E9D7A6" : "#33322C", fontSize: 15, fontWeight: 600, padding: "9px 15px", borderRadius: 10, fontFamily: "inherit" }}>
              {showDone ? "Masquer les terminées" : "Afficher les terminées"}
            </button>
          </div>
        </div>

        {canSeeMoney && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Collaborateur</span>
            <span onClick={() => setCollabFilter("me")} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: collabFilter === "me" ? "#0A0A0A" : "#7C7B73", background: collabFilter === "me" ? "#fff" : "#F0EFEA", border: `1px solid ${collabFilter === "me" ? ACCENT : "#E5E4DD"}` }}>Moi</span>
            <span onClick={() => setCollabFilter("all")} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: collabFilter === "all" ? "#0A0A0A" : "#7C7B73", background: collabFilter === "all" ? "#fff" : "#F0EFEA", border: `1px solid ${collabFilter === "all" ? ACCENT : "#E5E4DD"}` }}>Tous</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {collaborateurs.map(c => {
                const on = collabFilter === c.id;
                return (
                  <span key={c.id} onClick={() => setCollabFilter(c.id)} title={c.nom} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: "#fff", border: `1.5px solid ${on ? ACCENT : "transparent"}` }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 99, padding: "6px 12px", color: "#A6A498" }}>
            <IconSearch size={13} color="currentColor" strokeWidth={1.8} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              style={{ border: "none", outline: "none", fontFamily: "inherit", fontSize: 14.5, color: "#33322C", background: "transparent", width: 140 }}
            />
          </div>
          <FilterSelect value={filterPriority} onChange={setFilterPriority} options={[...PRIORITY_OPTIONS]} placeholder="Toutes priorités" />
          {clientOptions.length > 0 && <FilterSelect value={filterClient} onChange={setFilterClient} options={clientOptions} placeholder="Tous clients" />}
          {projectOptions.length > 0 && <FilterSelect value={filterProject} onChange={setFilterProject} options={projectOptions} placeholder="Tous projets" />}
          {poleOptions.length > 0 && <FilterSelect value={filterPole} onChange={setFilterPole} options={poleOptions} placeholder="Toutes équipes" />}
          <FilterToggle active={filterOverdue} onClick={() => setFilterOverdue(v => !v)}>En retard</FilterToggle>
          <FilterToggle active={filterActiveOnly} onClick={() => setFilterActiveOnly(v => !v)}>Chrono actif</FilterToggle>
          {filtersActive && (
            <span onClick={resetFilters} style={{ fontSize: 14, fontWeight: 600, color: "#B91C1C", cursor: "pointer", padding: "6px 4px" }}>
              Réinitialiser les filtres
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", textAlign: "center", padding: 60, color: "#A6A498", fontSize: 15 }}>Chargement…</div>
        ) : sorted.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", padding: 50, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#33322C" }}>{filtersActive ? "Aucune tâche ne correspond aux filtres" : "Aucune tâche assignée"}</div>
            <div style={{ fontSize: 14.5, color: "#A6A498", marginTop: 6 }}>
              {filtersActive ? "Essaie de réinitialiser les filtres." : <>Les tâches créées et assignées depuis le détail d&apos;un projet apparaîtront ici.</>}
            </div>
          </div>
        ) : view === "kanban" ? (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto", paddingBottom: 14, margin: "0 -30px", paddingLeft: 30, paddingRight: 30 }}>
            {kanbanCols.map(col => {
              const over = dragOverCol === col.key;
              const color = TASK_STAGE_COLOR[col.key] ?? TASK_STAGE_COLOR.brief;
              return (
                <div
                  key={col.key}
                  style={{
                    width: 258, flex: "none", background: over ? "#F6EFDD" : "#EFEEE9",
                    border: `${over ? "2px" : "1.5px"} solid ${over ? "#C9A24E" : "#E6E5DE"}`,
                    borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10, minHeight: 480,
                    transition: "background .15s ease, border-color .15s ease",
                  }}
                  onDragOver={e => { e.preventDefault(); if (dragOverCol !== col.key) setDragOverCol(col.key); }}
                  onDragLeave={() => { if (dragOverCol === col.key) setDragOverCol(null); }}
                  onDrop={e => {
                    e.preventDefault();
                    if (drag) {
                      if (col.key === "attente_elements" && drag.fromStage !== "attente_elements") {
                        const draggedTask = tasks.find(t => t.id === drag.id);
                        if (draggedTask) setPendingWait(draggedTask);
                      } else if (col.key === "facturation" && drag.fromStage !== "facturation") {
                        if (canBilling) {
                          const draggedTask = tasks.find(t => t.id === drag.id);
                          if (draggedTask) setPendingBilling(draggedTask);
                        } else {
                          toast.error("Tu ne peux envoyer en facturation que tes propres tâches.");
                        }
                      } else if (col.key === "bat_envoye" && drag.fromStage !== "bat_envoye") {
                        if (canBat) {
                          const draggedTask = tasks.find(t => t.id === drag.id);
                          if (draggedTask) setPendingBatSend(draggedTask);
                        } else {
                          toast.error("Tu ne peux envoyer un BAT que sur tes propres tâches.");
                        }
                      } else {
                        moveStage(drag.id, drag.fromStage, col.key);
                      }
                      setDrag(null); setDragOverCol(null);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 9px", borderBottom: "1px solid #E2E1DA" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flex: "none" }} />
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "#33322C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{col.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#9A998F", background: "#E2E1DA", borderRadius: 99, padding: "1px 8px", flex: "none" }}>{col.items.length}</span>
                  </div>

                  {col.items.length === 0 ? (
                    <div style={{ padding: "18px 6px", textAlign: "center", fontSize: 14, color: "#B4B2A7" }}>Aucune tâche</div>
                  ) : col.items.map(task => {
                    const running = activeTimer?.taskId === task.id;
                    return (
                      <TaskStageCard
                        key={task.id}
                        task={task}
                        accent={color}
                        draggable={canManage}
                        isDragging={drag?.id === task.id}
                        running={running}
                        elapsed={running ? elapsed : null}
                        canTrackTime={canTrackTime}
                        onOpen={() => setTimeModalTask(task)}
                        onToggleDone={e => { e.stopPropagation(); toggleDone(task); }}
                        onOpenTime={e => { e.stopPropagation(); setTimeModalTask(task); }}
                        onStartTimer={e => { e.stopPropagation(); startTimer(task); }}
                        onStopTimer={e => { e.stopPropagation(); stopTimer(); }}
                        onResolveWait={canManage ? e => { e.stopPropagation(); resolveWait(task); } : undefined}
                        onRecordBatResult={canBat ? e => { e.stopPropagation(); setPendingBatResult(task); } : undefined}
                        onDragStart={() => setDrag({ id: task.id, fromStage: task.stage })}
                        onDragEnd={() => { setDrag(null); setDragOverCol(null); }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1460, display: "grid", gridTemplateColumns: GRID, alignItems: "center", padding: "0 20px", height: 40, background: "#FAFAF7", borderBottom: "1px solid #EFEEE8" }}>
                <span />
                <Th label="Titre" k="label" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Étape" k="stage" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Priorité" k="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Type" k="taskType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Client" k="projectClient" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Projet" k="projectName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Début" k="startDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Fin" k="endDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Échéance" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th label="Charge" k="charge" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <ThLabel label="Affectation" />
                <ThLabel label="Chrono" />
              </div>
              {sorted.map((task, i) => {
                const charge = chargeInfo(task.totalMinutes, task.estimatedMinutes);
                const running = activeTimer?.taskId === task.id;
                return (
                  <div key={task.id} style={{ minWidth: 1460, display: "grid", gridTemplateColumns: GRID, alignItems: "center", padding: "11px 20px", borderBottom: i === sorted.length - 1 ? "none" : "1px solid #F2F1EB" }}>
                    <span onClick={() => toggleDone(task)} style={{ width: 19, height: 19, borderRadius: 6, border: `2px solid ${task.done ? "#1F9D57" : "#D6D4CB"}`, background: task.done ? "#1F9D57" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer" }}>
                      {task.done && <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>}
                    </span>
                    <span onClick={() => setTimeModalTask(task)} style={{ fontSize: 15.5, fontWeight: 600, color: task.done ? "#9A998F" : "#1C1B16", textDecoration: task.done ? "line-through" : "none", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{task.label}</span>
                    <span style={{ paddingRight: 8 }}><StageBadge stage={task.stage} /></span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.Normale }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.Normale }} />
                      {task.priority}
                    </span>
                    <span style={{ fontSize: 14.5, color: task.taskType ? "#5C5A52" : "#C7C5BB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{task.taskType ?? "—"}</span>
                    <span style={{ fontSize: 14.5, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{task.projectClient || "—"}</span>
                    <span onClick={() => router.push(`/projets?open=${task.projectId}`)} style={{ fontSize: 14.5, color: "#5C5A52", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{task.projectName}</span>
                    <span style={{ fontSize: 14, color: "#8C8B83" }}>{fmtDate(task.startDate)}</span>
                    <span style={{ fontSize: 14, color: "#8C8B83" }}>{fmtDate(task.endDate)}</span>
                    <span style={{ fontSize: 14, color: "#8C8B83", fontWeight: 600 }}>{fmtDate(task.dueDate)}</span>
                    <span
                      onClick={() => setTimeModalTask(task)}
                      title="Saisir du temps"
                      style={{ fontSize: 13, fontWeight: 700, color: charge.color, background: charge.bg, borderRadius: 6, padding: "4px 9px", whiteSpace: "nowrap", cursor: "pointer", width: "fit-content" }}
                    >
                      {charge.label}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      {task.assigneeNom ? (
                        <>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: task.assigneeColor, flex: "none" }}>{getInitials(task.assigneeNom)}</span>
                          <span style={{ fontSize: 14, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.assigneeNom.split(" ")[0]}</span>
                        </>
                      ) : <span style={{ fontSize: 14, color: "#C7C5BB" }}>—</span>}
                    </span>
                    {canTrackTime ? (
                      <TimerControl
                        running={running}
                        elapsed={running ? elapsed : null}
                        onStart={e => { e.stopPropagation(); startTimer(task); }}
                        onStop={e => { e.stopPropagation(); stopTimer(); }}
                      />
                    ) : <span />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {timeModalTask && (
        <TaskTimeModal
          taskId={timeModalTask.id}
          taskLabel={timeModalTask.label}
          projectId={timeModalTask.projectId}
          projectName={timeModalTask.projectName}
          initialTotalMinutes={timeModalTask.totalMinutes}
          estimatedMinutes={timeModalTask.estimatedMinutes}
          currentStage={timeModalTask.stage}
          billing={timeModalTask.billing}
          canSendToBilling={canBilling}
          onRequestBilling={() => setPendingBilling(timeModalTask)}
          bat={timeModalTask.bat}
          canSendBat={canBat}
          onRequestBat={() => setPendingBatSend(timeModalTask)}
          onRequestBatResult={() => setPendingBatResult(timeModalTask)}
          canDelete={effectiveRole === "admin"}
          onDeleted={() => {
            setTasks(prev => prev.filter(t => t.id !== timeModalTask.id));
            setTimeModalTask(null);
          }}
          onClose={() => setTimeModalTask(null)}
          onSaved={(newTotalSeconds, newStage) => {
            setTasks(prev => prev.map(t => t.id === timeModalTask.id ? { ...t, totalMinutes: Math.ceil(newTotalSeconds / 60), stage: newStage } : t));
          }}
        />
      )}

      {pendingWait && (
        <TaskWaitModal
          taskLabel={pendingWait.label}
          onClose={() => setPendingWait(null)}
          onConfirm={data => startWait(pendingWait, data)}
        />
      )}

      {pendingBilling && (
        <TaskBillingModal
          taskLabel={pendingBilling.label}
          onClose={() => setPendingBilling(null)}
          onConfirm={data => startBilling(pendingBilling, data)}
        />
      )}

      {pendingBatSend && (
        <TaskBatSendModal
          taskLabel={pendingBatSend.label}
          onClose={() => setPendingBatSend(null)}
          onConfirm={data => startBat(pendingBatSend, data)}
        />
      )}

      {pendingBatResult && pendingBatResult.bat && (
        <TaskBatResultModal
          taskLabel={pendingBatResult.label}
          version={pendingBatResult.bat.version}
          onClose={() => setPendingBatResult(null)}
          onConfirm={data => recordBatResult(pendingBatResult, data)}
        />
      )}
    </div>
  );
}

function TaskStageCard({ task, accent, draggable, isDragging, running, elapsed, canTrackTime, onOpen, onToggleDone, onOpenTime, onStartTimer, onStopTimer, onResolveWait, onRecordBatResult, onDragStart, onDragEnd }: {
  task: Task; accent: string; draggable: boolean; isDragging: boolean; running: boolean; elapsed: string | null; canTrackTime: boolean;
  onOpen: () => void; onToggleDone: (e: React.MouseEvent) => void; onOpenTime: (e: React.MouseEvent) => void;
  onStartTimer: (e: React.MouseEvent) => void; onStopTimer: (e: React.MouseEvent) => void;
  onResolveWait?: (e: React.MouseEvent) => void;
  onRecordBatResult?: (e: React.MouseEvent) => void;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const charge = chargeInfo(task.totalMinutes, task.estimatedMinutes);
  const due = dueStyle(taskDueState(task));
  const prioColor = TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.Normale;
  const waiting = task.waiting;
  const followUpOverdue = !!waiting?.followUpDate && waiting.followUpDate < todayLocalStr();
  const billing = task.billing;
  const billingStatusColor = billing ? (TASK_BILLING_STATUS_COLOR[billing.billingStatus] ?? TASK_BILLING_STATUS_COLOR.a_facturer) : "#8C8B83";
  const bat = task.bat;
  const batStatusColor = bat ? (TASK_BAT_STATUS_COLOR[bat.status] ?? TASK_BAT_STATUS_COLOR.waiting_feedback) : "#8C8B83";
  const daysSinceSent = bat ? Math.floor((Date.now() - new Date(bat.sentAt).getTime()) / 86_400_000) : 0;

  return (
    <div
      draggable={draggable}
      onClick={onOpen}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={draggable ? undefined : "Réservé à l'assigné, direction ou admin"}
      style={{
        background: "#fff", border: `1px solid ${hovered ? "#C9A24E" : "#ECEBE4"}`, borderLeft: `3px solid ${accent}`,
        borderRadius: 12, padding: 13, boxShadow: hovered ? "0 12px 26px -12px rgba(201,162,78,.5)" : "0 1px 2px rgba(20,20,15,.05)",
        cursor: draggable ? "grab" : "pointer", opacity: isDragging ? 0.4 : 1, transform: hovered ? "translateY(-3px)" : "none",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          onClick={onToggleDone}
          style={{ width: 18, height: 18, borderRadius: 6, border: `2px solid ${task.done ? "#1F9D57" : "#D6D4CB"}`, background: task.done ? "#1F9D57" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer" }}
        >
          {task.done && <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span title={task.priority} style={{ width: 7, height: 7, borderRadius: "50%", background: prioColor, flex: "none" }} />
          {task.taskType && (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8C8B83", background: "#F0EFEA", borderRadius: 99, padding: "2px 9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.taskType}</span>
          )}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: task.done ? "#9A998F" : "#1C1B16", textDecoration: task.done ? "line-through" : "none", lineHeight: 1.3, marginTop: 9 }}>{task.label}</div>
      <div style={{ fontSize: 14, color: "#A6A498", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.projectClient ? `${task.projectClient} · ` : ""}{task.projectName}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: "1px solid #F2F1EB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {task.assigneeNom ? (
            <span title={task.assigneeNom} style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: task.assigneeColor, flex: "none" }}>{getInitials(task.assigneeNom)}</span>
          ) : (
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#ECEBE4", flex: "none" }} />
          )}
          <span
            onClick={onOpenTime}
            title="Saisir du temps"
            style={{ fontSize: 13, fontWeight: 700, color: charge.color, background: charge.bg, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            {charge.label}
          </span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: due.fontWeight, color: due.color }}>
          <IconClock size={12} />{fmtDate(task.dueDate)}
        </span>
      </div>
      {waiting && (
        <div style={{ marginTop: 10, background: "#FBF3E7", border: "1px solid #F0DFC0", borderRadius: 9, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#8C6D2F" }}>{TASK_WAIT_REASON_LABEL[waiting.reason] ?? waiting.reason}</span>
            {waiting.followUpDate && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: followUpOverdue ? "#DC2626" : "#8C6D2F" }}>{fmtDate(waiting.followUpDate)}</span>
            )}
          </div>
          {waiting.waitingFor && <div style={{ fontSize: 13, color: "#8C6D2F" }}>Attendu : {waiting.waitingFor}</div>}
          {onResolveWait && (
            <span
              onClick={onResolveWait}
              title="Confirmer la réception et reprendre la tâche"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 13.5, fontWeight: 700, color: "#1F8A5B", background: "#fff", border: "1.5px solid #1F8A5B", borderRadius: 99,
                padding: "6px 11px", cursor: "pointer", marginTop: 4, boxSizing: "border-box",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" /></svg>
              Marquer comme reçus
            </span>
          )}
        </div>
      )}
      {billing && (
        <div style={{ marginTop: 10, background: `${billingStatusColor}12`, border: `1px solid ${billingStatusColor}40`, borderRadius: 9, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: billingStatusColor }}>Facturation</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: billingStatusColor }}>{TASK_BILLING_STATUS_LABEL[billing.billingStatus] ?? billing.billingStatus}</span>
          </div>
          {billing.adminComment && <div style={{ fontSize: 13, color: "#5C5A52" }}>{billing.adminComment}</div>}
        </div>
      )}
      {bat && (
        <div style={{ marginTop: 10, background: `${batStatusColor}12`, border: `1px solid ${batStatusColor}40`, borderRadius: 9, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: batStatusColor }}>BAT envoyé le {fmtDate(bat.sentAt)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: batStatusColor }}>{TASK_BAT_STATUS_LABEL[bat.status] ?? bat.status}</span>
          </div>
          <div style={{ fontSize: 13, color: "#8C8B83" }}>Version {bat.version}{bat.status === "waiting_feedback" ? ` · depuis ${daysSinceSent} j` : ""}</div>
          {bat.rejectionReason && <div style={{ fontSize: 13, color: "#5C5A52" }}>Modifications demandées : {bat.rejectionReason}</div>}
          {bat.status === "waiting_feedback" && onRecordBatResult && (
            <span
              onClick={onRecordBatResult}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 13.5, fontWeight: 700, color: batStatusColor, background: "#fff", border: `1.5px solid ${batStatusColor}`, borderRadius: 99,
                padding: "6px 11px", cursor: "pointer", marginTop: 4, boxSizing: "border-box",
              }}
            >Enregistrer le retour client</span>
          )}
        </div>
      )}
      {canTrackTime && (
        <div style={{ marginTop: 10 }}>
          <TimerControl running={running} elapsed={elapsed} onStart={onStartTimer} onStop={onStopTimer} fullWidth />
        </div>
      )}
    </div>
  );
}

function TimerControl({ running, elapsed, onStart, onStop, fullWidth }: {
  running: boolean; elapsed: string | null;
  onStart: (e: React.MouseEvent) => void; onStop: (e: React.MouseEvent) => void;
  fullWidth?: boolean;
}) {
  if (running) {
    return (
      <span
        onClick={onStop}
        title="Arrêter le chrono"
        style={{
          display: "flex", alignItems: "center", justifyContent: fullWidth ? "center" : "flex-start", gap: 7,
          fontSize: 13.5, fontWeight: 700, color: "#B91C1C", background: "#FDECEC", borderRadius: 99,
          padding: "6px 11px", cursor: "pointer", whiteSpace: "nowrap", width: fullWidth ? "100%" : "fit-content", boxSizing: "border-box",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", animation: "pulse 1.4s ease-in-out infinite", flex: "none" }} />
        {elapsed}
        <IconStop size={9} />
      </span>
    );
  }
  return (
    <span
      onClick={onStart}
      title="Démarrer le chrono"
      style={{
        display: "flex", alignItems: "center", justifyContent: fullWidth ? "center" : "flex-start", gap: 6,
        fontSize: 13.5, fontWeight: 600, color: "#5C5A52", background: "#F0EFEA", borderRadius: 99,
        padding: "6px 11px", cursor: "pointer", whiteSpace: "nowrap", width: fullWidth ? "100%" : "fit-content", boxSizing: "border-box",
      }}
    >
      <IconPlayRounded size={10} />Démarrer
    </span>
  );
}
