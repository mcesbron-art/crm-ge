"use client";

import { useState, useEffect, useCallback } from "react";
import { TASK_BILLING_TYPES, TASK_BILLING_TYPE_LABEL, TASK_BILLING_STATUSES, TASK_BILLING_STATUS_COLOR } from "@/lib/task-taxonomy";
import BillingRequestDrawer, { BillingStatusBadge } from "@/components/BillingRequestDrawer";
import { IconSearch, IconChevronDown as IconChevron } from "@/components/ui/icons";

type BillingRequestRow = {
  id: string; taskId: string; taskLabel: string; taskDueDate: string | null;
  projectName: string; projectClient: string;
  billingType: string; billingStatus: string;
  adminComment: string | null;
  requestedBy: { id: string; nom: string; color: string | null } | null;
  requestedAt: string;
  processedByNom: string | null; processedAt: string | null;
};

type Collab = { id: string; nom: string; avatar: string | null; color: string | null };

const GRID = "1.7fr 1.8fr 1.2fr 1fr 1fr 1.3fr 1.2fr 0.6fr";

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function dueUrgency(dueDate: string | null): "over" | "soon" | "ok" | "none" {
  if (!dueDate) return "none";
  const diff = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "over";
  if (diff <= 3) return "soon";
  return "ok";
}

function dueStyle(state: "over" | "soon" | "ok" | "none"): { color: string; weight: number } {
  if (state === "over") return { color: "#DC2626", weight: 700 };
  if (state === "soon") return { color: "#C2410C", weight: 700 };
  return { color: "#5C5A52", weight: 500 };
}

const IconNote = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4.5h14v9H8.5L5 16.5V13.5H3z" /></svg>);

type DropdownOption = { value: string; label: string; left?: React.ReactNode };

function Dropdown({ options, value, onChange }: { options: DropdownOption[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const current = options.find(o => o.value === value) ?? options[0];
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", whiteSpace: "nowrap" }}
      >
        <span style={{ fontSize: 15, color: "#33322C", fontWeight: 500 }}>{current.label}</span>
        <IconChevron size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div role="listbox" style={{ position: "absolute", top: 42, left: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 190, maxHeight: 240, overflow: "auto" }}>
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className="btn"
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 8,
                  width: "100%", textAlign: "left", justifyContent: "flex-start",
                  fontSize: 15, fontWeight: o.value === value ? 700 : 500, color: "#33322C",
                  background: hoverIdx === i ? "#F5F4EF" : "transparent", border: "none",
                }}
              >
                {o.left}{o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Onglet "Demandes de facturation" de /facturation — centralise toutes les
 * demandes envoyées par les collaborateurs depuis /mes-taches. La facture
 * elle-même est faite dans Axonaut : cette liste ne sert qu'à suivre le
 * statut d'avancement et un commentaire comptable optionnel. Réservé à
 * direction/admin (canSeeMoney = view_billing, vérifié par la page parente).
 */
export default function BillingRequestsTab() {
  const [requests, setRequests] = useState<BillingRequestRow[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [collabFilter, setCollabFilter] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "client" | "status" | "echeance">("date");
  const [sortDir, setSortDir] = useState(-1);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (collabFilter) params.set("collaborateur_id", collabFilter);
    return fetch(`/api/billing?${params.toString()}`)
      .then(r => r.json())
      .then((d: { requests?: BillingRequestRow[] }) => {
        if (Array.isArray(d.requests)) setRequests(d.requests);
        setUpdatedAt(new Date().toLocaleTimeString("fr-FR"));
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, collabFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/collaborateurs").then(r => r.json()).then((d: { collaborateurs?: Collab[] }) => { if (Array.isArray(d.collaborateurs)) setCollaborateurs(d.collaborateurs); }).catch(() => null);
  }, []);

  const filtered = requests.filter(r => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!r.taskLabel.toLowerCase().includes(q) && !r.projectClient.toLowerCase().includes(q) && !r.projectName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string = "", bv: string = "";
    if (sortKey === "date") { av = a.requestedAt; bv = b.requestedAt; }
    else if (sortKey === "client") { av = a.projectClient.toLowerCase(); bv = b.projectClient.toLowerCase(); }
    else if (sortKey === "echeance") { av = a.taskDueDate ?? "9999"; bv = b.taskDueDate ?? "9999"; }
    else { av = a.billingStatus; bv = b.billingStatus; }
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  const handleSort = (k: "date" | "client" | "status" | "echeance") => {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(k === "date" ? -1 : 1); }
  };

  const statusOptions: DropdownOption[] = [
    { value: "", label: "Tous statuts", left: <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B5B2A6", flex: "none" }} /> },
    ...TASK_BILLING_STATUSES.map(s => ({ value: s.value, label: s.label, left: <span style={{ width: 6, height: 6, borderRadius: "50%", background: TASK_BILLING_STATUS_COLOR[s.value], flex: "none" }} /> })),
  ];
  const typeOptions: DropdownOption[] = [
    { value: "", label: "Tous types demandés" },
    ...TASK_BILLING_TYPES.map(t => ({ value: t.value, label: t.label })),
  ];
  const collabOptions: DropdownOption[] = [
    { value: "", label: "Tous collaborateurs" },
    ...collaborateurs.map(c => ({ value: c.id, label: c.nom, left: <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", background: c.color ?? "#8C846F", flex: "none" }}>{getInitials(c.nom)}</span> })),
  ];

  return (
    <div>
      <div style={{ fontSize: 15.5, color: "#8C8B83", margin: "5px 0 16px" }}>
        Demandes de facturation des collaborateurs · {requests.length} demande{requests.length > 1 ? "s" : ""}
        {updatedAt && <span style={{ marginLeft: 8, fontSize: 13 }}>· maj {updatedAt}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", flex: 1, minWidth: 260, maxWidth: 400 }}>
          <IconSearch />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (tâche, client, projet…)"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1C1B16" }}
          />
        </div>
        <Dropdown options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        <Dropdown options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
        <Dropdown options={collabOptions} value={collabFilter} onChange={setCollabFilter} />
      </div>

      <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: "6px 22px 10px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
        <div className="responsive-table-wrapper">
          <div style={{ minWidth: 980 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
              <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Tâche</span>
              <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Client / Projet</span>
              <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Demandeur</span>
              <button type="button" className="btn" onClick={() => handleSort("date")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, background: "none", border: "none", padding: 0, justifyContent: "flex-start" }}>Date{sortKey === "date" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</button>
              <button type="button" className="btn" onClick={() => handleSort("echeance")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, background: "none", border: "none", padding: 0, justifyContent: "flex-start" }}>Échéance{sortKey === "echeance" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</button>
              <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Type demandé</span>
              <button type="button" className="btn" onClick={() => handleSort("status")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, background: "none", border: "none", padding: 0, justifyContent: "flex-start" }}>Statut{sortKey === "status" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</button>
              <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, textAlign: "right" }}>Note</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9A998F" }}>Chargement…</div>
            ) : sorted.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", textAlign: "center" }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EFEA", display: "flex", alignItems: "center", justifyContent: "center", color: "#B5B2A6" }}><IconSearch size={21} color="currentColor" strokeWidth={1.6} /></span>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#5C5A52", marginTop: 14 }}>Aucune demande ne correspond</div>
                <div style={{ fontSize: 14.5, color: "#9A998F", marginTop: 4 }}>Essayez d&apos;ajuster la recherche ou les filtres.</div>
              </div>
            ) : (
              sorted.map(r => {
                const due = dueStyle(dueUrgency(r.taskDueDate));
                return (
                  <div
                    key={r.id} onClick={() => setOpenId(r.id)}
                    onMouseEnter={() => setHoveredRow(r.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ display: "grid", gridTemplateColumns: GRID, gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer", background: hoveredRow === r.id ? "#FBFAF6" : "transparent" }}
                  >
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>{r.taskLabel}</span>
                    <span style={{ fontSize: 14.5, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>
                      {r.projectClient ? `${r.projectClient} · ` : ""}{r.projectName}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff", background: r.requestedBy?.color ?? "#8C846F", flex: "none" }}>{getInitials(r.requestedBy?.nom ?? "—")}</span>
                      <span style={{ fontSize: 14.5, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.requestedBy?.nom ?? "—"}</span>
                    </div>
                    <span style={{ fontSize: 14.5, color: "#8C8B83" }}>{fmtDate(r.requestedAt)}</span>
                    <span style={{ fontSize: 14.5, fontWeight: due.weight, color: due.color }}>{fmtDate(r.taskDueDate)}</span>
                    <span style={{ fontSize: 14.5, color: "#5C5A52" }}>{TASK_BILLING_TYPE_LABEL[r.billingType] ?? r.billingType}</span>
                    <div><BillingStatusBadge status={r.billingStatus} /></div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {r.adminComment && (
                        <span title={r.adminComment} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#A6A498" }}><IconNote /></span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {openId && (
        <BillingRequestDrawer requestId={openId} onClose={() => setOpenId(null)} onUpdated={load} />
      )}
    </div>
  );
}
