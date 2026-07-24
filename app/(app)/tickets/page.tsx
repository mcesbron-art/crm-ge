"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";

/* ─── Constants ─── */
const ACCENT = "#C9A24E";

const PRIO: Record<string,{color:string;rank:number}> = {
  Urgente:{ color:"#B91C1C", rank:0 },
  Haute:  { color:"#C2530B", rank:1 },
  Normale:{ color:"#2563EB", rank:2 },
  Basse:  { color:"#8C8B83", rank:3 },
};
const PRIO_ORDER = ["Basse","Normale","Haute","Urgente"];

const STATUS: Record<string,{color:string;bg:string}> = {
  "Nouveau":    { color:"#B08D32", bg:"#F6EFDD" },
  "En cours":   { color:"#2563EB", bg:"#E6EEFB" },
  "En attente": { color:"#C2530B", bg:"#FBEAE0" },
  "Résolu":     { color:"#1F8A5B", bg:"#E4F3EC" },
  "Fermé":      { color:"#6E6A5E", bg:"#EFEDE8" },
};
const STATUS_ORDER = ["Nouveau","En cours","En attente","Résolu","Fermé"];

const TAG: Record<string,{color:string;bg:string}> = {
  Bug:          { color:"#B91C1C", bg:"#FBE9E7" },
  Urgent:       { color:"#C2530B", bg:"#FBEAE0" },
  Demande:      { color:"#2563EB", bg:"#E6EEFB" },
  Design:       { color:"#7C3AED", bg:"#EFE9FB" },
  SEO:          { color:"#0E7C66", bg:"#E1F1EC" },
  Contenu:      { color:"#9A7B22", bg:"#F6EFDD" },
  Hébergement:  { color:"#475569", bg:"#EEF1F5" },
  Relance:      { color:"#BE185D", bg:"#FCE7F0" },
};

const PAGE_SIZE = 8;
const GRID = "46px 104px minmax(240px,1.5fr) 96px 96px 108px 156px 150px 150px 88px 190px 150px 124px";

/* ─── Types ─── */
type CollabRef = { nom: string; avatar: string | null; color: string | null };
type Collaborateur = { id: string; nom: string; avatar: string | null; color: string | null };

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

type Ticket = {
  id: string; ref: string; title: string;
  client: string; clientInitials: string; project: string;
  priority: string; status: string;
  created: string; cOrd: number; modified: string; mOrd: number;
  echanges: number; tags: string[]; owner: string; collabs: CollabRef[];
  source?: "axonaut" | "manual";
};

/* ─── Helpers ─── */
function SortArrow({ k, sortKey, sortDir }: { k: string; sortKey: string; sortDir: number }) {
  const active = k === sortKey;
  return <span style={{ color: active ? ACCENT : "#C8C6BB", fontSize: 13, marginLeft: 4 }}>{active ? (sortDir === 1 ? "↑" : "↓") : "↕"}</span>;
}

function Th({ label, k, sortKey, sortDir, onSort }: { label: string; k: string; sortKey: string; sortDir: number; onSort: (k: string) => void }) {
  const [h, setH] = useState(false);
  return (
    <span onClick={() => onSort(k)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, letterSpacing: ".09em", textTransform: "uppercase" as const, fontWeight: 700, color: h ? "#16150F" : "#A09E92", cursor: "pointer" }}>
      {label}<SortArrow k={k} sortKey={sortKey} sortDir={sortDir} />
    </span>
  );
}

function ThLabel({ label }: { label: string }) {
  return <span style={{ fontSize: 12, letterSpacing: ".09em", textTransform: "uppercase" as const, fontWeight: 700, color: "#A09E92" }}>{label}</span>;
}

function DDBtn({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button className="btn" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, background: "#FBFBF9", border: `1px solid ${active ? ACCENT : "#E6E5DE"}`, borderRadius: 10, padding: "9px 13px", fontSize: 14.5, fontWeight: 600, color: "#33322C", fontFamily: "inherit" }}>
      <span style={{ color: "#9A998F" }}>{label} :</span>
      <span style={{ color: active ? ACCENT : "#8C8B83" }}>{value}</span>
      <span style={{ color: "#A6A498", fontSize: 13 }}>▾</span>
    </button>
  );
}

/* ─── Page principale ─── */
export default function TicketsPage() {
  const router = useRouter();
  const { effectiveRole } = useAuth();
  const canAssign = can(effectiveRole, "manage_ticket_assignment");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState("tous");
  const [axLoading, setAxLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("modified");
  const [sortDir, setSortDir] = useState(-1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [filterPrio, setFilterPrio] = useState("tous");
  const [filterClient, setFilterClient] = useState("tous");
  const [prioDDOpen, setPrioDDOpen] = useState(false);
  const [clientDDOpen, setClientDDOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newSaving, setNewSaving] = useState(false);
  const [newSaved, setNewSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nf, setNf] = useState({ title: "", client: "", priority: "Normale", description: "", tags: [] as string[], assignee: "" });
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const nfSet = (patch: Partial<typeof nf>) => setNf(f => ({ ...f, ...patch }));
  const nfToggleTag = (tag: string) => setNf(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));

  const refreshTickets = useCallback(() => {
    return fetch("/api/tickets")
      .then(r => r.json())
      .then((d: { tickets?: Ticket[] }) => { if (Array.isArray(d.tickets)) setTickets(d.tickets); });
  }, []);

  const createTicket = async () => {
    if (!nf.title.trim() || newSaving) return;
    setNewSaving(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: nf.title,
          client_name: nf.client,
          priorite: nf.priority.toLowerCase(),
          description: nf.description,
          tags: nf.tags,
          assigned_to: nf.assignee || null,
        }),
      });
      if (!res.ok) throw new Error();
      setNewSaved(true);
      setNewSaving(false);
      await refreshTickets();
      setTimeout(() => {
        setNewOpen(false);
        setNewSaved(false);
        setNf({ title: "", client: "", priority: "Normale", description: "", tags: [], assignee: "" });
      }, 650);
    } catch {
      setNewSaving(false);
    }
  };

  const deleteSelected = async () => {
    const ids = Object.keys(selected);
    if (ids.length === 0 || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      setSelected({});
      setDeleteConfirm(false);
      await refreshTickets();
    } catch {
      // silencieux : le bandeau de sélection reste affiché, l'utilisateur peut réessayer
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetch("/api/tickets")
      .then(r => r.json())
      .then((d: { tickets?: Ticket[] }) => {
        if (Array.isArray(d.tickets)) setTickets(d.tickets);
      })
      .catch(() => null)
      .finally(() => setAxLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/collaborateurs")
      .then(r => r.json())
      .then((d: { collaborateurs?: Collaborateur[] }) => {
        if (Array.isArray(d.collaborateurs)) setCollaborateurs(d.collaborateurs);
      })
      .catch(() => null);
  }, []);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(1); }
  };

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(s => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = true; return n; });
  };

  const filtered = useCallback(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(t => {
      if (tab !== "tous" && t.status !== tab) return false;
      if (filterPrio !== "tous" && t.priority !== filterPrio) return false;
      if (filterClient !== "tous" && t.client !== filterClient) return false;
      if (q) { const hay = (t.ref + " " + t.title + " " + t.client + " " + t.project + " " + t.tags.join(" ")).toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }, [tickets, tab, search, filterPrio, filterClient]);

  const sorted = useCallback((list: Ticket[]) => {
    return list.slice().sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (sortKey === "ref") { av = a.ref; bv = b.ref; }
      else if (sortKey === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if (sortKey === "created") { av = a.cOrd; bv = b.cOrd; }
      else if (sortKey === "modified") { av = a.mOrd; bv = b.mOrd; }
      else if (sortKey === "priority") { av = PRIO[a.priority]?.rank ?? 9; bv = PRIO[b.priority]?.rank ?? 9; }
      else if (sortKey === "status") { av = STATUS_ORDER.indexOf(a.status); bv = STATUS_ORDER.indexOf(b.status); }
      else if (sortKey === "echanges") { av = a.echanges; bv = b.echanges; }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [sortKey, sortDir]);

  const all = filtered();
  const sortedAll = sorted(all);
  const totalPages = Math.max(1, Math.ceil(sortedAll.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * PAGE_SIZE;
  const pageItems = sortedAll.slice(start, start + PAGE_SIZE);

  const pageIds = pageItems.map(t => t.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const toggleAll = () => setSelected(s => {
    const n = { ...s };
    if (allChecked) pageIds.forEach(id => delete n[id]);
    else pageIds.forEach(id => (n[id] = true));
    return n;
  });
  const selectedCount = Object.keys(selected).length;
  const openCount = tickets.filter(t => t.status !== "Fermé" && t.status !== "Résolu").length;

  const tabDefs: Array<[string, string, (t: Ticket) => boolean]> = [
    ["tous", "Tous", () => true],
    ...STATUS_ORDER.map(s => [s, s, (t: Ticket) => t.status === s] as [string, string, (t: Ticket) => boolean]),
  ];

  const dynamicClients = [...new Set(tickets.map(t => t.client))].filter(Boolean).sort();

  const rangeStart = sortedAll.length === 0 ? 0 : start + 1;
  const rangeEnd = start + pageItems.length;
  const rangeLabel = `${sortedAll.length} ticket${sortedAll.length > 1 ? "s" : ""} · ${rangeStart}–${rangeEnd} affichés`;

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={typography.pageTitle}>Tickets</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
              <span style={typography.description}>Support &amp; demandes clients · {openCount} tickets ouverts</span>
              {axLoading
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "#A6A498", background: "#F0EFEA", borderRadius: 99, padding: "2px 9px" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                    Axonaut…
                  </span>
                : tickets.some(t => t.source === "axonaut") && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#1F8A5B", background: "#E7F3EB", borderRadius: 99, padding: "2px 9px" }}>
                    <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4L16 6"/></svg>
                    {tickets.filter(t => t.source === "axonaut").length} depuis Axonaut
                  </span>
                )
              }
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button variant="secondary">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v8"/><path d="M7 8.5l3 3 3-3"/><path d="M4.5 13.5v1.5C4.5 15.6 5 16 5.5 16h9c.5 0 1-.4 1-1v-1.5"/>
              </svg>
              Exporter
            </Button>
            <Button variant="primary" onClick={() => setNewOpen(true)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouveau ticket
            </Button>
          </div>
        </div>

        {/* Table card */}
        <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px 0", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "#F4F3EE", border: "1px solid #EAE9E3", borderRadius: 11, padding: 4, gap: 2 }}>
              {tabDefs.map(([key, label, fn]) => {
                const on = tab === key;
                const count = tickets.filter(fn).length;
                return (
                  <button key={key} className="btn" onClick={() => { setTab(key); setPage(1); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, fontSize: 14.5, fontWeight: 600, border: "none", fontFamily: "inherit", color: on ? "#E4C77B" : "#7C7B73", background: on ? "#0A0A0A" : "transparent", boxShadow: on ? "0 1px 2px rgba(20,20,15,.18)" : "none" }}>
                    {label}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? "#E4C77B" : "#9A998F", background: on ? "rgba(228,199,123,.16)" : "#E7E6DF", borderRadius: 99, padding: "1px 7px" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#FBFBF9", border: "1px solid #E6E5DE", borderRadius: 10, padding: "9px 13px", width: 300 }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="6"/><line x1="13.5" y1="13.5" x2="18" y2="18"/>
                </svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher un ticket…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1C1B16" }} />
              </div>

              {/* Priorité filter */}
              <div style={{ position: "relative" }}>
                <DDBtn label="Priorité" value={filterPrio === "tous" ? "Toutes" : filterPrio} active={filterPrio !== "tous"} onClick={() => { setPrioDDOpen(o => !o); setClientDDOpen(false); }} />
                {prioDDOpen && (
                  <>
                    <div onClick={() => setPrioDDOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                    <div style={{ position: "absolute", top: 46, left: 0, zIndex: 30, width: 200, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6 }}>
                      {[{ key: "tous", label: "Toutes", dot: "#C0BEB3" }, ...[...PRIO_ORDER].reverse().map(p => ({ key: p, label: p, dot: PRIO[p].color }))].map(o => {
                        const on = filterPrio === o.key;
                        return <div key={o.key} onClick={() => { setFilterPrio(o.key); setPrioDDOpen(false); setPage(1); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: on ? "#F6EFDD" : "transparent" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.dot }} />
                          <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#33322C" }}>{o.label}</span>
                        </div>;
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Client filter */}
              <div style={{ position: "relative" }}>
                <DDBtn label="Client" value={filterClient === "tous" ? "Tous" : filterClient} active={filterClient !== "tous"} onClick={() => { setClientDDOpen(o => !o); setPrioDDOpen(false); }} />
                {clientDDOpen && (
                  <>
                    <div onClick={() => setClientDDOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                    <div style={{ position: "absolute", top: 46, left: 0, zIndex: 30, width: 240, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 300, overflowY: "auto" }}>
                      {[{ key: "tous", label: "Tous les clients", count: tickets.length }, ...dynamicClients.map(n => ({ key: n, label: n, count: tickets.filter(t => t.client === n).length }))].map(o => {
                        const on = filterClient === o.key;
                        return <div key={o.key} onClick={() => { setFilterClient(o.key); setClientDDOpen(false); setPage(1); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: on ? "#F6EFDD" : "transparent" }}>
                          <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#33322C" }}>{o.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#A6A498", background: "#F0EFEA", borderRadius: 99, padding: "1px 8px" }}>{o.count}</span>
                        </div>;
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {deleteConfirm ? (
                  <>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#C2410C" }}>
                      Supprimer définitivement {selectedCount} ticket{selectedCount > 1 ? "s" : ""} ?
                    </span>
                    <Button variant="tertiary" size="sm" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Annuler</Button>
                    <Button variant="danger" size="sm" onClick={deleteSelected} disabled={deleting}>
                      {deleting ? "Suppression…" : "Oui, supprimer"}
                    </Button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#8C8B83" }}>{selectedCount} sélectionné(s)</span>
                    <Button variant="tertiary" size="sm" onClick={() => setSelected({})}>Désélectionner</Button>
                    {effectiveRole === "admin" && (
                      <Button variant="danger-outline" size="sm" onClick={() => setDeleteConfirm(true)}>Supprimer</Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", borderTop: "1px solid #EFEEE8" }}>
            {/* Header */}
            <div style={{ minWidth: 1698, display: "grid", gridTemplateColumns: GRID, alignItems: "center", padding: "0 20px", height: 42, background: "#FAFAF7", borderBottom: "1px solid #EFEEE8" }}>
              <span onClick={toggleAll} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${allChecked ? ACCENT : "#CFCDC2"}`, background: allChecked ? ACCENT : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {allChecked && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l2.8 2.8L11.5 4"/></svg>}
                </span>
              </span>
              <Th label="Réf." k="ref" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Titre" k="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Créé" k="created" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Modifié" k="modified" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Priorité" k="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ThLabel label="Client" />
              <ThLabel label="Projet" />
              <Th label="Statut" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Éch." k="echanges" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ThLabel label="Tags" />
              <ThLabel label="Affectation" />
              <ThLabel label="Collab." />
            </div>

            {/* Rows */}
            {pageItems.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "60px 20px", minWidth: 600 }}>
                <span style={{ width: 48, height: 48, borderRadius: 14, background: "#F4F3EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#C0BEB3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5.5" width="14" height="9" rx="2"/><line x1="10" y1="5.5" x2="10" y2="14.5" strokeDasharray="1.6 1.6"/>
                  </svg>
                </span>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#33322C" }}>
                  {axLoading ? "Chargement des tickets…" : !canAssign && tickets.length === 0 ? "Aucun ticket ne vous est actuellement assigné." : "Aucun ticket"}
                </div>
                {!axLoading && (canAssign || tickets.length > 0) && <div style={{ fontSize: 14.5, color: "#A6A498" }}>Ajustez les filtres pour affiner la recherche.</div>}
              </div>
            ) : (
              pageItems.map((t, i) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  isSelected={!!selected[t.id]}
                  isLast={i === pageItems.length - 1}
                  onToggle={(e) => toggleRow(t.id, e)}
                  onRowClick={() => router.push(`/tickets/${t.id}`)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 20px", borderTop: "1px solid #EFEEE8", background: "#FAFAF7" }}>
            <span style={{ fontSize: 14.5, color: "#8C8B83" }}>{rangeLabel}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PagBtn label="Précédent" disabled={curPage === 1} onClick={() => setPage(p => p - 1)} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                const on = p === curPage;
                return <PagBtn key={p} label={String(p)} active={on} onClick={() => setPage(p)} />;
              })}
              <PagBtn label="Suivant" disabled={curPage === totalPages} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL NOUVEAU TICKET ── */}
      {newOpen && (
        <div onClick={() => setNewOpen(false)} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 600, maxWidth: "100%", maxHeight: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4h9c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H9l-3.5 3v-3H5.5C4.7 13 4 12.3 4 11.5z"/></svg>
                </span>
                <div>
                  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>Nouveau ticket</span>
                  <span style={{ display: "block", fontSize: 13, color: "#9A9078", marginTop: 1 }}>Ticket manuel · hors sync Axonaut</span>
                </div>
              </div>
              <span onClick={() => setNewOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}>
                <IconX />
              </span>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <FieldLabel>Titre du ticket</FieldLabel>
                <input value={nf.title} onChange={e => nfSet({ title: e.target.value })} placeholder="Ex. Erreur 500 au paiement panier" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Client</FieldLabel>
                <input value={nf.client} onChange={e => nfSet({ client: e.target.value })} placeholder="Nom du client" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Priorité</FieldLabel>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {[...PRIO_ORDER].reverse().map(p => {
                    const on = nf.priority === p;
                    return (
                      <span key={p} onClick={() => nfSet({ priority: p })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? PRIO[p].color : "#ECEBE4"}`, fontSize: 14, fontWeight: 600, color: on ? PRIO[p].color : "#5C5A52" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIO[p].color }} />{p}
                      </span>
                    );
                  })}
                </div>
              </div>
              {canAssign && (
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
              )}
              <div>
                <FieldLabel>Tags</FieldLabel>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.keys(TAG).map(tag => {
                    const on = nf.tags.includes(tag);
                    const g = TAG[tag];
                    return (
                      <span key={tag} onClick={() => nfToggleTag(tag)} style={{ fontSize: 13, fontWeight: 700, color: on ? g.color : "#9A998F", background: on ? g.bg : "#F4F3EE", border: `1px solid ${on ? g.color : "transparent"}`, borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea value={nf.description} onChange={e => nfSet({ description: e.target.value })} placeholder="Détails du ticket…" rows={4} style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#8C8B83" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B5B2A6" }} />
                Arrive dans « Nouveau » avec le badge Manuel
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="secondary" onClick={() => setNewOpen(false)}>Annuler</Button>
                <Button variant="primary" onClick={createTicket} disabled={!nf.title.trim() || newSaving}>
                  {newSaved ? "Ticket créé ✓" : newSaving ? "Création…" : "Créer le ticket"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Ticket Row ─── */
function TicketRow({ ticket: t, isSelected, isLast, onToggle, onRowClick }: {
  ticket: Ticket;
  isSelected: boolean;
  isLast: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onRowClick: () => void;
}) {
  const [h, setH] = useState(false);
  const st = STATUS[t.status] ?? { color: "#8C8B83", bg: "#F0EFEA" };
  const tagsShown = t.tags.slice(0, 2).map(k => ({ label: k, ...(TAG[k] ?? { color: "#6E6A5E", bg: "#EFEDE8" }) }));
  const collabAvatars = t.collabs.slice(0, 3);

  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onRowClick}
      style={{
        minWidth: 1698, display: "grid", gridTemplateColumns: GRID, alignItems: "center",
        padding: "13px 20px", borderBottom: isLast ? "none" : "1px solid #F2F1EB",
        background: isSelected ? "rgba(201,162,78,.07)" : h ? "#FAF8F2" : "#fff",
        boxShadow: isSelected ? `inset 3px 0 0 ${ACCENT}` : "none",
        transition: "background .12s ease",
        cursor: "pointer",
      }}
    >
      {/* Checkbox */}
      <span onClick={onToggle} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isSelected ? ACCENT : "#CFCDC2"}`, background: isSelected ? ACCENT : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s ease" }}>
          {isSelected && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l2.8 2.8L11.5 4"/></svg>}
        </span>
      </span>
      {/* Réf */}
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#B08D32", fontFamily: "monospace" }}>{t.ref}</span>
        {t.source === "axonaut" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: "#1F8A5B", background: "#E7F3EB", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em", width: "fit-content" }}>
            AXONAUT
          </span>
        )}
      </span>
      {/* Titre */}
      <span style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 14 }}>{t.title}</span>
      {/* Créé */}
      <span style={{ fontSize: 14, color: "#8C8B83", fontWeight: 500 }}>{t.created}</span>
      {/* Modifié */}
      <span style={{ fontSize: 14, color: "#8C8B83", fontWeight: 500 }}>{t.modified}</span>
      {/* Priorité */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: PRIO[t.priority]?.color ?? "#999" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIO[t.priority]?.color ?? "#999" }} />
        {t.priority}
      </span>
      {/* Client */}
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, paddingRight: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11, fontWeight: 800, color: "#1A1206", background: "linear-gradient(135deg,#E0BC68,#A47E2A)" }}>{t.clientInitials}</span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "#4A483F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.client}</span>
      </span>
      {/* Projet */}
      <span style={{ fontSize: 14.5, color: "#6E6C63", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 10 }}>{t.project}</span>
      {/* Statut */}
      <span style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 99, padding: "4px 11px" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.color }} />
        {t.status}
      </span>
      {/* Échanges */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14.5, fontWeight: 600, color: "#8C8B83" }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5.5C4 4.7 4.7 4 5.5 4h9c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H9l-3.5 3v-3H5.5C4.7 13 4 12.3 4 11.5z"/>
        </svg>
        {t.echanges}
      </span>
      {/* Tags */}
      <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, paddingRight: 8 }}>
        {tagsShown.map(g => (
          <span key={g.label} style={{ fontSize: 12.5, fontWeight: 700, color: g.color, background: g.bg, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{g.label}</span>
        ))}
        {t.tags.length > 2 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#A09E92" }}>+{t.tags.length - 2}</span>}
      </span>
      {/* Affectation */}
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {t.owner
          ? <span style={{ fontSize: 14.5, fontWeight: 600, color: "#4A483F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.owner}</span>
          : <span style={{ fontSize: 14.5, color: "#C0BEB3" }}>—</span>
        }
      </span>
      {/* Collabs */}
      <span style={{ display: "flex", alignItems: "center" }}>
        {collabAvatars.length === 0
          ? <span style={{ fontSize: 14.5, color: "#C0BEB3" }}>—</span>
          : collabAvatars.map((c, i) => (
            <span key={c.nom + i} title={c.nom} style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: c.color ?? "#888", border: "2px solid #fff", marginLeft: i === 0 ? 0 : -8 }}>{c.nom.slice(0, 2).toUpperCase()}</span>
          ))
        }
        {t.collabs.length > 3 && <span style={{ fontSize: 13, fontWeight: 700, color: "#A09E92", marginLeft: 6 }}>+{t.collabs.length - 3}</span>}
      </span>
    </div>
  );
}

/* ─── Modal helpers ─── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>{children}</label>;
}
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16",
  background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none",
};
function IconX() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l10 10M15 5L5 15"/></svg>;
}

/* ─── Pagination Button ─── */
function PagBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <span onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ minWidth: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: disabled ? "default" : "pointer", color: active ? "#1A1206" : disabled ? "#C0BEB3" : "#7C7B73", background: active ? ACCENT : "#fff", border: `1px solid ${h && !disabled && !active ? ACCENT : active ? ACCENT : "#E6E5DE"}`, transition: "all .1s" }}>
      {label}
    </span>
  );
}
