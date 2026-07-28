"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { ABSENCE_TYPE_LABEL, REQUEST_STATUSES, REQUEST_STATUS_LABEL, REQUEST_STATUS_COLOR } from "@/lib/absence-taxonomy";
import AbsenceFormModal from "@/components/AbsenceFormModal";
import OvertimeFormModal from "@/components/OvertimeFormModal";
import AbsenceDetailModal from "@/components/AbsenceDetailModal";
import OvertimeDetailModal from "@/components/OvertimeDetailModal";
import { useToast } from "@/lib/toast-context";
import { IconSearch } from "@/components/ui/icons";

type Collab = { id: string; nom: string; color: string | null } | null;

type AbsenceRow = {
  id: string; type: string; startDate: string; endDate: string; days: number; status: string;
  createdAt: string; processedAt: string | null; collaborateur: Collab; processedByNom: string | null;
};

type OvertimeRow = {
  id: string; date: string; hours: number; status: string; createdAt: string; processedAt: string | null;
  collaborateur: Collab; processedByNom: string | null; projectName: string; projectClient: string;
};

type ProjectOption = { id: string; name: string; clientName: string };

const ABS_GRID = "1.6fr 1.4fr 1.1fr 1.1fr .8fr 1fr";
const OT_GRID = "1.5fr 1.6fr 1.3fr .8fr 1fr";

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const c = REQUEST_STATUS_COLOR[status] ?? REQUEST_STATUS_COLOR.attente;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: c.color, background: c.bg, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {REQUEST_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function AbsencesPage() {
  const { effectiveRole } = useAuth();
  const toast = useToast();
  const canManage = can(effectiveRole, "manage_absences");
  const canEditValidated = canManage;

  const [tab, setTab] = useState<"absences" | "overtime">("absences");
  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [overtimeModalOpen, setOvertimeModalOpen] = useState(false);
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null);
  const [selectedOvertimeId, setSelectedOvertimeId] = useState<string | null>(null);
  const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      fetch("/api/absences").then(r => r.json()).then((d: { absences?: AbsenceRow[] }) => setAbsences(d.absences ?? [])),
      fetch("/api/overtime").then(r => r.json()).then((d: { overtimes?: OvertimeRow[] }) => setOvertimes(d.overtimes ?? [])),
    ]).catch(() => null).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/projets?page_size=50")
      .then(r => r.json())
      .then((d: { data?: { id: string; name: string; client_name: string }[] }) => {
        if (Array.isArray(d.data)) setProjects(d.data.map(p => ({ id: p.id, name: p.name, clientName: p.client_name })));
      })
      .catch(() => null);
  }, []);

  const createAbsence = async (data: { type: string; startDate: string; endDate: string; days: number }) => {
    const res = await fetch("/api/absences", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: data.type, start_date: data.startDate, end_date: data.endDate, days: data.days }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'envoi");
    }
    toast.success("Demande d'absence envoyée.");
    load();
  };

  const createOvertime = async (data: { projectId: string; date: string; hours: number }) => {
    const res = await fetch("/api/overtime", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: data.projectId, date: data.date, hours: data.hours }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de l'envoi");
    }
    toast.success("Déclaration d'heures sup. envoyée.");
    load();
  };

  const setAbsenceStatus = async (id: string, status: "validee" | "refusee") => {
    const previous = absences;
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    try {
      const res = await fetch(`/api/absences/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      toast.success(status === "validee" ? "Absence validée." : "Absence refusée.");
    } catch {
      setAbsences(previous);
      toast.error("Échec de la mise à jour.");
    }
  };

  const updateAbsence = async (id: string, data: { type: string; startDate: string; endDate: string; days: number }) => {
    const res = await fetch(`/api/absences/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: data.type, start_date: data.startDate, end_date: data.endDate, days: data.days }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de la modification");
    }
    toast.success("Absence modifiée.");
    load();
  };

  const deleteAbsence = async (id: string) => {
    const res = await fetch(`/api/absences/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Échec de la suppression");
    }
    setAbsences(prev => prev.filter(a => a.id !== id));
    toast.success("Absence supprimée.");
  };

  const setOvertimeStatus = async (id: string, status: "validee" | "refusee") => {
    const previous = overtimes;
    setOvertimes(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    try {
      const res = await fetch(`/api/overtime/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      toast.success(status === "validee" ? "Heures sup. validées." : "Heures sup. refusées.");
    } catch {
      setOvertimes(previous);
      toast.error("Échec de la mise à jour.");
    }
  };

  const filteredAbsences = absences.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (search.trim() && !(a.collaborateur?.nom ?? "").toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const selectedAbsence = absences.find(a => a.id === selectedAbsenceId) ?? null;
  const selectedOvertime = overtimes.find(o => o.id === selectedOvertimeId) ?? null;
  const editingAbsence = absences.find(a => a.id === editingAbsenceId) ?? null;

  const kpi = {
    pending: absences.filter(a => a.status === "attente").length + overtimes.filter(o => o.status === "attente").length,
    thisWeek: absences.filter(a => a.status === "validee").length,
    overtimeHours: overtimes.reduce((s, o) => s + Number(o.hours), 0).toFixed(1).replace(/\.0$/, ""),
    daysTaken: absences.filter(a => a.status === "validee").reduce((s, a) => s + Number(a.days), 0),
  };

  return (
    <div className="animate-fadeIn">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Absences</h1>
          <div style={{ fontSize: 15.5, color: "#8C8B83", marginTop: 5 }}>
            Congés, arrêts et heures supplémentaires de l&apos;équipe
            {" · "}{canManage ? "toutes les demandes de l'équipe" : "uniquement vos propres demandes"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setAbsenceModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15.5, fontWeight: 600, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Ajouter une absence
          </button>
          <button onClick={() => setOvertimeModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15.5, fontWeight: 600, padding: "10px 17px", borderRadius: 10, cursor: "pointer", border: "1px solid #0A0A0A", fontFamily: "inherit" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Déclarer des heures sup.
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 18 }}>
        <div style={{ background: "#0A0A0A", borderRadius: 16, padding: "18px 20px", color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -36, right: -26, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.28),transparent 70%)" }} />
          <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#B79B5E", fontWeight: 700, position: "relative" }}>En attente</span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 31, fontWeight: 800, lineHeight: 1, marginTop: 12, color: "#F4ECD7", position: "relative" }}>{kpi.pending}</div>
          <div style={{ fontSize: 14, color: "#8E8876", marginTop: 9, position: "relative" }}>demandes à valider</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#9A998F", fontWeight: 700 }}>Absences validées</span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 29, fontWeight: 800, lineHeight: 1, marginTop: 12, color: "#16150F" }}>{kpi.thisWeek}</div>
          <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 9 }}>collaborateurs</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#9A998F", fontWeight: 700 }}>Heures sup. déclarées</span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 29, fontWeight: 800, lineHeight: 1, marginTop: 12, color: "#16150F" }}>{kpi.overtimeHours}h</div>
          <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 9 }}>toutes équipes</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <span style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#9A998F", fontWeight: 700 }}>Jours de congés posés</span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 29, fontWeight: 800, lineHeight: 1, marginTop: 12, color: "#16150F" }}>{kpi.daysTaken}</div>
          <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 9 }}>cette année</div>
        </div>
      </div>

      <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 12, padding: 4, gap: 4, maxWidth: 460, marginBottom: 18 }}>
        {([{ id: "absences", label: "Absences" }, { id: "overtime", label: "Heures supplémentaires" }] as const).map(t => (
          <span
            key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, textAlign: "center", padding: "11px 14px", borderRadius: 9, fontSize: 15.5, fontWeight: 700, cursor: "pointer", color: tab === t.id ? "#F4ECD7" : "#8C8B83", background: tab === t.id ? "#0A0A0A" : "transparent", boxShadow: tab === t.id ? "0 4px 12px -4px rgba(0,0,0,.3)" : "none" }}
          >{t.label}</span>
        ))}
      </div>

      {tab === "absences" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", flex: 1, minWidth: 240, maxWidth: 340 }}>
              <IconSearch />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collaborateur…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1C1B16" }} />
            </div>
            <span onClick={() => setStatusFilter("")} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: statusFilter === "" ? "#fff" : "#7C7B73", background: statusFilter === "" ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${statusFilter === "" ? "#0A0A0A" : "#E5E4DD"}` }}>Tous</span>
            {REQUEST_STATUSES.map(s => (
              <span key={s.value} onClick={() => setStatusFilter(s.value)} style={{ padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: statusFilter === s.value ? "#fff" : "#7C7B73", background: statusFilter === s.value ? "#0A0A0A" : "#F0EFEA", border: `1px solid ${statusFilter === s.value ? "#0A0A0A" : "#E5E4DD"}` }}>{s.label}</span>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div className="responsive-table-wrapper">
              <div style={{ minWidth: 880 }}>
                <div style={{ display: "grid", gridTemplateColumns: ABS_GRID, gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Collaborateur</span>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Type</span>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Début</span>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Fin</span>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Jours</span>
                  <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Statut</span>
                </div>
                {loading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#9A998F" }}>Chargement…</div>
                ) : filteredAbsences.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#5C5A52" }}>Aucune demande d&apos;absence</div>
                    <div style={{ fontSize: 14.5, color: "#9A998F", marginTop: 4 }}>Vos demandes d&apos;absence apparaîtront ici.</div>
                  </div>
                ) : (
                  filteredAbsences.map(a => (
                    <div
                      key={a.id} onClick={() => setSelectedAbsenceId(a.id)}
                      onMouseEnter={() => setHoveredRow(a.id)} onMouseLeave={() => setHoveredRow(null)}
                      style={{ display: "grid", gridTemplateColumns: ABS_GRID, gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer", background: hoveredRow === a.id ? "#FBFAF6" : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: a.collaborateur?.color ?? "#8C846F", flex: "none" }}>{getInitials(a.collaborateur?.nom ?? "—")}</span>
                        <span style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.collaborateur?.nom ?? "—"}</span>
                      </div>
                      <span style={{ fontSize: 14.5, color: "#5C5A52" }}>{ABSENCE_TYPE_LABEL[a.type] ?? a.type}</span>
                      <span style={{ fontSize: 14.5, color: "#8C8B83" }}>{fmtDate(a.startDate)}</span>
                      <span style={{ fontSize: 14.5, color: "#8C8B83" }}>{fmtDate(a.endDate)}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#33322C", fontFamily: "Georgia, 'Times New Roman', serif" }}>{a.days}</span>
                      <div><StatusBadge status={a.status} /></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <div className="responsive-table-wrapper">
            <div style={{ minWidth: 820 }}>
              <div style={{ display: "grid", gridTemplateColumns: OT_GRID, gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
                <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Collaborateur</span>
                <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Projet</span>
                <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Date</span>
                <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Heures</span>
                <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Statut</span>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#9A998F" }}>Chargement…</div>
              ) : overtimes.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#5C5A52" }}>Aucune déclaration d&apos;heures sup.</div>
                  <div style={{ fontSize: 14.5, color: "#9A998F", marginTop: 4 }}>Vos déclarations apparaîtront ici.</div>
                </div>
              ) : (
                overtimes.map(o => (
                  <div
                    key={o.id} onClick={() => setSelectedOvertimeId(o.id)}
                    onMouseEnter={() => setHoveredRow(o.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ display: "grid", gridTemplateColumns: OT_GRID, gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer", background: hoveredRow === o.id ? "#FBFAF6" : "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: o.collaborateur?.color ?? "#8C846F", flex: "none" }}>{getInitials(o.collaborateur?.nom ?? "—")}</span>
                      <span style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.collaborateur?.nom ?? "—"}</span>
                    </div>
                    <span style={{ fontSize: 14.5, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.projectClient ? `${o.projectClient} · ` : ""}{o.projectName}</span>
                    <span style={{ fontSize: 14.5, color: "#8C8B83" }}>{fmtDate(o.date)}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#33322C", fontFamily: "Georgia, 'Times New Roman', serif" }}>{o.hours}h</span>
                    <div><StatusBadge status={o.status} /></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {absenceModalOpen && (
        <AbsenceFormModal onClose={() => setAbsenceModalOpen(false)} onConfirm={createAbsence} />
      )}
      {overtimeModalOpen && (
        <OvertimeFormModal projects={projects} onClose={() => setOvertimeModalOpen(false)} onConfirm={createOvertime} />
      )}
      {selectedAbsence && (
        <AbsenceDetailModal
          absence={selectedAbsence}
          canManage={canManage}
          canEditValidated={canEditValidated}
          onClose={() => setSelectedAbsenceId(null)}
          onValidate={async () => { await setAbsenceStatus(selectedAbsence.id, "validee"); setSelectedAbsenceId(null); }}
          onReject={async () => { await setAbsenceStatus(selectedAbsence.id, "refusee"); setSelectedAbsenceId(null); }}
          onEdit={() => { setEditingAbsenceId(selectedAbsence.id); setSelectedAbsenceId(null); }}
          onDelete={async () => { await deleteAbsence(selectedAbsence.id); setSelectedAbsenceId(null); }}
        />
      )}
      {editingAbsence && (
        <AbsenceFormModal
          initial={{ type: editingAbsence.type, startDate: editingAbsence.startDate, endDate: editingAbsence.endDate, days: editingAbsence.days }}
          onClose={() => setEditingAbsenceId(null)}
          onConfirm={async data => { await updateAbsence(editingAbsence.id, data); setEditingAbsenceId(null); }}
        />
      )}
      {selectedOvertime && (
        <OvertimeDetailModal
          overtime={selectedOvertime}
          canManage={canManage}
          onClose={() => setSelectedOvertimeId(null)}
          onValidate={async () => { await setOvertimeStatus(selectedOvertime.id, "validee"); setSelectedOvertimeId(null); }}
          onReject={async () => { await setOvertimeStatus(selectedOvertime.id, "refusee"); setSelectedOvertimeId(null); }}
        />
      )}
    </div>
  );
}
