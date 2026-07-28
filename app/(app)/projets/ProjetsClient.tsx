"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { chargeInfo } from "@/lib/task-charge";
import { TASK_PRIORITIES, TASK_PRIORITY_COLOR, TASK_TYPES } from "@/lib/task-taxonomy";
import TaskTimeModal from "@/components/TaskTimeModal";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";
import { PROJECT_TYPES, type ProjectType } from "@/lib/project-taxonomy";
import { IconX, IconClock, IconChevronDown as IconChevDown, IconFolder, IconDownload, IconUpload } from "@/components/ui/icons";

/* ─── Types ─── */
export type Collab = { id: string; nom: string; color: string | null; avatar: string | null };

export type DbRow = {
  id: string;
  name: string;
  client_name: string;
  status: string;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string | null;
  axonaut_contract_id: number | null;
  axonaut_quotation_id: number | null;
  created_via: string;
  created_at: string;
  project_type: string | null;
  total_minutes?: number;
  tasks_done?: number;
  tasks_total?: number;
};

export type InitialStatusRow = { status: string; data: DbRow[]; total: number };

interface Task { label: string; done: boolean; }
interface Project {
  id: string; name: string; client: string; col: ColKey;
  origin: "axonaut" | "manual";
  quoteRef: string; quotationId: number | null; assignee: string | null;
  start: string; due: string;
  startRaw: string | null; dueRaw: string | null;
  dueState: "ok" | "soon" | "over" | "done";
  batUploaded: boolean; invoiceNotified: boolean; tasks: Task[];
  dbStatus: string;
  projectType: string | null;
  totalMinutes: number;
}

type ColData = { items: Project[]; total: number; page: number; loading: boolean };

/* ─── Constantes statut ─── */
const COLS = [
  { key: "brief",      title: "Brief",             dot: "#A6A498", accent: "#A6A498" },
  { key: "afaire",     title: "À faire",           dot: "#6E6A5E", accent: "#8C8B83" },
  { key: "encours",    title: "En cours",          dot: "#2563EB", accent: "#2563EB" },
  { key: "attente",    title: "Attente élément",   dot: "#C2410C", accent: "#D08A4A", attente: true },
  { key: "validation", title: "Validation client", dot: "#C9A24E", accent: "#C9A24E" },
  { key: "bat",        title: "BAT envoyé",        dot: "#7C3AED", accent: "#7C3AED" },
  { key: "facturer",   title: "À facturer",        dot: "#C2410C", accent: "#C2410C", facturer: true },
  { key: "termine",    title: "Projet terminé",    dot: "#1F8A5B", accent: "#1F8A5B", termine: true },
] as const;
type ColKey = (typeof COLS)[number]["key"];

const DB_TO_COL: Record<string, ColKey> = {
  brief:             "brief",
  a_faire:           "afaire",
  en_cours:          "encours",
  attente_element:   "attente",
  validation_client: "validation",
  bat_envoye:        "bat",
  a_facturer:        "facturer",
  termine:           "termine",
};
const COL_TO_DB: Record<ColKey, string> = {
  brief:      "brief",
  afaire:     "a_faire",
  encours:    "en_cours",
  attente:    "attente_element",
  validation: "validation_client",
  bat:        "bat_envoye",
  facturer:   "a_facturer",
  termine:    "termine",
};


/* ─── Filtres de date ─── */
const DATE_OPTS = [
  { value: "1m",  label: "Dernier mois" },
  { value: "2m",  label: "2 derniers mois" },
  { value: "3m",  label: "3 derniers mois" },
  { value: "6m",  label: "6 derniers mois" },
  { value: "1a",  label: "Cette année" },
  { value: "all", label: "Tout l'historique" },
] as const;
type DateOpt = (typeof DATE_OPTS)[number]["value"];

function fromForOpt(opt: DateOpt): string | null {
  if (opt === "all") return null;
  const d = new Date();
  if (opt === "1m") { d.setMonth(d.getMonth() - 1);  return d.toISOString().slice(0, 10); }
  if (opt === "2m") { d.setMonth(d.getMonth() - 2);  return d.toISOString().slice(0, 10); }
  if (opt === "3m") { d.setMonth(d.getMonth() - 3);  return d.toISOString().slice(0, 10); }
  if (opt === "6m") { d.setMonth(d.getMonth() - 6);  return d.toISOString().slice(0, 10); }
  return `${new Date().getFullYear()}-01-01`;
}

/* ─── Helpers ─── */
function computeDueState(due: string | null, dbStatus: string): Project["dueState"] {
  if (dbStatus === "a_facturer" || dbStatus === "termine") return "done";
  if (!due) return "ok";
  const diff = (new Date(due).getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "over";
  if (diff <= 7) return "soon";
  return "ok";
}
function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function getInitials(nom: string): string {
  const p = nom.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nom.slice(0, 2).toUpperCase();
}
function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

type RealTask = {
  id: string; label: string; done: boolean;
  assignedTo: string | null; assigneeNom: string | null; assigneeColor: string;
  collaborators: { id: string; nom: string; avatar: string | null; color: string | null }[];
  estimatedMinutes: number | null; dueDate: string | null;
  priority: string; taskType: string | null; startDate: string | null; endDate: string | null;
  stage: string;
  totalMinutes: number;
};
function dbToProject(row: DbRow): Project {
  const col = DB_TO_COL[row.status] ?? "brief";
  const dueState = computeDueState(row.due_date, row.status);
  return {
    id:              row.id,
    name:            row.name,
    client:          row.client_name,
    col,
    origin:          row.created_via === "axonaut" ? "axonaut" : "manual",
    quoteRef:        row.axonaut_contract_id ? `AX-${row.axonaut_contract_id}` : "",
    quotationId:     row.axonaut_quotation_id ?? null,
    assignee:        row.assigned_to ?? null,
    start:           formatDate(row.start_date),
    due:             dueState === "done" ? "Livré" : formatDate(row.due_date),
    startRaw:        row.start_date ?? null,
    dueRaw:          row.due_date ?? null,
    dueState,
    batUploaded:     false,
    invoiceNotified: false,
    // tasks_total/tasks_done viennent d'une agrégation groupée (pas de label
    // individuel nécessaire ici, seuls .length et .filter(done) sont utilisés
    // par progressPct/progressStr/KanbanCard) — le détail réel des tâches est
    // chargé séparément via /api/tasks quand le slide-over s'ouvre.
    tasks:           Array.from({ length: row.tasks_total ?? 0 }, (_, i) => ({ label: "", done: i < (row.tasks_done ?? 0) })),
    dbStatus:        row.status,
    projectType:     row.project_type ?? null,
    totalMinutes:    row.total_minutes ?? 0,
  };
}

/* ─── Helpers couleur ─── */
function statusInfo(key: ColKey) {
  const m: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    brief:      { label: "Brief",             color: "#74726A", bg: "#F0EFEA",              dot: "#A6A498" },
    afaire:     { label: "À faire",           color: "#5C5A52", bg: "#EEEDE6",              dot: "#6E6A5E" },
    encours:    { label: "En cours",          color: "#2563EB", bg: "#E6EEFB",              dot: "#2563EB" },
    attente:    { label: "Attente élément",   color: "#C2410C", bg: "#FBEAE0",              dot: "#D08A4A" },
    validation: { label: "Validation client", color: "#B0892B", bg: "rgba(201,162,78,.14)", dot: "#C9A24E" },
    bat:        { label: "BAT envoyé",        color: "#7C3AED", bg: "#EDE9FB",              dot: "#7C3AED" },
    facturer:   { label: "À facturer",        color: "#C2410C", bg: "#FBEAE0",              dot: "#C2410C" },
    termine:    { label: "Projet terminé",    color: "#1F8A5B", bg: "#E7F3EB",              dot: "#1F8A5B" },
  };
  return m[key] || m.brief;
}
function dueStyle(state: string) {
  if (state === "over") return { color: "#DC2626", fontWeight: 700 };
  if (state === "soon") return { color: "#C2410C", fontWeight: 700 };
  if (state === "done") return { color: "#1F8A5B", fontWeight: 600 };
  return { color: "#5C5A52", fontWeight: 500 };
}
function originStyle(origin: string) {
  return origin === "axonaut"
    ? { originLabel: "Devis signé", originColor: "#1F8A5B", originBg: "#E7F3EB" }
    : { originLabel: "Manuel",      originColor: "#74726A", originBg: "#EEEDE6" };
}
function progressPct(p: Project) {
  return p.tasks.length ? Math.round(100 * p.tasks.filter(t => t.done).length / p.tasks.length) : 0;
}
function progressStr(p: Project) {
  if (!p.tasks.length) return "—";
  return `${p.tasks.filter(t => t.done).length}/${p.tasks.length}`;
}
function progressColor(p: Project) { return progressPct(p) === 100 ? "#1F8A5B" : "#C9A24E"; }

/* ─── Icônes SVG ─── */
const IconKanban = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="3.6" height="12" rx="1.2" /><rect x="8.2" y="4" width="3.6" height="8.5" rx="1.2" /><rect x="13.4" y="4" width="3.6" height="12" rx="1.2" /></svg>);
const IconList = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="16" y2="6" /><line x1="6" y1="10" x2="16" y2="10" /><line x1="6" y1="14" x2="16" y2="14" /><circle cx="3.5" cy="6" r="0.6" fill="currentColor" /><circle cx="3.5" cy="10" r="0.6" fill="currentColor" /><circle cx="3.5" cy="14" r="0.6" fill="currentColor" /></svg>);
const IconCheck = ({ size = 13, stroke = "#fff" }: { size?: number; stroke?: string }) => (<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>);
const IconHourglass = () => (<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5h8M6 16.5h8M6.5 3.5c0 3.5 7 3.5 7 7s-7 3.5-7 7" /><path d="M13.5 3.5c0 3.5-7 3.5-7 7s7 3.5 7 7" /></svg>);
const IconDoc = () => (<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h5l3 3v11H6z" /><path d="M11 3v3h3" /></svg>);
const IconWarning = () => (<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#D08A4A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3.5 17 16H3z" /><line x1="10" y1="8.4" x2="10" y2="11.6" /><circle cx="10" cy="13.8" r="0.5" fill="#D08A4A" /></svg>);
const IconInvoice = () => (<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#C2410C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="10" rx="1.6" /><path d="M3.5 6l6.5 5 6.5-5" /></svg>);
const IconArrow = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12" /><path d="M11 5l5 5-5 5" /></svg>);
const IconUser = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#9A9078" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3" /><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" /></svg>);
const IconEdit = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4l3 3-8 8-3.5.5.5-3.5z" /></svg>);
const IconAxonaut = () => (<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 3.2h6L15 6.6V16.8h-9.5z" /><path d="M8 10l1.6 1.6L13 8.4" /></svg>);
const IconExternal = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5h7v7" /><path d="M15 5l-9 9" /><path d="M5 8v7h7" /></svg>);
const IconOriginManual = () => (<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4l3 3-8 8-3.5.5.5-3.5z" /></svg>);
const IconOriginAxonaut = () => (<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>);
const IconSpinner = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>);

/* ─── Props ─── */
interface Props {
  initialStatusData: InitialStatusRow[];
  collaborateurs: Collab[];
  defaultFrom: string;
  manualCount: number;
}

function buildInitialColData(rows: InitialStatusRow[]): Record<ColKey, ColData> {
  const base: Record<ColKey, ColData> = {
    brief:      { items: [], total: 0, page: 1, loading: false },
    afaire:     { items: [], total: 0, page: 1, loading: false },
    encours:    { items: [], total: 0, page: 1, loading: false },
    attente:    { items: [], total: 0, page: 1, loading: false },
    validation: { items: [], total: 0, page: 1, loading: false },
    bat:        { items: [], total: 0, page: 1, loading: false },
    facturer:   { items: [], total: 0, page: 1, loading: false },
    termine:    { items: [], total: 0, page: 1, loading: false },
  };
  for (const row of rows) {
    const col = DB_TO_COL[row.status];
    if (col) base[col] = { items: row.data.map(dbToProject), total: row.total, page: 1, loading: false };
  }
  return base;
}

/* ─── Page principale ─── */
export default function ProjetsClient({
  initialStatusData,
  collaborateurs,
  defaultFrom,
  manualCount,
}: Props) {
  const collabsMap = Object.fromEntries(collaborateurs.map(c => [c.id, c]));
  const { effectiveRole } = useAuth();
  // Page entièrement en lecture seule pour le Collaborateur (spec
  // permissions) — même sur ses propres projets assignés. Gardé au niveau
  // des fonctions de mutation (plutôt que sur chaque déclencheur JSX) pour
  // rester sûr même si un bouton n'est pas masqué ; le serveur refuse de
  // toute façon ces actions pour ce rôle (create_project/update_project/
  // assign_project/create_task).
  const canEdit = can(effectiveRole, "update_project");

  const [colData, setColData]         = useState<Record<ColKey, ColData>>(() => buildInitialColData(initialStatusData));
  const [view, setView]               = useState<"kanban" | "list">("kanban");
  const [drag, setDrag]               = useState<{ id: string; fromCol: ColKey } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColKey | null>(null);
  const [detailId, setDetailId]       = useState<string | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [taskDraft, setTaskDraft]     = useState("");
  const [filterCollab, setFilterCollab] = useState("tous");
  const [filterStatus, setFilterStatus] = useState("tous");
  const [filterOrigin, setFilterOrigin] = useState("tous");
  const [dateOpt, setDateOpt]         = useState<DateOpt>("3m");
  const [sortBy, setSortBy]           = useState<string | null>(null);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [newOpen, setNewOpen]         = useState(false);
  const [newSaved, setNewSaved]       = useState(false);
  const [reloading, setReloading]     = useState(false);
  const [pdf, setPdf] = useState<{ quotationId: number; status: "loading" | "ready" | "error"; blobUrl: string | null; error: string | null } | null>(null);
  const [nf, setNf] = useState({ name: "", client: "", assignee: "", start: "", due: "", tasks: [] as { label: string }[], taskText: "", clientOpen: false });
  const [batStatus, setBatStatus] = useState<{ id: string; bat_url: string; status: string; client_email: string; client_comment: string | null; responded_at: string | null } | null>(null);
  const [batLoading, setBatLoading] = useState(false);
  const [batUploading, setBatUploading] = useState(false);
  const [batClientEmail, setBatClientEmail] = useState("");
  const [batSendEmail, setBatSendEmail] = useState(true);
  const [batFile, setBatFile] = useState<File | null>(null);
  const [batSent, setBatSent] = useState(false);
  const [batEmailError, setBatEmailError] = useState<string | null>(null);
  const [filterTypes, setFilterTypes]     = useState<ProjectType[]>([]);
  const [typeDropOpen, setTypeDropOpen]   = useState(false);
  const typeDropRef = useRef<HTMLDivElement>(null);
  const [realTasks, setRealTasks] = useState<RealTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [assigneeDropdownFor, setAssigneeDropdownFor] = useState<string | null>(null);
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newTaskMinutes, setNewTaskMinutes] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("Normale");
  const [newTaskType, setNewTaskType] = useState("");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskEnd, setNewTaskEnd] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [editTaskFor, setEditTaskFor] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState("Normale");
  const [editType, setEditType] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [timeModalTask, setTimeModalTask] = useState<RealTask | null>(null);
  const [pinnedProject, setPinnedProject] = useState<Project | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDropRef.current && !typeDropRef.current.contains(e.target as Node)) {
        setTypeDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Deep-link depuis une autre page (ex: Mes tâches) : /projets?open=<projectId>
  // ouvre directement le détail du projet concerné, même s'il n'est pas dans
  // les colonnes déjà chargées côté client.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    router.replace("/projets", { scroll: false });
    if (COLS.some(c => colData[c.key].items.some(p => p.id === openId))) {
      setDetailId(openId);
      return;
    }
    fetch(`/api/projets/${openId}`)
      .then(r => r.json())
      .then((d: { data?: DbRow }) => {
        if (d.data) {
          setPinnedProject(dbToProject(d.data));
          setDetailId(openId);
        }
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const dp = detailId
    ? COLS.flatMap(c => colData[c.key].items).find(p => p.id === detailId)
      ?? (pinnedProject?.id === detailId ? pinnedProject : null)
    : null;

  useEffect(() => {
    setDeleteProjectConfirm(false);
  }, [detailId]);

  useEffect(() => {
    if (!detailId || !dp || dp.col !== "bat") {
      setBatStatus(null); setBatFile(null); setBatClientEmail(""); setBatSent(false); setBatEmailError(null);
      return;
    }
    setBatLoading(true);
    fetch(`/api/projets/${detailId}/bat-status`)
      .then(r => r.json())
      .then(d => {
        const v = d.validation ?? null;
        setBatStatus(v);
        if (v?.client_email) setBatClientEmail(v.client_email);
      })
      .catch(() => setBatStatus(null))
      .finally(() => setBatLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, dp?.col]);

  const loadTasks = useCallback((projectId: string) => {
    setTasksLoading(true);
    return fetch(`/api/tasks?project_id=${projectId}`)
      .then(r => r.json())
      .then((d: { tasks?: RealTask[]; error?: string }) => {
        if (Array.isArray(d.tasks)) { setRealTasks(d.tasks); setTaskError(null); }
        else { setRealTasks([]); setTaskError(d.error ?? "Impossible de charger les tâches"); }
      })
      .catch(() => { setRealTasks([]); setTaskError("Impossible de charger les tâches"); })
      .finally(() => setTasksLoading(false));
  }, []);

  useEffect(() => {
    if (!detailId) { setRealTasks([]); return; }
    setTaskDraft(""); setAssigneeDropdownFor(null); setEditTaskFor(null); setTaskError(null);
    setNewTaskHours(""); setNewTaskMinutes(""); setNewTaskDue(""); setNewTaskAssignee("");
    setNewTaskPriority("Normale"); setNewTaskType(""); setNewTaskStart(""); setNewTaskEnd("");
    loadTasks(detailId);
  }, [detailId, loadTasks]);

  // Les erreurs serveur (ex. colonne manquante si une migration n'a pas été
  // exécutée) ne doivent jamais échouer silencieusement — sinon l'UI donne
  // l'impression que rien ne s'est passé alors qu'une requête a échoué.
  const extractError = async (res: Response): Promise<string> => {
    try {
      const d = await res.json();
      return d.error || `Erreur ${res.status}`;
    } catch {
      return `Erreur ${res.status}`;
    }
  };

  const addDetailTask = async () => {
    const label = taskDraft.trim();
    if (!canEdit || !label || !detailId) return;
    setTaskDraft("");
    setTaskError(null);
    const estimated = (parseInt(newTaskHours, 10) || 0) * 60 + (parseInt(newTaskMinutes, 10) || 0);
    const due = newTaskDue;
    const assignee = newTaskAssignee;
    const priority = newTaskPriority;
    const type = newTaskType;
    const start = newTaskStart;
    const end = newTaskEnd;
    setNewTaskHours(""); setNewTaskMinutes(""); setNewTaskDue(""); setNewTaskAssignee("");
    setNewTaskPriority("Normale"); setNewTaskType(""); setNewTaskStart(""); setNewTaskEnd("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: detailId, label, estimated_minutes: estimated || null, due_date: due || null,
          assigned_to: assignee || null, priority, task_type: type || null, start_date: start || null, end_date: end || null,
        }),
      });
      if (!res.ok) throw new Error(await extractError(res));
      const { task } = await res.json() as { task: RealTask };
      setRealTasks(prev => [...prev, task]);
    } catch (e) {
      setTaskError(e instanceof Error ? e.message : "Échec de la création de la tâche");
    }
  };

  const openEditTask = (task: RealTask) => {
    setAssigneeDropdownFor(null);
    setEditTaskFor(editTaskFor === task.id ? null : task.id);
    setEditHours(task.estimatedMinutes ? String(Math.floor(task.estimatedMinutes / 60)) : "");
    setEditMinutes(task.estimatedMinutes ? String(task.estimatedMinutes % 60) : "");
    setEditDue(task.dueDate ?? "");
    setEditPriority(task.priority || "Normale");
    setEditType(task.taskType ?? "");
    setEditStart(task.startDate ?? "");
    setEditEnd(task.endDate ?? "");
  };

  const saveTaskEdit = async (taskId: string) => {
    if (!canEdit) return;
    const estimated = (parseInt(editHours, 10) || 0) * 60 + (parseInt(editMinutes, 10) || 0);
    const previous = realTasks;
    setRealTasks(prev => prev.map(t => t.id === taskId ? {
      ...t, estimatedMinutes: estimated || null, dueDate: editDue || null,
      priority: editPriority, taskType: editType || null, startDate: editStart || null, endDate: editEnd || null,
    } : t));
    setEditTaskFor(null);
    setTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_minutes: estimated || null, due_date: editDue || null,
          priority: editPriority, task_type: editType || null, start_date: editStart || null, end_date: editEnd || null,
        }),
      });
      if (!res.ok) throw new Error(await extractError(res));
    } catch (e) {
      setRealTasks(previous);
      setTaskError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    }
  };

  const toggleTaskDone = async (taskId: string) => {
    const previous = realTasks;
    setRealTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    setTaskError(null);
    try {
      const task = previous.find(t => t.id === taskId);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task?.done }),
      });
      if (!res.ok) throw new Error(await extractError(res));
    } catch (e) {
      setRealTasks(previous);
      setTaskError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    }
  };

  const setTaskAssignee = async (taskId: string, collabId: string | null) => {
    setAssigneeDropdownFor(null);
    const previous = realTasks;
    const collab = collabId ? collaborateurs.find(c => c.id === collabId) ?? null : null;
    setRealTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: collabId, assigneeNom: collab?.nom ?? null, assigneeColor: collab?.color ?? "#888" } : t));
    setTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: collabId }),
      });
      if (!res.ok) throw new Error(await extractError(res));
    } catch (e) {
      setRealTasks(previous);
      setTaskError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    }
  };

  // Collaborateurs additionnels sur une tâche (en plus de l'assigné
  // principal ci-dessus) — leur permet de saisir du temps et de voir le
  // projet correspondant (lib/task-access.ts, lib/project-access.ts).
  const toggleTaskCollaborator = async (taskId: string, collabId: string) => {
    const task = realTasks.find(t => t.id === taskId);
    if (!task) return;
    const already = task.collaborators.some(c => c.id === collabId);
    const nextIds = already ? task.collaborators.filter(c => c.id !== collabId).map(c => c.id) : [...task.collaborators.map(c => c.id), collabId];
    const previous = realTasks;
    const collab = collaborateurs.find(c => c.id === collabId) ?? null;
    setRealTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      collaborators: already ? t.collaborators.filter(c => c.id !== collabId) : [...t.collaborators, { id: collabId, nom: collab?.nom ?? "", avatar: null, color: collab?.color ?? "#888" }],
    } : t));
    setTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaborator_ids: nextIds }),
      });
      if (!res.ok) throw new Error(await extractError(res));
    } catch (e) {
      setRealTasks(previous);
      setTaskError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    }
  };

  const deleteDetailTask = async (taskId: string) => {
    if (!canEdit) return;
    const previous = realTasks;
    setRealTasks(prev => prev.filter(t => t.id !== taskId));
    setTaskError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await extractError(res));
    } catch (e) {
      setRealTasks(previous);
      setTaskError(e instanceof Error ? e.message : "Échec de la suppression");
    }
  };

  /* ─── Helpers filtre ─── */
  const matchCollab = (p: Project) => filterCollab === "tous" || p.assignee === filterCollab;
  const matchOrigin = (p: Project) => filterOrigin === "tous" || p.origin === filterOrigin;
  const matchStatus = (p: Project) => filterStatus === "tous" || p.col === filterStatus;

  /* ─── Reload all columns (après changement date/collab/type) ─── */
  const reloadAll = useCallback(async (opt: DateOpt, collabFilter: string, typeFilter: ProjectType[] = []) => {
    setReloading(true);
    const from = fromForOpt(opt);
    const collabParam = collabFilter !== "tous" ? `&collab=${collabFilter}` : "";
    const fromParam   = from ? `&from=${from}` : "";
    const typeParam   = typeFilter.map(t => `&type=${encodeURIComponent(t)}`).join("");

    const results = await Promise.all(
      COLS.map(col =>
        fetch(`/api/projets?status=${COL_TO_DB[col.key]}${fromParam}${collabParam}${typeParam}`)
          .then(r => r.json())
          .then((r: { data: DbRow[]; total: number }) => ({
            col: col.key,
            items: (r.data ?? []).map(dbToProject),
            total: r.total ?? 0,
          }))
          .catch(() => ({ col: col.key, items: [] as Project[], total: 0 }))
      )
    );

    setColData(prev => {
      const next = { ...prev };
      for (const r of results) next[r.col] = { items: r.items, total: r.total, page: 1, loading: false };
      return next;
    });
    setReloading(false);
  }, []);

  const deleteProject = async () => {
    if (!detailId || deletingProject) return;
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projets/${detailId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteProjectConfirm(false);
      setDetailId(null);
      await reloadAll(dateOpt, filterCollab, filterTypes);
    } catch {
      // silencieux : la modale reste ouverte en mode confirmation, l'admin peut réessayer
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDateOpt = (opt: DateOpt) => {
    setDateOpt(opt);
    reloadAll(opt, filterCollab, filterTypes);
  };

  const handleCollabFilter = (v: string) => {
    setFilterCollab(v);
    reloadAll(dateOpt, v, filterTypes);
  };

  const toggleTypeFilter = (type: ProjectType) => {
    setFilterTypes(prev => {
      const next = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      reloadAll(dateOpt, filterCollab, next);
      return next;
    });
  };

  const clearTypeFilter = () => {
    setFilterTypes([]);
    reloadAll(dateOpt, filterCollab, []);
  };

  /* ─── Voir plus ─── */
  const loadMore = async (col: ColKey) => {
    setColData(prev => ({ ...prev, [col]: { ...prev[col], loading: true } }));
    const from = fromForOpt(dateOpt);
    const nextPage = colData[col].page + 1;
    const collabParam = filterCollab !== "tous" ? `&collab=${filterCollab}` : "";
    const fromParam   = from ? `&from=${from}` : "";
    const typeParam   = filterTypes.map(t => `&type=${encodeURIComponent(t)}`).join("");
    try {
      const r = await fetch(`/api/projets?status=${COL_TO_DB[col]}&page=${nextPage}${fromParam}${collabParam}${typeParam}`).then(res => res.json()) as { data: DbRow[]; total: number };
      setColData(prev => ({
        ...prev,
        [col]: {
          items: [...prev[col].items, ...(r.data ?? []).map(dbToProject)],
          total: r.total ?? prev[col].total,
          page: nextPage,
          loading: false,
        },
      }));
    } catch {
      setColData(prev => ({ ...prev, [col]: { ...prev[col], loading: false } }));
    }
  };

  /* ─── Mutations ─── */
  const moveCard = async (id: string, fromCol: ColKey, toCol: ColKey) => {
    if (!canEdit || fromCol === toCol) return;
    setColData(prev => {
      const item = prev[fromCol].items.find(p => p.id === id);
      if (!item) return prev;
      const updated = { ...item, col: toCol, dbStatus: COL_TO_DB[toCol], dueState: computeDueState(null, COL_TO_DB[toCol]) };
      return {
        ...prev,
        [fromCol]: { ...prev[fromCol], items: prev[fromCol].items.filter(p => p.id !== id), total: Math.max(0, prev[fromCol].total - 1) },
        [toCol]:   { ...prev[toCol],   items: [updated, ...prev[toCol].items], total: prev[toCol].total + 1 },
      };
    });
    await fetch(`/api/projets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: COL_TO_DB[toCol] }),
    }).catch(() => null);
  };

  const setAssignee = async (id: string, collabId: string | null) => {
    if (!canEdit) return;
    setColData(prev => {
      const next = { ...prev };
      for (const col of COLS) {
        next[col.key] = { ...next[col.key], items: next[col.key].items.map(p => p.id === id ? { ...p, assignee: collabId } : p) };
      }
      return next;
    });
    await fetch(`/api/projets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: collabId }),
    }).catch(() => null);
  };

  const saveDate = useCallback(async (id: string, field: "start_date" | "due_date", value: string) => {
    if (!canEdit) return;
    const iso = value || null;
    setColData(prev => {
      const next = { ...prev };
      for (const col of COLS) {
        next[col.key] = {
          ...next[col.key],
          items: next[col.key].items.map(p => {
            if (p.id !== id) return p;
            const startRaw = field === "start_date" ? iso : p.startRaw;
            const dueRaw   = field === "due_date"   ? iso : p.dueRaw;
            const dueState = computeDueState(dueRaw, p.dbStatus);
            return {
              ...p,
              startRaw,
              dueRaw,
              start: formatDate(startRaw),
              due:   dueState === "done" ? "Livré" : formatDate(dueRaw),
              dueState,
            };
          }),
        };
      }
      return next;
    });
    await fetch(`/api/projets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: iso }),
    }).catch(() => null);
  }, [canEdit]);

  const setProjectType = async (id: string, type: string | null) => {
    if (!canEdit) return;
    setColData(prev => {
      const next = { ...prev };
      for (const col of COLS) {
        next[col.key] = { ...next[col.key], items: next[col.key].items.map(p => p.id === id ? { ...p, projectType: type } : p) };
      }
      return next;
    });
    await fetch(`/api/projets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_type: type }),
    }).catch(() => null);
  };

  const openPdf = (quotationId: number) => {
    setPdf({ quotationId, status: "loading", blobUrl: null, error: null });
    fetch(`/api/axonaut/quotation-pdf?id=${quotationId}`)
      .then(async res => {
        if (!res.ok) {
          let msg = `Axonaut ${res.status}`;
          try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
          setPdf(prev => prev ? { ...prev, status: "error", error: msg } : null);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdf(prev => prev ? { ...prev, status: "ready", blobUrl: url } : null);
      })
      .catch(e => setPdf(prev => prev ? { ...prev, status: "error", error: e.message } : null));
  };

  const closePdf = () => {
    setPdf(prev => { if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl); return null; });
  };

  const notifyInvoice = async (id: string) => {
    if (!canEdit) return;
    await fetch(`/api/projets/${id}/notify-facturation`, { method: "POST" }).catch(() => null);
    setColData(prev => {
      const next = { ...prev };
      let movedCard: Project | undefined;
      for (const col of COLS) {
        const item = next[col.key].items.find(p => p.id === id);
        if (item) {
          movedCard = { ...item, col: "termine", dbStatus: "termine", dueState: "done", invoiceNotified: true };
          next[col.key] = { ...next[col.key], items: next[col.key].items.filter(p => p.id !== id), total: Math.max(0, next[col.key].total - 1) };
          break;
        }
      }
      if (movedCard) {
        next.termine = { ...next.termine, items: [movedCard, ...next.termine.items], total: next.termine.total + 1 };
      }
      return next;
    });
  };

  const uploadBat = async () => {
    if (!canEdit || !batFile || !detailId) return;
    setBatUploading(true);
    setBatEmailError(null);
    const form = new FormData();
    form.append("file", batFile);
    form.append("project_id", detailId);
    form.append("client_email", batClientEmail);
    form.append("send_validation", batSendEmail ? "true" : "false");
    const res = await fetch("/api/bat/send", { method: "POST", body: form });
    if (res.ok) {
      const d = await res.json() as { ok: boolean; email_error?: string | null };
      if (d.email_error) {
        setBatEmailError(d.email_error);
      } else {
        setBatSent(true);
      }
      setBatFile(null);
      const r2 = await fetch(`/api/projets/${detailId}/bat-status`).then(r => r.json());
      const v = r2.validation ?? null;
      setBatStatus(v);
      if (v?.client_email) setBatClientEmail(v.client_email);
      setColData(prev => {
        const next = { ...prev };
        for (const col of COLS) {
          next[col.key] = { ...next[col.key], items: next[col.key].items.map(p => p.id === detailId ? { ...p, batUploaded: true } : p) };
        }
        return next;
      });
    }
    setBatUploading(false);
  };

  /* ─── Nouveau projet ─── */
  const nfSet = (patch: Partial<typeof nf>) => setNf(prev => ({ ...prev, ...patch }));
  const nfAddTask = () => {
    const v = (nf.taskText || "").trim();
    if (!v) return;
    nfSet({ tasks: [...nf.tasks, { label: v }], taskText: "" });
  };
  const nfRemoveTask = (i: number) => { const a = [...nf.tasks]; a.splice(i, 1); nfSet({ tasks: a }); };

  const saveNew = async () => {
    if (!canEdit) return;
    const name = (nf.name || "").trim() || "Nouveau projet";
    try {
      const res = await fetch("/api/projets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          client_name: nf.client || "Client à définir",
          assigned_to: nf.assignee || null,
          start_date: nf.start || null,
          due_date:   nf.due   || null,
        }),
      });
      const { data } = await res.json() as { data: DbRow };
      if (data) {
        if (nf.tasks.length > 0) {
          await Promise.all(nf.tasks.map(t =>
            fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_id: data.id, label: t.label }),
            }).catch(() => null),
          ));
        }
        const proj = { ...dbToProject(data), tasks: nf.tasks.map(t => ({ label: t.label, done: false })) };
        setColData(prev => ({
          ...prev,
          brief: { ...prev.brief, items: [proj, ...prev.brief.items], total: prev.brief.total + 1 },
        }));
      }
    } catch { /* optimistic only */ }
    setNewSaved(true);
    setTimeout(() => {
      setNewOpen(false); setNewSaved(false);
      setNf({ name: "", client: "", assignee: "", start: "", due: "", tasks: [], taskText: "", clientOpen: false });
    }, 850);
  };

  /* ─── Sort ─── */
  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  };

  const colOrder = COLS.reduce<Record<string, number>>((m, c, i) => { m[c.key] = i; return m; }, {});
  let listProjects = COLS
    .filter(c => filterStatus === "tous" || filterStatus === c.key)
    .flatMap(c => colData[c.key].items)
    .filter(p => matchCollab(p) && matchOrigin(p));
  if (sortBy) {
    const dir = sortDir === "asc" ? 1 : -1;
    listProjects = [...listProjects].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sortBy === "name")     { va = a.name.toLowerCase();   vb = b.name.toLowerCase(); }
      if (sortBy === "client")   { va = a.client.toLowerCase(); vb = b.client.toLowerCase(); }
      if (sortBy === "status")   { va = colOrder[a.col];        vb = colOrder[b.col]; }
      if (sortBy === "progress") { va = progressPct(a);         vb = progressPct(b); }
      if (va < vb) return -1 * dir; if (va > vb) return 1 * dir; return 0;
    });
  }

  const statusFilterOpts = [{ key: "tous", label: "Tous" }, ...COLS.map(c => ({ key: c.key, label: c.title }))];
  const originFilterOpts = [{ key: "tous", label: "Toutes" }, { key: "axonaut", label: "Devis signé" }, { key: "manual", label: "Manuel" }];

  return (
    <div style={{ margin: "-32px -40px", minHeight: "100vh", background: "#F5F5F2", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: "relative", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 30px", borderBottom: "1px solid #EAE9E3", background: "#FBFBF9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#8C8B83" }}>
          <span>Production</span><span style={{ color: "#C7C5BB" }}>/</span>
          <span style={{ color: "#33322C", fontWeight: 600 }}>Projets</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "#8C8B83", background: "#F0EFEA", border: "1px solid #E5E4DD", borderRadius: 8, padding: "6px 11px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3FBF77" }} />
          Synchro Axonaut active
        </div>
      </div>

      <div style={{ padding: "24px 30px 36px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={typography.pageTitle}>Projets</h1>
            <div style={{ ...typography.description, marginTop: 5 }}>
              {COLS.reduce((s, c) => s + colData[c.key].total, 0)} projets en production · {manualCount} créés manuellement
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
            {canEdit && (
              <Button variant="primary" onClick={() => { setNewOpen(true); setNewSaved(false); }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouveau projet
              </Button>
            )}
          </div>
        </div>

        {/* filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Collaborateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Collaborateur</span>
            <span onClick={() => handleCollabFilter("tous")} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: filterCollab === "tous" ? "#0A0A0A" : "#7C7B73", background: filterCollab === "tous" ? "#fff" : "#F0EFEA", border: `1px solid ${filterCollab === "tous" ? "#C9A24E" : "#E5E4DD"}` }}>Tous</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {collaborateurs.map(c => {
                const on = filterCollab === c.id;
                const initials = getInitials(c.nom);
                const bg = c.color || "#9A9078";
                return (
                  <span key={c.id} onClick={() => handleCollabFilter(filterCollab === c.id ? "tous" : c.id)} title={c.nom} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: "#fff", border: `1.5px solid ${on ? "#C9A24E" : "transparent"}` }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: bg }}>{initials}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Séparateur */}
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />

          {/* Période */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Période</span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <select
                value={dateOpt}
                onChange={e => handleDateOpt(e.target.value as DateOpt)}
                style={{ appearance: "none", WebkitAppearance: "none", fontSize: 14, fontWeight: 600, color: "#33322C", background: "#fff", border: "1px solid #E5E4DD", borderRadius: 8, padding: "6px 28px 6px 10px", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
              >
                {DATE_OPTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span style={{ position: "absolute", right: 8, pointerEvents: "none", color: "#A6A498" }}><IconChevDown /></span>
            </div>
            {reloading && <span style={{ color: "#A6A498" }}><IconSpinner /></span>}
          </div>

          {/* Séparateur */}
          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />

          {/* Filtre type de projet */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Type</span>
            <div style={{ position: "relative" }} ref={typeDropRef}>
              <button
                className="btn"
                onClick={() => setTypeDropOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 6, appearance: "none", fontSize: 14, fontWeight: 600, color: filterTypes.length > 0 ? "#0A0A0A" : "#33322C", background: filterTypes.length > 0 ? "#FBF8EF" : "#fff", border: `1px solid ${filterTypes.length > 0 ? "#C9A24E" : "#E5E4DD"}`, borderRadius: 8, padding: "6px 10px 6px 12px", fontFamily: "inherit", outline: "none" }}
              >
                {filterTypes.length === 0
                  ? "Tous"
                  : filterTypes.length === 1
                    ? (PROJECT_TYPES.find(p => p.value === filterTypes[0])?.label ?? filterTypes[0])
                    : `${filterTypes.length} types`
                }
                <IconChevDown />
              </button>
              {typeDropOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, background: "#fff", border: "1px solid #E5E4DD", borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,.11)", zIndex: 90, minWidth: 210, padding: "5px 0", whiteSpace: "nowrap" }}>
                  <div
                    onClick={() => { clearTypeFilter(); setTypeDropOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", fontSize: 15, fontWeight: filterTypes.length === 0 ? 700 : 500, color: filterTypes.length === 0 ? "#0A0A0A" : "#5C5A52", background: filterTypes.length === 0 ? "#F5F5F2" : "transparent" }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${filterTypes.length === 0 ? "#C9A24E" : "#D6D4CB"}`, background: filterTypes.length === 0 ? "#C9A24E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {filterTypes.length === 0 && <IconCheck size={9} />}
                    </span>
                    Tous les types
                  </div>
                  {PROJECT_TYPES.map(pt => {
                    const on = filterTypes.includes(pt.value as ProjectType);
                    return (
                      <div
                        key={pt.value}
                        onClick={() => toggleTypeFilter(pt.value as ProjectType)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", fontSize: 15, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#5C5A52", background: on ? "#F5F5F2" : "transparent" }}
                      >
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? "#C9A24E" : "#D6D4CB"}`, background: on ? "#C9A24E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {on && <IconCheck size={9} />}
                        </span>
                        {pt.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {view === "list" && (
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Statut</span>
                {statusFilterOpts.map(o => {
                  const on = filterStatus === o.key;
                  return <span key={o.key} onClick={() => setFilterStatus(o.key)} style={{ padding: "5px 11px", borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : "#7C7B73", background: on ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` }}>{o.label}</span>;
                })}
              </span>
              <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Origine</span>
                {originFilterOpts.map(o => {
                  const on = filterOrigin === o.key;
                  return <span key={o.key} onClick={() => setFilterOrigin(o.key)} style={{ padding: "5px 11px", borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: "pointer", color: on ? "#fff" : "#7C7B73", background: on ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${on ? "#0A0A0A" : "#E5E4DD"}` }}>{o.label}</span>;
                })}
              </span>
            </span>
          )}
        </div>

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 14, margin: "0 -30px", paddingLeft: 30, paddingRight: 30 }}>
            {COLS.map(col => {
              const colKey = col.key as ColKey;
              const over = dragOverCol === colKey;
              const cd = colData[colKey];
              const visibleCards = cd.items.filter(p => matchCollab(p) && matchOrigin(p));
              const hasMore = cd.items.length < cd.total;

              let bg = "#EFEEE9", borderColor = "#E6E5DE", borderWidth = "1.5px", dividerColor = "#E2E1DA", titleColor = "#33322C", countColor = "#9A998F", countBg = "#E2E1DA";
              if ("attente" in col && col.attente) { bg = "#F2EFE9"; borderColor = "#E8DECF"; dividerColor = "#E6DCCB"; titleColor = "#8A6A42"; }
              if ("facturer" in col && col.facturer) { bg = "#FBF3EC"; borderColor = "#E6A972"; borderWidth = "2px"; dividerColor = "#EFC9A8"; titleColor = "#B7501A"; countColor = "#B7501A"; countBg = "#F6DAC2"; }
              if ("termine" in col && col.termine) { bg = "#EBF5F0"; borderColor = "#AED6C0"; borderWidth = "2px"; dividerColor = "#C4DFD2"; titleColor = "#1F8A5B"; countColor = "#1F8A5B"; countBg = "#D4EDE0"; }
              if (over) { bg = "#F6EFDD"; borderColor = "#C9A24E"; borderWidth = "2px"; }

              return (
                <div
                  key={colKey}
                  style={{ width: 266, flex: "none", background: bg, border: `${borderWidth} solid ${borderColor}`, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10, minHeight: 480, transition: "background .15s ease, border-color .15s ease" }}
                  onDragOver={e => { e.preventDefault(); if (dragOverCol !== colKey) setDragOverCol(colKey); }}
                  onDragLeave={() => { if (dragOverCol === colKey) setDragOverCol(null); }}
                  onDrop={e => { e.preventDefault(); if (drag) { moveCard(drag.id, drag.fromCol, colKey); setDrag(null); setDragOverCol(null); } }}
                >
                  {/* column header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 9px", borderBottom: `1px solid ${dividerColor}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: col.dot, flex: "none" }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: titleColor, whiteSpace: "nowrap" }}>{col.title}</span>
                      {"attente" in col && col.attente && <IconWarning />}
                      {"facturer" in col && col.facturer && <IconInvoice />}
                    </div>
                    <span title={`${cd.total} projets`} style={{ fontSize: 13, fontWeight: 700, color: countColor, background: countBg, borderRadius: 99, padding: "1px 8px", flex: "none" }}>{cd.total}</span>
                  </div>

                  {"facturer" in col && col.facturer && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#B7651E", background: "rgba(194,65,12,.07)", borderRadius: 7, padding: "6px 9px", lineHeight: 1.35 }}>
                      <IconClock />À traiter par la comptabilité dans Facturation
                    </div>
                  )}

                  {/* cards */}
                  {visibleCards.map(p => {
                    const due = dueStyle(p.dueState);
                    const { originLabel, originColor, originBg } = originStyle(p.origin);
                    const showHourglass = p.col === "attente";
                    const showDoc = p.batUploaded && p.col !== "facturer";
                    const showEnvelope = p.col === "facturer" && p.invoiceNotified;
                    const accent = COLS.find(c => c.key === p.col)?.accent ?? "#A6A498";
                    return (
                      <KanbanCard
                        key={p.id}
                        p={p}
                        accent={accent}
                        collabsMap={collabsMap}
                        originLabel={originLabel}
                        originColor={originColor}
                        originBg={originBg}
                        showHourglass={showHourglass}
                        showDoc={showDoc}
                        showEnvelope={showEnvelope}
                        due={due}
                        isDragging={drag?.id === p.id}
                        draggable={canEdit}
                        onOpen={() => setDetailId(p.id)}
                        onDragStart={() => setDrag({ id: p.id, fromCol: colKey })}
                        onDragEnd={() => { setDrag(null); setDragOverCol(null); }}
                        onNotify={e => { e.stopPropagation(); notifyInvoice(p.id); }}
                      />
                    );
                  })}

                  {/* Voir plus */}
                  {hasMore && (
                    <button
                      className="btn"
                      onClick={() => loadMore(colKey)}
                      disabled={cd.loading}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1px solid #D2D0C7", color: "#74726A", fontSize: 14, fontWeight: 600, padding: "8px 9px", borderRadius: 10, fontFamily: "inherit" }}
                    >
                      {cd.loading
                        ? <><IconSpinner />Chargement…</>
                        : <>Voir plus ({cd.total - cd.items.length} restants)</>
                      }
                    </button>
                  )}

                  {canEdit && (
                    <button className="btn" onClick={() => setNewOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1.5px dashed #D2D0C7", color: "#9A998F", fontSize: 14, fontWeight: 600, padding: 9, borderRadius: 10, fontFamily: "inherit" }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouveau projet
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 14px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1.5fr 1.3fr 1.4fr 1fr 1fr 1.1fr 0.7fr", gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
              {[
                { key: "name",     label: "Projet",        sortable: true },
                { key: "client",   label: "Client",        sortable: true },
                { key: "assignee", label: "Collaborateur", sortable: false },
                { key: "status",   label: "Statut",        sortable: true },
                { key: "origin",   label: "Origine",       sortable: false },
                { key: "due",      label: "Échéance",      sortable: false },
                { key: "progress", label: "Avancement",    sortable: true },
                { key: "actions",  label: "",              sortable: false },
              ].map(h => {
                const active = sortBy === h.key;
                return (
                  <span key={h.key} onClick={h.sortable ? () => toggleSort(h.key) : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: active ? "#33322C" : "#A6A498", fontWeight: 700, cursor: h.sortable ? "pointer" : "default", justifyContent: h.key === "actions" ? "flex-end" : "flex-start" }}>
                    {h.label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </span>
                );
              })}
            </div>
            {listProjects.map(p => {
              const st = statusInfo(p.col);
              const due = dueStyle(p.dueState);
              const { originLabel, originColor, originBg } = originStyle(p.origin);
              const collab = collabsMap[p.assignee ?? ""];
              const accent = COLS.find(c => c.key === p.col)?.accent ?? "#A6A498";
              return (
                <div key={p.id} onClick={() => setDetailId(p.id)} style={{ display: "grid", gridTemplateColumns: "2.1fr 1.5fr 1.3fr 1.4fr 1fr 1fr 1.1fr 0.7fr", gap: 14, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <span style={{ width: 7, height: 34, borderRadius: 99, background: accent, flex: "none" }} />
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 15, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.client}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {collab ? (
                      <>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: collab.color || "#9A9078", flex: "none" }}>{getInitials(collab.nom)}</span>
                        <span style={{ fontSize: 14.5, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{collab.nom.split(" ")[0]}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 14, color: "#C7C5BB" }}>—</span>
                    )}
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: originColor, background: originBg, borderRadius: 99, padding: "3px 9px", whiteSpace: "nowrap" }}>
                      {p.origin === "axonaut" ? <IconOriginAxonaut /> : <IconOriginManual />}{originLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: due.fontWeight, color: due.color }}>{p.due}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    {p.tasks.length > 0 ? (
                      <>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#EFEDE5", minWidth: 40 }}>
                          <div style={{ height: "100%", borderRadius: 99, width: `${progressPct(p)}%`, background: progressColor(p) }} />
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#74726A", width: 30, textAlign: "right" }}>{progressStr(p)}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 13.5, color: "#C7C5BB" }}>—</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498" }}><IconArrow /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DETAIL SLIDE-OVER ── */}
      {dp && (
        <div onClick={() => setDetailId(null)} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} className="modal-slide-in" style={{ width: 560, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
            {/* header */}
            <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
              <div style={{ position: "absolute", top: -60, right: -30, width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {(() => { const st = statusInfo(dp.col); return (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "3px 10px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}
                    </span>
                  ); })()}
                  {(() => { const { originLabel } = originStyle(dp.origin); return (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: dp.origin === "axonaut" ? "#9BE3B5" : "#C7C5BB", background: dp.origin === "axonaut" ? "rgba(31,138,91,.22)" : "rgba(255,255,255,.08)", borderRadius: 99, padding: "3px 10px" }}>
                      {dp.origin === "axonaut" ? <IconOriginAxonaut /> : <IconOriginManual />}{originLabel}
                    </span>
                  ); })()}
                </div>
                <span onClick={() => setDetailId(null)} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer", flex: "none" }}><IconX /></span>
              </div>
              <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 25, fontWeight: 800, color: "#F4ECD7", marginTop: 14, lineHeight: 1.15, position: "relative" }}>{dp.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, position: "relative" }}>
                <IconUser />
                <span style={{ fontSize: 15.5, color: "#AEA890", fontWeight: 500 }}>{dp.client}</span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
            {canEdit ? (<>
              {/* statut */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Statut · glisser ou changer ici</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COLS.map(c => {
                    const on = dp.col === c.key;
                    const si = statusInfo(c.key as ColKey);
                    return (
                      <span key={c.key} onClick={() => moveCard(dp.id, dp.col, c.key as ColKey)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: on ? "#fff" : si.color, background: on ? si.dot : si.bg, border: `1px solid ${on ? si.dot : "transparent"}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: on ? "#fff" : si.dot }} />{c.title}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* collaborateur */}
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 11 }}>Collaborateur assigné</div>
                {(() => {
                  const collab = collabsMap[dp.assignee ?? ""];
                  return collab ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", background: collab.color || "#9A9078", flex: "none" }}>{getInitials(collab.nom)}</span>
                      <div>
                        <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1B16" }}>{collab.nom}</div>
                        {collab.avatar && <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 1 }}>{collab.avatar}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 15, color: "#A6A498", marginBottom: 12 }}>Aucun collaborateur assigné</div>
                  );
                })()}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span onClick={() => setAssignee(dp.id, null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, cursor: "pointer", background: !dp.assignee ? "#F0EFEA" : "#fff", border: `1.5px solid ${!dp.assignee ? "#C9A24E" : "#ECEBE4"}`, fontSize: 13.5, fontWeight: 600, color: "#5C5A52" }}>—</span>
                  {collaborateurs.map(c => {
                    const on = dp.assignee === c.id;
                    return (
                      <span key={c.id} onClick={() => setAssignee(dp.id, c.id)} title={c.nom} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 3px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* dates */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Calendrier du projet</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {/* Date de début */}
                  <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 }}>
                    <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 6 }}>Début</div>
                    <input
                      key={`start-${dp.id}-${dp.startRaw}`}
                      type="date"
                      defaultValue={dp.startRaw ?? ""}
                      onBlur={e => saveDate(dp.id, "start_date", e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", fontSize: 15.5, fontWeight: 700, color: "#1C1B16", background: "transparent", fontFamily: "inherit", cursor: "pointer" }}
                    />
                  </div>
                  {/* Date butoir */}
                  <div style={{
                    background: dp.dueState === "over" ? "#FBEAE0" : dp.dueState === "soon" ? "#FBF1E8" : "#fff",
                    border: `1px solid ${dp.dueState === "over" ? "#F0C5B0" : dp.dueState === "soon" ? "#F0D9C5" : "#ECEBE4"}`,
                    borderRadius: 12, padding: 13,
                  }}>
                    <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: (dp.dueState === "over" || dp.dueState === "soon") ? "#C2410C" : "#A6A498", fontWeight: 700, marginBottom: 6 }}>Date butoir</div>
                    <input
                      key={`due-${dp.id}-${dp.dueRaw}`}
                      type="date"
                      defaultValue={dp.dueRaw ?? ""}
                      onBlur={e => saveDate(dp.id, "due_date", e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", fontSize: 15.5, fontWeight: 700, color: dueStyle(dp.dueState).color, background: "transparent", fontFamily: "inherit", cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>

              {/* type de projet */}
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Type de projet</div>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center", width: "100%" }}>
                  <select
                    value={dp.projectType ?? ""}
                    onChange={e => setProjectType(dp.id, e.target.value || null)}
                    style={{ appearance: "none", WebkitAppearance: "none", width: "100%", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: dp.projectType ? "#1C1B16" : "#A6A498", background: "#F9F9F7", border: "1px solid #E5E4DD", borderRadius: 9, padding: "9px 36px 9px 12px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="">— Non renseigné</option>
                    {PROJECT_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                  <span style={{ position: "absolute", right: 10, pointerEvents: "none", color: "#A6A498" }}><IconChevDown /></span>
                </div>
              </div>

              {/* checklist */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Checklist des tâches</div>
                  {realTasks.length > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: "#74726A" }}>{realTasks.filter(t => t.done).length}/{realTasks.length} terminées</div>}
                </div>
                {taskError && (
                  <div style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45, marginBottom: 10 }}>{taskError}</div>
                )}
                {realTasks.length > 0 && (
                  <div style={{ height: 7, borderRadius: 99, background: "#E9E7DE", overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${Math.round(100 * realTasks.filter(t => t.done).length / realTasks.length)}%`, background: realTasks.every(t => t.done) ? "#1F8A5B" : "#C9A24E", transition: "width .25s ease" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {tasksLoading ? (
                    <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Chargement…</div>
                  ) : realTasks.length === 0 ? (
                    !taskError && <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Aucune tâche · utilisez le champ ci-dessous pour en ajouter</div>
                  ) : realTasks.map(task => {
                    const charge = chargeInfo(task.totalMinutes, task.estimatedMinutes);
                    return (
                    <div key={task.id} style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", border: "1px solid #ECEBE4", borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px" }}>
                        <span title={`Priorité ${task.priority}`} style={{ width: 7, height: 7, borderRadius: "50%", background: TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.Normale, flex: "none" }} />
                        <span onClick={() => toggleTaskDone(task.id)} style={{ width: 19, height: 19, borderRadius: 6, border: `2px solid ${task.done ? "#1F9D57" : "#D6D4CB"}`, background: task.done ? "#1F9D57" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer" }}>
                          {task.done && <IconCheck size={12} />}
                        </span>
                        <span onClick={() => toggleTaskDone(task.id)} style={{ flex: 1, fontSize: 15, fontWeight: 500, color: task.done ? "#9A998F" : "#1C1B16", textDecoration: task.done ? "line-through" : "none", cursor: "pointer", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.label}
                        </span>
                        <span
                          onClick={() => setTimeModalTask(task)}
                          title="Saisir du temps"
                          style={{ fontSize: 13, fontWeight: 700, color: charge.color, background: charge.bg, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", cursor: "pointer", flex: "none" }}
                        >
                          {charge.label}
                        </span>
                        <span
                          onClick={() => openEditTask(task)}
                          title="Durée estimée"
                          style={{ fontSize: 13, fontWeight: 600, color: "#C0BEB3", cursor: "pointer", flex: "none", whiteSpace: "nowrap" }}
                        >
                          <IconClock />
                        </span>
                        <div style={{ position: "relative", flex: "none", display: "flex", alignItems: "center" }}>
                          {task.collaborators.length > 0 && (
                            <span style={{ display: "flex", alignItems: "center", marginRight: -6 }}>
                              {task.collaborators.slice(0, 2).map((c, i) => (
                                <span key={c.id} title={c.nom} style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078", border: "2px solid #fff", marginLeft: i === 0 ? 0 : -8 }}>{getInitials(c.nom)}</span>
                              ))}
                              {task.collaborators.length > 2 && <span style={{ fontSize: 11, fontWeight: 700, color: "#A09E92", marginLeft: 3 }}>+{task.collaborators.length - 2}</span>}
                            </span>
                          )}
                          <span
                            onClick={() => setAssigneeDropdownFor(assigneeDropdownFor === task.id ? null : task.id)}
                            title={task.assigneeNom ?? "Non assignée"}
                            style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: task.assigneeNom ? task.assigneeColor : "#ECEBE4", cursor: "pointer", flex: "none", marginLeft: task.collaborators.length > 0 ? 4 : 0 }}
                          >
                            {task.assigneeNom ? getInitials(task.assigneeNom) : ""}
                          </span>
                          {assigneeDropdownFor === task.id && (
                            <>
                              <div onClick={() => setAssigneeDropdownFor(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 190, maxHeight: 320, overflowY: "auto" }}>
                                <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, padding: "6px 9px 4px" }}>Assigné principal</div>
                                <div onClick={() => setTaskAssignee(task.id, null)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, cursor: "pointer", fontSize: 14.5, color: "#8C8B83" }}>— Non assignée</div>
                                {collaborateurs.map(c => (
                                  <div key={c.id} onClick={() => setTaskAssignee(task.id, c.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, cursor: "pointer", background: task.assignedTo === c.id ? "#F6EFDD" : "transparent" }}>
                                    <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#33322C" }}>{c.nom}</span>
                                  </div>
                                ))}
                                <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, padding: "9px 9px 4px", borderTop: "1px solid #F0EFEA", marginTop: 4 }}>Collaborateurs additionnels</div>
                                {collaborateurs.filter(c => c.id !== task.assignedTo).map(c => {
                                  const checked = task.collaborators.some(tc => tc.id === c.id);
                                  return (
                                    <div key={c.id} onClick={() => toggleTaskCollaborator(task.id, c.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, cursor: "pointer", background: checked ? "#F6EFDD" : "transparent" }}>
                                      <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${checked ? "#C9A24E" : "#CFCDC2"}`, background: checked ? "#C9A24E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                                        {checked && <IconCheck size={9} />}
                                      </span>
                                      <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                                      <span style={{ fontSize: 14.5, fontWeight: 600, color: "#33322C" }}>{c.nom}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                        <span onClick={() => deleteDetailTask(task.id)} style={{ color: "#B5B2A6", cursor: "pointer", fontSize: 16, lineHeight: 1, flex: "none" }}>×</span>
                      </div>
                      {editTaskFor === task.id && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "9px 13px 11px", borderTop: "1px solid #F2F1EB", background: "#FBFBF9" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <select value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ flex: "1 1 110px", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }}>
                              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select value={editType} onChange={e => setEditType(e.target.value)} style={{ flex: "1 1 130px", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: editType ? "#1C1B16" : "#A6A498", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }}>
                              <option value="">Type…</option>
                              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 110px" }}>
                              <label style={{ ...typography.help, display: "block", marginBottom: 3 }}>Début</label>
                              <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }} />
                            </div>
                            <div style={{ flex: "1 1 110px" }}>
                              <label style={{ ...typography.help, display: "block", marginBottom: 3 }}>Fin</label>
                              <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
                            <div>
                              <label style={{ ...typography.help, display: "block", marginBottom: 3 }}>Durée estimée</label>
                              <div style={{ display: "flex", gap: 6 }}>
                                <input type="number" min={0} value={editHours} onChange={e => setEditHours(e.target.value)} placeholder="h" style={{ width: 56, boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }} />
                                <input type="number" min={0} max={59} value={editMinutes} onChange={e => setEditMinutes(e.target.value)} placeholder="min" style={{ width: 56, boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 8, padding: "7px 9px", outline: "none" }} />
                              </div>
                            </div>
                            <Button variant="primary" size="sm" onClick={() => saveTaskEdit(task.id)}>Enregistrer</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 9 }}>
                  <input value={taskDraft} onChange={e => setTaskDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addDetailTask(); }} placeholder="Ajouter une tâche…" style={{ flex: 1, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none" }} />
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <span onClick={() => setNewTaskAssignee("")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, cursor: "pointer", background: !newTaskAssignee ? "#F0EFEA" : "#fff", border: `1.5px solid ${!newTaskAssignee ? "#C9A24E" : "#ECEBE4"}`, fontSize: 13.5, fontWeight: 600, color: "#5C5A52" }}>— Non assignée</span>
                    {collaborateurs.map(c => {
                      const on = newTaskAssignee === c.id;
                      return (
                        <span key={c.id} onClick={() => setNewTaskAssignee(c.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 3px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ flex: 1, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }}>
                      {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)} style={{ flex: 1, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: newTaskType ? "#1C1B16" : "#A6A498", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }}>
                      <option value="">Type…</option>
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} title="Début" style={{ flex: 1, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }} />
                    <input type="date" value={newTaskEnd} onChange={e => setNewTaskEnd(e.target.value)} title="Fin" style={{ flex: 1, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" min={0} value={newTaskHours} onChange={e => setNewTaskHours(e.target.value)} placeholder="h estimées" style={{ width: 82, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }} />
                    <input type="number" min={0} max={59} value={newTaskMinutes} onChange={e => setNewTaskMinutes(e.target.value)} placeholder="min" style={{ width: 64, boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 10px", outline: "none" }} />
                    <button className="btn" onClick={addDetailTask} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 14.5, fontWeight: 600, padding: "0 14px", borderRadius: 9, fontFamily: "inherit", whiteSpace: "nowrap" }}><span style={{ fontSize: 15, lineHeight: 1 }}>+</span>Ajouter</button>
                  </div>
                </div>
              </div>

              {/* BAT / documents */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>
                  {dp.col === "bat" ? "Validation BAT client" : "Documents"}
                </div>

                {dp.col === "bat" ? (
                  <div style={{ border: "1px solid #D1C2F0", background: "#F7F5FD", borderRadius: 14, padding: "15px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {batLoading ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7C3AED", fontSize: 15 }}><IconSpinner />Chargement du statut…</div>
                    ) : batStatus ? (
                      <>
                        {/* Statut de validation */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 38, height: 38, borderRadius: 9, background: batStatus.status === "approved" ? "#E7F3EB" : batStatus.status === "rejected" ? "#FBEAE0" : "#EDE9FB", display: "flex", alignItems: "center", justifyContent: "center", color: batStatus.status === "approved" ? "#1F8A5B" : batStatus.status === "rejected" ? "#C2410C" : "#7C3AED", flex: "none", fontSize: 16 }}>
                            {batStatus.status === "approved" ? "✓" : batStatus.status === "rejected" ? "✗" : <IconClock />}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: batStatus.status === "approved" ? "#1F8A5B" : batStatus.status === "rejected" ? "#C2410C" : "#5B21B6" }}>
                              {batStatus.status === "approved" ? "BAT accepté par le client" : batStatus.status === "rejected" ? "BAT refusé – révisions demandées" : "En attente de validation client"}
                            </div>
                            <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>
                              Envoyé à {batStatus.client_email}
                              {batStatus.responded_at && ` · répondu le ${new Date(batStatus.responded_at).toLocaleDateString("fr-FR")}`}
                            </div>
                          </div>
                          <a href={batStatus.bat_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap" }}><IconExternal />Voir BAT</a>
                        </div>
                        {batStatus.client_comment && (
                          <div style={{ background: "#fff", border: "1px solid #E5E0F8", borderRadius: 10, padding: "10px 13px", fontSize: 14.5, color: "#33322C", lineHeight: 1.45 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: ".06em" }}>Commentaire client · </span>{batStatus.client_comment}
                          </div>
                        )}
                        {/* Nouveau BAT */}
                        <div style={{ paddingTop: 10, borderTop: "1px solid #E5E0F8", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#7C3AED" }}>Envoyer une nouvelle version</div>
                          {batEmailError && (
                            <div style={{ background: "#FBEAE0", border: "1px solid #F0C5B0", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#C2410C", lineHeight: 1.45 }}>
                              <strong>Email non envoyé :</strong> {batEmailError}
                            </div>
                          )}
                          <div>
                            <label style={{ ...typography.label, fontWeight: 700, color: "#5B21B6", display: "block", marginBottom: 5 }}>Fichier BAT *</label>
                            <input type="file" accept=".pdf,image/*" onChange={e => setBatFile(e.target.files?.[0] ?? null)} style={{ fontSize: 14, color: "#33322C", width: "100%" }} />
                          </div>
                          <div>
                            <label style={{ ...typography.label, fontWeight: 700, color: "#5B21B6", display: "block", marginBottom: 5 }}>Email du client</label>
                            <input
                              type="email"
                              value={batClientEmail}
                              onChange={e => setBatClientEmail(e.target.value)}
                              placeholder="client@exemple.fr"
                              style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #D1C2F0", borderRadius: 8, padding: "8px 10px", outline: "none" }}
                            />
                          </div>
                          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 14.5, color: "#33322C" }}>
                            <input type="checkbox" checked={batSendEmail} onChange={e => setBatSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#7C3AED" }} />
                            Envoyer l&apos;email de validation au client
                          </label>
                          <button
                            className="btn"
                            onClick={uploadBat}
                            disabled={!batFile || batUploading}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: batFile ? "#7C3AED" : "#C4BAED", color: "#fff", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, border: "none", fontFamily: "inherit" }}
                          >
                            {batUploading ? <><IconSpinner />Envoi…</> : <><IconUpload size={17} />Envoyer la nouvelle version</>}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Upload initial */}
                        {batSent ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#E7F3EB", borderRadius: 10, padding: "10px 13px" }}>
                            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1F9D57", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><IconCheck size={13} /></span>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1F8A5B" }}>BAT uploadé · email de validation envoyé !</div>
                          </div>
                        ) : (
                          <>
                            {batEmailError && (
                              <div style={{ background: "#FBEAE0", border: "1px solid #F0C5B0", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#C2410C", lineHeight: 1.45 }}>
                                <strong>BAT uploadé, mais email non envoyé :</strong> {batEmailError}
                              </div>
                            )}
                            <div>
                              <label style={{ ...typography.label, fontWeight: 700, color: "#5B21B6", display: "block", marginBottom: 6 }}>Fichier BAT (PDF ou image) *</label>
                              <input type="file" accept=".pdf,image/*" onChange={e => setBatFile(e.target.files?.[0] ?? null)} style={{ fontSize: 14, color: "#33322C", width: "100%" }} />
                            </div>
                            <div>
                              <label style={{ ...typography.label, fontWeight: 700, color: "#5B21B6", display: "block", marginBottom: 6 }}>Email du client</label>
                              <input
                                type="email"
                                value={batClientEmail}
                                onChange={e => setBatClientEmail(e.target.value)}
                                placeholder="client@exemple.fr"
                                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, color: "#1C1B16", background: "#fff", border: "1px solid #D1C2F0", borderRadius: 8, padding: "8px 10px", outline: "none" }}
                              />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 14.5, color: "#33322C" }}>
                              <input type="checkbox" checked={batSendEmail} onChange={e => setBatSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#7C3AED" }} />
                              Envoyer l&apos;email de validation au client
                            </label>
                            <button
                              onClick={uploadBat}
                              disabled={!batFile || batUploading}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: batFile ? "#7C3AED" : "#C4BAED", color: "#fff", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, cursor: batFile ? "pointer" : "default", border: "none", fontFamily: "inherit" }}
                            >
                              {batUploading ? <><IconSpinner />Envoi…</> : <><IconUpload size={17} />Envoyer le BAT</>}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : dp.batUploaded ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B0892B", flex: "none" }}><IconDoc /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{dp.name.replace(/[^A-Za-zÀ-ÿ0-9]+/g, "_").slice(0, 22)}_BAT.pdf</div>
                      <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>BAT uploadé</div>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "#B0892B", cursor: "pointer" }}><IconDownload size={15} />Télécharger</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, border: "1.5px dashed #D2D0C7", borderRadius: 12, padding: 18, color: "#9A998F" }}>
                    <IconDoc />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Aucun document</span>
                  </div>
                )}
              </div>

              {/* origine */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Origine du projet</div>
                {dp.origin === "axonaut" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #CDE9D7", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "#E7F3EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F8A5B", flex: "none" }}><IconAxonaut /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>Devis signé sur Axonaut</div>
                      <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>{dp.quoteRef ? `Réf. ${dp.quoteRef} · ` : ""}synchronisé automatiquement</div>
                    </div>
                    {dp.quotationId && (
                      <span onClick={() => openPdf(dp.quotationId!)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "#1F8A5B", cursor: "pointer" }}><IconExternal />Voir</span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F7F6F2", border: "1px solid #E5E4DD", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "#EEEDE6", display: "flex", alignItems: "center", justifyContent: "center", color: "#74726A", flex: "none" }}><IconEdit /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#33322C" }}>Projet créé manuellement</div>
                      <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>Hors devis Axonaut · ajouté par un chargé de projet</div>
                    </div>
                  </div>
                )}
              </div>

              {/* facturation */}
              {dp.col === "facturer" && (
                <div>
                  <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Facturation</div>
                  <div style={{ border: "1px solid #E6A972", background: "#FBF3EC", borderRadius: 14, padding: "15px 16px" }}>
                    {!dp.invoiceNotified ? (
                      <>
                        <p style={{ fontSize: 14, color: "#8A6A42", lineHeight: 1.45, margin: "0 0 12px" }}>Une fois le type de facture choisi sur la tâche, marquez le projet comme terminé : la comptabilité le retrouvera dans la page Facturation.</p>
                        <button className="btn" onClick={() => notifyInvoice(dp.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", background: "#C2410C", color: "#fff", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, border: "none", fontFamily: "inherit" }}>
                          <IconCheck />Marquer terminé
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#E7F3EB", borderRadius: 10, padding: "10px 13px" }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1F9D57", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><IconCheck size={13} /></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1F8A5B" }}>Projet marqué terminé</div>
                          <div style={{ fontSize: 13, color: "#5C8B6E", marginTop: 1 }}>Visible dans la page Facturation</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>) : (<>
              {/* bandeau lecture seule */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F0EFEA", border: "1px solid #E6E5DE", borderRadius: 10, padding: "9px 13px", fontSize: 13.5, fontWeight: 600, color: "#7C7B73" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#A6A498", flex: "none" }} />
                Lecture seule — seul un administrateur peut modifier ce projet.
              </div>

              {/* statut */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Statut</div>
                {(() => { const st = statusInfo(dp.col); return (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 99, padding: "6px 12px", width: "fit-content" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot }} />{st.label}
                  </span>
                ); })()}
              </div>

              {/* dates */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Calendrier du projet</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 }}>
                    <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 6 }}>Début</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16" }}>{dp.start || "—"}</div>
                  </div>
                  <div style={{
                    background: dp.dueState === "over" ? "#FBEAE0" : dp.dueState === "soon" ? "#FBF1E8" : "#fff",
                    border: `1px solid ${dp.dueState === "over" ? "#F0C5B0" : dp.dueState === "soon" ? "#F0D9C5" : "#ECEBE4"}`,
                    borderRadius: 12, padding: 13,
                  }}>
                    <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: (dp.dueState === "over" || dp.dueState === "soon") ? "#C2410C" : "#A6A498", fontWeight: 700, marginBottom: 6 }}>Date butoir</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: dueStyle(dp.dueState).color }}>{dp.due || "—"}</div>
                  </div>
                </div>
              </div>

              {/* type de projet */}
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Type de projet</div>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: dp.projectType ? "#1C1B16" : "#A6A498" }}>
                  {PROJECT_TYPES.find(pt => pt.value === dp.projectType)?.label ?? "Non renseigné"}
                </div>
              </div>

              {/* checklist des tâches (lecture seule) */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Mes tâches sur ce projet</div>
                  {realTasks.length > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: "#74726A" }}>{realTasks.filter(t => t.done).length}/{realTasks.length} terminées</div>}
                </div>
                {realTasks.length > 0 && (
                  <div style={{ height: 7, borderRadius: 99, background: "#E9E7DE", overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${Math.round(100 * realTasks.filter(t => t.done).length / realTasks.length)}%`, background: realTasks.every(t => t.done) ? "#1F8A5B" : "#C9A24E" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {tasksLoading ? (
                    <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Chargement…</div>
                  ) : realTasks.length === 0 ? (
                    <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Aucune tâche</div>
                  ) : realTasks.map(task => {
                    const charge = chargeInfo(task.totalMinutes, task.estimatedMinutes);
                    return (
                      <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", background: "#fff", border: "1px solid #ECEBE4", borderRadius: 10 }}>
                        <span title={`Priorité ${task.priority}`} style={{ width: 7, height: 7, borderRadius: "50%", background: TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.Normale, flex: "none" }} />
                        <span style={{ width: 19, height: 19, borderRadius: 6, border: `2px solid ${task.done ? "#1F9D57" : "#D6D4CB"}`, background: task.done ? "#1F9D57" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                          {task.done && <IconCheck size={12} />}
                        </span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: task.done ? "#9A998F" : "#1C1B16", textDecoration: task.done ? "line-through" : "none", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: charge.color, background: charge.bg, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flex: "none" }}>{charge.label}</span>
                        <span title={task.assigneeNom ?? "Non assignée"} style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: task.assigneeNom ? task.assigneeColor : "#ECEBE4", flex: "none" }}>
                          {task.assigneeNom ? getInitials(task.assigneeNom) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* origine */}
              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Origine du projet</div>
                {dp.origin === "axonaut" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #CDE9D7", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "#E7F3EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F8A5B", flex: "none" }}><IconAxonaut /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>Devis signé sur Axonaut</div>
                      <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>{dp.quoteRef ? `Réf. ${dp.quoteRef} · ` : ""}synchronisé automatiquement</div>
                    </div>
                    {dp.quotationId && (
                      <span onClick={() => openPdf(dp.quotationId!)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "#1F8A5B", cursor: "pointer" }}><IconExternal />Voir</span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F7F6F2", border: "1px solid #E5E4DD", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "#EEEDE6", display: "flex", alignItems: "center", justifyContent: "center", color: "#74726A", flex: "none" }}><IconEdit /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#33322C" }}>Projet créé manuellement</div>
                      <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 1 }}>Hors devis Axonaut</div>
                    </div>
                  </div>
                )}
              </div>
            </>)}
            </div>

            {/* footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
              {deleteProjectConfirm ? (
                <>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#C2410C" }}>Supprimer définitivement ce projet ?</span>
                  <Button variant="tertiary" onClick={() => setDeleteProjectConfirm(false)} disabled={deletingProject}>Annuler</Button>
                  <Button variant="danger" onClick={deleteProject} disabled={deletingProject}>
                    {deletingProject ? "Suppression…" : "Oui, supprimer"}
                  </Button>
                </>
              ) : (
                <>
                  {effectiveRole === "admin" && (
                    <Button variant="danger-outline" onClick={() => setDeleteProjectConfirm(true)}>
                      Supprimer
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="secondary" style={{ flex: 1 }}>
                      <IconEdit />Modifier
                    </Button>
                  )}
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => setDetailId(null)}>
                    Fermer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NOUVEAU PROJET ── */}
      {newOpen && (
        <div onClick={() => setNewOpen(false)} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 600, maxWidth: "100%", maxHeight: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconFolder strokeWidth={1.6} /></span>
                <div>
                  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>Nouveau projet</span>
                  <span style={{ display: "block", fontSize: 13, color: "#9A9078", marginTop: 1 }}>Projet manuel · hors devis Axonaut</span>
                </div>
              </div>
              <span onClick={() => setNewOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <FieldLabel>Nom du projet</FieldLabel>
                <input value={nf.name} onChange={e => nfSet({ name: e.target.value })} placeholder="Ex. Refonte site e-commerce" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Client</FieldLabel>
                <input value={nf.client} onChange={e => nfSet({ client: e.target.value })} placeholder="Nom du client" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Collaborateur assigné</FieldLabel>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <span onClick={() => nfSet({ assignee: "" })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, cursor: "pointer", background: !nf.assignee ? "#FBF8EF" : "#fff", border: `1.5px solid ${!nf.assignee ? "#C9A24E" : "#ECEBE4"}`, fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>—</span>
                  {collaborateurs.map(c => {
                    const on = nf.assignee === c.id;
                    return (
                      <span key={c.id} onClick={() => nfSet({ assignee: c.id })} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: c.color || "#9A9078" }}>{getInitials(c.nom)}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "Date de début", field: "start", placeholder: "AAAA-MM-JJ" },
                  { label: "Date butoir",   field: "due",   placeholder: "AAAA-MM-JJ" },
                ].map(f => (
                  <div key={f.field} style={{ flex: 1 }}>
                    <FieldLabel>{f.label}</FieldLabel>
                    <input value={(nf as unknown as Record<string, string>)[f.field]} onChange={e => nfSet({ [f.field]: e.target.value })} placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <FieldLabel>Checklist des tâches</FieldLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {nf.tasks.map((task, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F6F2", border: "1px solid #ECEBE4", borderRadius: 9, padding: "8px 11px" }}>
                      <span style={{ width: 16, height: 16, borderRadius: 5, border: "2px solid #D6D4CB", flex: "none" }} />
                      <span style={{ flex: 1, fontSize: 15, color: "#33322C" }}>{task.label}</span>
                      <span onClick={() => nfRemoveTask(i)} style={{ color: "#B5B2A6", cursor: "pointer", fontSize: 16, lineHeight: 1, flex: "none" }}>×</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={nf.taskText} onChange={e => nfSet({ taskText: e.target.value })} onKeyDown={e => { if (e.key === "Enter") nfAddTask(); }} placeholder="Nom de la tâche…" style={{ ...inputStyle, flex: 1 }} />
                  <button className="btn" onClick={nfAddTask} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 14.5, fontWeight: 600, padding: "0 14px", borderRadius: 9, fontFamily: "inherit", whiteSpace: "nowrap" }}><span style={{ fontSize: 15, lineHeight: 1 }}>+</span>Ajouter</button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#8C8B83" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B5B2A6" }} />
                Arrive dans « Brief » avec le badge Manuel
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="secondary" onClick={() => setNewOpen(false)}>Annuler</Button>
                <Button variant="primary" onClick={saveNew}>
                  {newSaved ? "Projet créé ✓" : "Créer le projet"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE PDF DEVIS ── */}
      {pdf && (
        <div
          onClick={closePdf}
          className="modal-overlay-in"
          style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.7)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="modal-panel-in"
            style={{ width: "min(960px, 100%)", height: "min(90vh, 860px)", background: "#1A1812", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 40px 80px -20px rgba(0,0,0,.8)" }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", flex: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A24E" }}><IconDoc /></span>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: "#F4ECD7" }}>Devis Axonaut · réf. {pdf.quotationId}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pdf.status === "ready" && pdf.blobUrl && (
                  <a
                    href={pdf.blobUrl}
                    download={`devis-${pdf.quotationId}.pdf`}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 600, color: "#C9A24E", background: "rgba(201,162,78,.12)", border: "1px solid rgba(201,162,78,.25)", borderRadius: 8, padding: "7px 12px", textDecoration: "none" }}
                  >
                    <IconDownload size={15} />Télécharger
                  </a>
                )}
                <span onClick={closePdf} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
              </div>
            </div>

            {/* contenu */}
            {pdf.status === "loading" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#8E8876" }}>
                <IconSpinner />
                <span style={{ fontSize: 15, fontWeight: 600 }}>Chargement du devis…</span>
              </div>
            )}
            {pdf.status === "error" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32, textAlign: "center" }}>
                <span style={{ fontSize: 32 }}>📄</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F4ECD7" }}>PDF non disponible</div>
                <div style={{ fontSize: 15, color: "#8E8876", maxWidth: 340, lineHeight: 1.5 }}>
                  {pdf.error?.includes("404")
                    ? "Le PDF de ce devis n'est pas accessible via l'API Axonaut. Il est peut-être en statut brouillon ou le lien est expiré."
                    : `Erreur : ${pdf.error}`}
                </div>
                <button
                  className="btn"
                  onClick={() => openPdf(pdf.quotationId)}
                  style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 600, color: "#C9A24E", background: "rgba(201,162,78,.12)", border: "1px solid rgba(201,162,78,.25)", borderRadius: 8, padding: "8px 14px", fontFamily: "inherit" }}
                >
                  Réessayer
                </button>
              </div>
            )}
            {pdf.status === "ready" && pdf.blobUrl && (
              <iframe
                src={pdf.blobUrl}
                style={{ flex: 1, border: "none", background: "#fff" }}
                title={`Devis ${pdf.quotationId}`}
              />
            )}
          </div>
        </div>
      )}

      {/* ── PANNEAU TEMPS SUR TÂCHE ── */}
      {timeModalTask && detailId && (
        <TaskTimeModal
          taskId={timeModalTask.id}
          taskLabel={timeModalTask.label}
          projectId={detailId}
          projectName={dp?.name ?? ""}
          initialTotalMinutes={timeModalTask.totalMinutes}
          estimatedMinutes={timeModalTask.estimatedMinutes}
          currentStage={timeModalTask.stage}
          canDelete={effectiveRole === "admin"}
          onDeleted={() => {
            const taskId = timeModalTask.id;
            setRealTasks(prev => prev.filter(t => t.id !== taskId));
            setTimeModalTask(null);
          }}
          onClose={() => setTimeModalTask(null)}
          onSaved={(newTotalSeconds, newStage) => {
            const taskId = timeModalTask.id;
            const newTotalMinutes = Math.ceil(newTotalSeconds / 60);
            setRealTasks(prev => prev.map(t => t.id === taskId ? { ...t, totalMinutes: newTotalMinutes, stage: newStage } : t));
          }}
        />
      )}
    </div>
  );
}

/* ─── Carte kanban ─── */
function KanbanCard({ p, accent, collabsMap, originLabel, originColor, originBg, showHourglass, showDoc, showEnvelope, due, isDragging, draggable, onOpen, onDragStart, onDragEnd, onNotify }: {
  p: Project; accent: string; collabsMap: Record<string, Collab>;
  originLabel: string; originColor: string; originBg: string;
  showHourglass: boolean; showDoc: boolean; showEnvelope: boolean;
  due: { color: string; fontWeight: number }; isDragging: boolean; draggable: boolean;
  onOpen: () => void; onDragStart: () => void; onDragEnd: () => void;
  onNotify: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const collab = collabsMap[p.assignee ?? ""];

  return (
    <div
      draggable={draggable}
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff", border: `1px solid ${hovered ? "#C9A24E" : "#ECEBE4"}`, borderLeft: `3px solid ${accent}`,
        borderRadius: 12, padding: 13, boxShadow: hovered ? "0 12px 26px -12px rgba(201,162,78,.5)" : "0 1px 2px rgba(20,20,15,.05)",
        cursor: draggable ? "grab" : "pointer", opacity: isDragging ? 0.4 : 1, transform: hovered ? "translateY(-3px)" : "none",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: originColor, background: originBg, borderRadius: 99, padding: "2px 9px", whiteSpace: "nowrap" }}>
          {p.origin === "axonaut" ? <IconOriginAxonaut /> : <IconOriginManual />}{originLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flex: "none" }}>
          {showHourglass && <span title="En attente d'un élément" style={{ width: 21, height: 21, borderRadius: 6, background: "rgba(208,138,74,.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C2410C" }}><IconHourglass /></span>}
          {showDoc && <span title="BAT uploadé" style={{ width: 21, height: 21, borderRadius: 6, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B0892B" }}><IconDoc /></span>}
          {showEnvelope && <span title="Projet marqué terminé" style={{ width: 21, height: 21, borderRadius: 6, background: "rgba(31,138,91,.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F8A5B" }}><IconCheck size={12} stroke="#1F8A5B" /></span>}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16", lineHeight: 1.3 }}>{p.name}</div>
      <div style={{ fontSize: 14, color: "#A6A498", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.client}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: "1px solid #F2F1EB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {collab ? (
            <span title={collab.nom} style={{ width: 25, height: 25, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: collab.color || "#9A9078", flex: "none" }}>{getInitials(collab.nom)}</span>
          ) : (
            <span style={{ width: 25, height: 25, borderRadius: "50%", background: "#ECEBE4", flex: "none" }} />
          )}
          {p.tasks.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 700, color: "#74726A", background: "#F2F1EB", borderRadius: 6, padding: "2px 8px" }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>
              {progressStr(p)}
            </span>
          )}
          {p.totalMinutes > 0 && (
            <span title="Temps passé" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 700, color: "#8C6D2F", background: "#F6EFDD", borderRadius: 6, padding: "2px 8px" }}>
              <IconClock />{formatMinutes(p.totalMinutes)}
            </span>
          )}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: due.fontWeight, color: due.color }}>
          <IconClock />{p.due}
        </span>
      </div>
      {p.col === "facturer" && (
        !p.invoiceNotified ? (
          <button className="btn" onClick={onNotify} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 11, background: "#C2410C", color: "#fff", fontSize: 13.5, fontWeight: 700, padding: 8, borderRadius: 9, border: "none", fontFamily: "inherit" }}>
            <IconCheck />Marquer terminé
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 11, background: "#E7F3EB", color: "#1F8A5B", fontSize: 13, fontWeight: 700, padding: 8, borderRadius: 9 }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>
            Projet marqué terminé
          </div>
        )
      )}
    </div>
  );
}

/* ─── Helpers ─── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{children}</label>;
}
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16",
  background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none",
};
