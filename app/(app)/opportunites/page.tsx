"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";
import {
  type Opportunite, type Client, type Commercial, type OpportunityStatus,
} from "@/lib/opportunites-types";
import { IconX as IconClose, IconClock, IconChevronDown as IconChevDown } from "@/components/ui/icons";

/* ─── Étapes du pipeline — couleurs propres à cette page (n'affecte pas
   lib/opportunites-types.ts, utilisé ailleurs par Rapports/StatutBadge) ─── */

const COLUMNS: { id: OpportunityStatus; label: string; accent: string }[] = [
  { id: "demande",     label: "Découverte",    accent: "#A6A498" },
  { id: "contacte",    label: "Qualification", accent: "#2563EB" },
  { id: "devis",       label: "Proposition",   accent: "#C9A24E" },
  { id: "negociation", label: "Négociation",   accent: "#C2410C" },
  { id: "gagne",       label: "Gagné",         accent: "#1F8A5B" },
];

/* Probabilité par défaut selon l'étape — pas de colonne dédiée en base */
const PROB: Record<string, number> = {
  demande: 25, contacte: 45, devis: 65, negociation: 80, gagne: 100, perdu: 0,
};

const OWNER_PALETTE = ["#7C3AED", "#0E7C66", "#2563EB", "#BE185D", "#C2410C", "#B08D32"];
function ownerColor(idx: number) { return OWNER_PALETTE[idx % OWNER_PALETTE.length]; }

function initials(name: string) {
  return name.split(/\s+/).filter(w => /[A-Za-zÀ-ÿ]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("fr-FR") + " €";
}

function IconDiamond() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3l1.7 4.3L16 9l-4.3 1.7L10 15l-1.7-4.3L4 9l4.3-1.7z"/></svg>;
}

type CollabOption = { id: string; nom: string; avatar: string | null; color: string | null };

/* ─── Page principale ───────────────────────────────────────────────────── */

export default function OpportunitesPage() {
  const { canSeeMoney, currentUser, effectiveRole } = useAuth();
  // Un collaborateur ne peut agir (déplacer/supprimer) que sur les
  // opportunités qu'il a créées — le serveur revérifie de toute façon
  // (demandeur_id === session.id) sur PATCH/DELETE, ceci n'est qu'un
  // masquage cohérent avec la restriction réelle.
  const canManageAllOpps = can(effectiveRole, "view_all_opportunities");
  const canManageOpp = (o: Opportunite) => canManageAllOpps || o.demandeur?.email === currentUser.email;

  const [opps, setOpps]       = useState<Opportunite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<CollabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<"kanban" | "list">("kanban");
  const [newOpen, setNewOpen] = useState(false);
  const [newStage, setNewStage] = useState<OpportunityStatus>("demande");
  const [detailId, setDetailId] = useState<string | null>(null);
  // Filtre "voir les opportunités d'un collaborateur" — réservé à l'admin
  // (view_all_opportunities) : un collaborateur ne voit déjà que les
  // siennes, ce filtre n'aurait pas de sens pour lui.
  const [demandeurFilter, setDemandeurFilter] = useState<string>("tous");
  const [collabDDOpen, setCollabDDOpen] = useState(false);

  // "negociation" n'existe pas encore dans l'ENUM Supabase : on le gère localement
  const [negociationIds, setNegociationIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(sessionStorage.getItem("negoc_ids") ?? "[]")); }
    catch { return new Set(); }
  });

  async function load() {
    setLoading(true);
    try {
      const [oRes, cRes, mRes, collabRes] = await Promise.all([
        fetch("/api/opportunites", { cache: "no-store" }),
        fetch("/api/clients",     { cache: "no-store" }),
        fetch("/api/commerciaux", { cache: "no-store" }),
        canManageAllOpps ? fetch("/api/collaborateurs", { cache: "no-store" }) : Promise.resolve(null),
      ]);
      const [oData, cData, mData] = await Promise.all([oRes.json(), cRes.json(), mRes.json()]);
      setOpps(oData.opportunites ?? []);
      setClients(cData.clients ?? []);
      setCommerciaux(mData.commerciaux ?? []);
      if (collabRes) {
        const collabData = await collabRes.json();
        setCollaborateurs(collabData.collaborateurs ?? []);
      }
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  /* Injecte le statut "negociation" local pour les cartes concernées */
  const filtered = opps.map(o =>
    negociationIds.has(o.id) ? { ...o, statut: "negociation" as OpportunityStatus } : o
  );
  // Filtre "collaborateur" — admin uniquement, ignoré silencieusement sinon
  // (un collaborateur n'a de toute façon jamais que ses propres opportunités).
  const visibleOpps = canManageAllOpps && demandeurFilter !== "tous"
    ? filtered.filter(o => o.demandeur_id === demandeurFilter)
    : filtered;
  const COLUMN_IDS = new Set(COLUMNS.map(c => c.id));
  const pipelineFiltered = visibleOpps.filter(o => COLUMN_IDS.has(o.statut));

  function persistNegoc(next: Set<string>) {
    try { sessionStorage.setItem("negoc_ids", JSON.stringify([...next])); } catch {}
    setNegociationIds(new Set(next));
  }

  async function moveOpp(id: string, statut: OpportunityStatus) {
    const target = opps.find(o => o.id === id);
    if (target && !canManageOpp(target)) return;

    if (statut === "negociation") {
      const next = new Set(negociationIds);
      next.add(id);
      persistNegoc(next);
      return;
    }
    if (negociationIds.has(id)) {
      const next = new Set(negociationIds);
      next.delete(id);
      persistNegoc(next);
    }

    const previous = opps.find(o => o.id === id);
    setOpps(prev => prev.map(o => o.id === id ? { ...o, statut } : o));

    try {
      const r = await fetch(`/api/opportunites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      const data = await r.json();
      if (r.ok) {
        setOpps(prev => prev.map(o => o.id === id ? data.opportunite : o));
      } else {
        if (previous) setOpps(prev => prev.map(o => o.id === id ? previous : o));
        console.error("[moveOpp]", data.error ?? r.status);
      }
    } catch {
      if (previous) setOpps(prev => prev.map(o => o.id === id ? previous : o));
    }
  }

  async function deleteOpp(id: string) {
    const target = opps.find(o => o.id === id);
    if (target && !canManageOpp(target)) return;
    if (!confirm("Supprimer cette opportunité ?")) return;
    try {
      const r = await fetch(`/api/opportunites/${id}`, { method: "DELETE" });
      if (r.ok) {
        setOpps(prev => prev.filter(o => o.id !== id));
        setDetailId(prev => prev === id ? null : prev);
        if (negociationIds.has(id)) {
          const next = new Set(negociationIds);
          next.delete(id);
          persistNegoc(next);
        }
      }
    } catch {}
  }

  const detailOpp = filtered.find(o => o.id === detailId) ?? null;
  const totalCount = visibleOpps.length;
  const activeAmount = fmt(visibleOpps.filter(o => o.statut !== "gagne" && o.statut !== "perdu").reduce((s, o) => s + (o.montant_estime ?? 0), 0));
  const demandeursWithOpps = collaborateurs.filter(c => opps.some(o => o.demandeur_id === c.id));
  const selectedDemandeurName = demandeurFilter !== "tous"
    ? (collaborateurs.find(c => c.id === demandeurFilter)?.nom ?? "Collaborateur")
    : "Tous les collaborateurs";

  const tOn = "#0A0A0A", tOff = "#8C8B83", tSh = "0 1px 2px rgba(20,20,15,.10)";

  return (
    <div style={{ margin: "-32px -40px", background: "#F5F5F2", minHeight: "100vh", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>
      <div style={{ padding: "24px 30px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── TITRE ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={typography.pageTitle}>Opportunités</h1>
            <div style={{ ...typography.description, marginTop: 5 }}>
              {totalCount} opportunité{totalCount !== 1 ? "s" : ""}{canSeeMoney ? ` · ${activeAmount} de pipeline actif` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canManageAllOpps && (
              <div style={{ position: "relative" }}>
                <div onClick={() => setCollabDDOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: `1px solid ${collabDDOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 10, padding: "9px 14px", cursor: "pointer", minWidth: 210 }}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#B08D32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.6" cy="8" r="2.6"/><path d="M3 16c0-2.5 2-4 4.6-4s4.6 1.5 4.6 4"/><circle cx="14.4" cy="8.6" r="2"/><path d="M13 12.4c2 0 4 1.2 4 3.6"/></svg>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#33322C", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedDemandeurName}</span>
                  <IconChevDown />
                </div>
                {collabDDOpen && (
                  <>
                    <div onClick={() => setCollabDDOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 30, width: 260, maxHeight: 320, overflowY: "auto", background: "#fff", border: "1px solid #E6E5DE", borderRadius: 14, boxShadow: "0 18px 44px -16px rgba(16,15,11,.4)", padding: 6 }}>
                      <div onClick={() => { setDemandeurFilter("tous"); setCollabDDOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, cursor: "pointer", background: demandeurFilter === "tous" ? "#FBF8EF" : "transparent" }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#E4C77B", fontWeight: 700, flexShrink: 0 }}>★</span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: demandeurFilter === "tous" ? 700 : 500, color: "#1C1B16" }}>Tous les collaborateurs</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#9A998F", background: "#F0EFEA", borderRadius: 99, padding: "1px 8px" }}>{opps.length}</span>
                      </div>
                      {demandeursWithOpps.map(c => {
                        const count = opps.filter(o => o.demandeur_id === c.id).length;
                        const on = demandeurFilter === c.id;
                        return (
                          <div key={c.id} onClick={() => { setDemandeurFilter(c.id); setCollabDDOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, cursor: "pointer", background: on ? "#FBF8EF" : "transparent" }}>
                            <span style={{ width: 26, height: 26, borderRadius: "50%", background: c.color || "#9A9078", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials(c.nom)}</span>
                            <span style={{ flex: 1, fontSize: 15, fontWeight: on ? 700 : 500, color: "#1C1B16", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#9A998F", background: "#F0EFEA", borderRadius: 99, padding: "1px 8px" }}>{count}</span>
                            {on && <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1F9D57" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5"/></svg>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 10, padding: 3, gap: 2 }}>
              <span onClick={() => setView("kanban")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: view === "kanban" ? tOn : tOff, background: view === "kanban" ? "#fff" : "transparent", boxShadow: view === "kanban" ? tSh : "none" }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="3.6" height="12" rx="1.2"/><rect x="8.2" y="4" width="3.6" height="8.5" rx="1.2"/><rect x="13.4" y="4" width="3.6" height="12" rx="1.2"/></svg>
                Kanban
              </span>
              <span onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: view === "list" ? tOn : tOff, background: view === "list" ? "#fff" : "transparent", boxShadow: view === "list" ? tSh : "none" }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="16" y2="6"/><line x1="6" y1="10" x2="16" y2="10"/><line x1="6" y1="14" x2="16" y2="14"/><circle cx="3.5" cy="6" r="0.6" fill="currentColor"/><circle cx="3.5" cy="10" r="0.6" fill="currentColor"/><circle cx="3.5" cy="14" r="0.6" fill="currentColor"/></svg>
                Liste
              </span>
            </div>
            <Button variant="primary" onClick={() => { setNewStage("demande"); setNewOpen(true); }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouvelle opportunité
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8C8B83", fontSize: 15 }}>Chargement…</div>
        ) : view === "kanban" ? (
          /* ── KANBAN ── */
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 14, margin: "0 -30px", paddingLeft: 30, paddingRight: 30 }}>
            {COLUMNS.map(col => {
              const cards = visibleOpps.filter(o => o.statut === col.id);
              const colTotal = cards.reduce((s, o) => s + (o.montant_estime ?? 0), 0);
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  cards={cards}
                  colTotal={colTotal}
                  canSeeMoney={canSeeMoney}
                  canManageOpp={canManageOpp}
                  onMove={moveOpp}
                  onAdd={() => { setNewStage(col.id); setNewOpen(true); }}
                  onOpen={id => setDetailId(id)}
                />
              );
            })}
          </div>
        ) : (
          /* ── LISTE ── */
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "6px 22px 14px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1fr 1.2fr", gap: 14, padding: "15px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
              <span style={hCell}>Opportunité</span>
              <span style={hCell}>Client</span>
              <span style={{ ...hCell, textAlign: "right" }}>Montant</span>
              <span style={hCell}>Probabilité</span>
              <span style={hCell}>Signature visée</span>
              <span style={hCell}>Étape</span>
            </div>
            {pipelineFiltered.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "#A6A498", fontSize: 15 }}>Aucune opportunité</div>
            )}
            {pipelineFiltered.map(o => (
              <ListRow key={o.id} o={o} canSeeMoney={canSeeMoney} onOpen={() => setDetailId(o.id)} />
            ))}
          </div>
        )}
      </div>

      {/* ── DÉTAIL (tiroir latéral) ── */}
      {detailOpp && (
        <DetailPanel
          opp={detailOpp}
          canSeeMoney={canSeeMoney}
          canMove={canManageOpp(detailOpp)}
          canDelete={canManageOpp(detailOpp)}
          onClose={() => setDetailId(null)}
          onMove={moveOpp}
          onDelete={deleteOpp}
        />
      )}

      {/* ── NOUVELLE OPPORTUNITÉ (tiroir latéral) ── */}
      {newOpen && (
        <NewOpportunityPanel
          clients={clients}
          commerciaux={commerciaux}
          initialStage={newStage}
          onClose={() => setNewOpen(false)}
          onCreated={opp => { setOpps(prev => [opp, ...prev]); setNewOpen(false); }}
        />
      )}
    </div>
  );
}

const hCell: React.CSSProperties = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 };

/* ─── Colonne kanban (gère son propre survol de drop) ──────────────────── */

function KanbanColumn({ col, cards, colTotal, canSeeMoney, canManageOpp, onMove, onAdd, onOpen }: {
  col: { id: OpportunityStatus; label: string; accent: string };
  cards: Opportunite[]; colTotal: number;
  canSeeMoney: boolean;
  canManageOpp: (o: Opportunite) => boolean;
  onMove: (id: string, s: OpportunityStatus) => void;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
      onDragLeave={e => {
        const related = e.relatedTarget as Node | null;
        if (!related || !e.currentTarget.contains(related)) setDragOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, col.id);
        setDragOver(false);
        setDraggingId(null);
      }}
      style={{
        width: 272, flex: "none",
        background: dragOver ? "#F6EFDD" : "#EFEEE9",
        border: `1.5px solid ${dragOver ? "#C9A24E" : "#E6E5DE"}`,
        borderRadius: 16, padding: 12,
        display: "flex", flexDirection: "column", gap: 10, minHeight: 480,
        transition: "background .15s ease, border-color .15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 9px", borderBottom: "1px solid #E6E5DE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: col.accent, flex: "none" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#33322C", whiteSpace: "nowrap" }}>{col.label}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9A998F", background: "#E2E1DA", borderRadius: 99, padding: "1px 8px", flex: "none" }}>{cards.length}</span>
      </div>
      {canSeeMoney && <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8C8B83", padding: "0 6px" }}>{fmt(colTotal)} de pipeline</div>}

      {cards.map(o => (
        <KanbanCard
          key={o.id}
          opp={o}
          accent={col.accent}
          canSeeMoney={canSeeMoney}
          draggable={canManageOpp(o)}
          isDragging={draggingId === o.id}
          onDragStart={() => setDraggingId(o.id)}
          onDragEnd={() => setDraggingId(null)}
          onOpen={() => onOpen(o.id)}
        />
      ))}

      <button className="btn" onClick={onAdd} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1.5px dashed #D2D0C7", color: "#9A998F", fontSize: 12, fontWeight: 600, padding: 9, borderRadius: 10, fontFamily: "inherit" }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>Nouvelle opportunité
      </button>
    </div>
  );
}

/* ─── Carte kanban ──────────────────────────────────────────────────────── */

function KanbanCard({ opp, accent, canSeeMoney, draggable, isDragging, onDragStart, onDragEnd, onOpen }: {
  opp: Opportunite; accent: string;
  canSeeMoney: boolean;
  draggable: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  const p = PROB[opp.statut] ?? 50;
  const commName = opp.commercial?.nom ?? "?";
  const dueStr = opp.resultat_date ? new Date(opp.resultat_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

  return (
    <div
      draggable={draggable}
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", opp.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff", border: "1px solid #ECEBE4", borderLeft: `3px solid ${accent}`,
        borderRadius: 12, padding: 13,
        boxShadow: hover ? "0 12px 26px -12px rgba(201,162,78,.5)" : "0 1px 2px rgba(20,20,15,.05)",
        cursor: draggable ? "grab" : "pointer",
        opacity: isDragging ? 0.4 : 1,
        transform: hover ? "translateY(-3px)" : "none",
        borderColor: hover ? "#C9A24E" : "#ECEBE4",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1B16", lineHeight: 1.3 }}>{opp.titre}</div>
      <div style={{ fontSize: 12, color: "#A6A498", marginTop: 3 }}>{opp.client?.nom ?? "—"}</div>
      {canSeeMoney && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: "1px solid #F2F1EB" }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: "#16150F", fontFamily: "Georgia, 'Times New Roman', serif" }}>{fmt(opp.montant_estime)}</span>
          <span style={{ width: 25, height: 25, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff", background: ownerColor(0), flex: "none" }} title={commName}>{initials(commName)}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#8C8B83" }}>{p}% proba.</span>
        <span style={{ fontSize: 11.5, fontWeight: opp.statut === "gagne" ? 700 : 500, color: opp.statut === "gagne" ? "#1F8A5B" : "#8C8B83" }}>{dueStr}</span>
      </div>
    </div>
  );
}

/* ─── Vue liste ─────────────────────────────────────────────────────────── */

function ListRow({ o, canSeeMoney, onOpen }: { o: Opportunite; canSeeMoney: boolean; onOpen: () => void }) {
  const [hov, setHov] = useState(false);
  const col = COLUMNS.find(c => c.id === o.statut);
  const p = PROB[o.statut] ?? 50;
  const won = o.statut === "gagne";
  const dueStr = o.resultat_date ? new Date(o.resultat_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";

  return (
    <div onClick={onOpen} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1fr 1.2fr", gap: 14, alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer", background: hov ? "#FBFAF6" : "transparent" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <span style={{ width: 7, height: 34, borderRadius: 99, background: col?.accent ?? "#C9A24E", flex: "none" }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.titre}</span>
      </div>
      <div style={{ fontSize: 13, color: "#5C5A52", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.client?.nom ?? "—"}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#16150F", textAlign: "right", fontFamily: "Georgia, 'Times New Roman', serif" }}>{canSeeMoney ? fmt(o.montant_estime) : "••••"}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#5C5A52" }}>{p}%</div>
      <div style={{ fontSize: 12.5, fontWeight: won ? 700 : 500, color: won ? "#1F8A5B" : "#5C5A52" }}>{dueStr}</div>
      <div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: won ? "#1F8A5B" : "#5C5A52", background: won ? "#E7F3EB" : "#F0EFEA", borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: col?.accent ?? "#8C8B83" }} />
          {col?.label ?? o.statut}
        </span>
      </div>
    </div>
  );
}

/* ─── Détail (tiroir latéral) ───────────────────────────────────────────── */

function DetailPanel({ opp, canSeeMoney, canMove, canDelete, onClose, onMove, onDelete }: {
  opp: Opportunite;
  canSeeMoney: boolean;
  canMove: boolean;
  canDelete: boolean;
  onClose: () => void;
  onMove: (id: string, s: OpportunityStatus) => void;
  onDelete: (id: string) => void;
}) {
  const p = PROB[opp.statut] ?? 50;
  const commName = opp.commercial?.nom ?? "—";
  const dueStr = opp.resultat_date ? new Date(opp.resultat_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const createdStr = new Date(opp.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.45)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="modal-slide-in" style={{ width: 460, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <span onClick={onClose} style={{ position: "absolute", top: 18, right: 18, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconClose /></span>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", position: "relative", paddingRight: 30 }}>{opp.titre}</div>
          <div style={{ fontSize: 13, color: "#AEA890", marginTop: 5, position: "relative" }}>{opp.client?.nom ?? "—"}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: canSeeMoney ? "1fr 1fr" : "1fr", gap: 10 }}>
            {canSeeMoney && (
              <div style={detailBox}>
                <div style={detailLabel}>Montant</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1C1B16", marginTop: 6, fontFamily: "Georgia, 'Times New Roman', serif" }}>{fmt(opp.montant_estime)}</div>
              </div>
            )}
            <div style={detailBox}>
              <div style={detailLabel}>Probabilité</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1C1B16", marginTop: 6 }}>{p}%</div>
            </div>
          </div>

          <div style={detailBox}>
            <div style={detailLabel}>Date de signature visée</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1C1B16", marginTop: 6 }}>{dueStr}</div>
          </div>

          <div style={detailBox}>
            <div style={detailLabel}>Commercial responsable</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", background: ownerColor(0) }}>{initials(commName)}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1C1B16" }}>{commName}</span>
            </div>
          </div>

          {opp.demandeur && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#5C5A52" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#B08D32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/></svg>
              Demandé par <strong style={{ color: "#1C1B16", marginLeft: 4 }}>{opp.demandeur.nom}</strong>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#5C5A52" }}>
            <IconClock />
            Créée le {createdStr}
          </div>

          {opp.client?.contact_nom && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#fff", borderRadius: 12, border: "1px solid #ECEBE4" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#B08D32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M3 6.5 10 11l7-4.5"/></svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1B16" }}>{opp.client.contact_nom}</div>
                {opp.client.contact_email && <div style={{ fontSize: 13, color: "#8C8B83", marginTop: 2 }}>{opp.client.contact_email}</div>}
                {opp.client.contact_phone && <div style={{ fontSize: 13, color: "#8C8B83", marginTop: 1 }}>{opp.client.contact_phone}</div>}
              </div>
            </div>
          )}

          {opp.notes && (
            <div>
              <div style={detailLabel}>Notes</div>
              <div style={{ fontSize: 14.5, color: "#33322C", lineHeight: 1.6, padding: "12px 14px", background: "#fff", borderRadius: 10, border: "1px solid #ECEBE4", marginTop: 8 }}>{opp.notes}</div>
            </div>
          )}

          {canMove && (
            <div>
              <div style={{ ...detailLabel, marginBottom: 9 }}>Étape du cycle</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLUMNS.map(c => {
                  const on = opp.statut === c.id;
                  return (
                    <span key={c.id} onClick={() => onMove(opp.id, c.id)} style={{ fontSize: 11.5, fontWeight: 700, color: on ? "#fff" : c.accent, background: on ? c.accent : "#F0EFEA", border: `1px solid ${on ? c.accent : "transparent"}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}>
                      {c.label}
                    </span>
                  );
                })}
                <span onClick={() => onMove(opp.id, "perdu")} style={{ fontSize: 11.5, fontWeight: 700, color: opp.statut === "perdu" ? "#fff" : "#C62828", background: opp.statut === "perdu" ? "#C62828" : "#FFEBEE", border: `1px solid ${opp.statut === "perdu" ? "#C62828" : "transparent"}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}>
                  Perdu
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          {renderDeleteButton(canDelete, opp, onDelete)}
          <Button variant="primary" style={{ flex: 1 }} onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

// Petit helper pour garder le bouton Supprimer optionnel sans dupliquer le JSX du footer.
function renderDeleteButton(canDelete: boolean, opp: Opportunite, onDelete: (id: string) => void) {
  if (!canDelete) return null;
  return (
    <Button variant="danger-outline" style={{ flex: 1 }} onClick={() => onDelete(opp.id)}>
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 17 6"/><path d="M16 6l-1 11H5L4 6"/><path d="M8 6V4h4v2"/></svg>
      Supprimer
    </Button>
  );
}

const detailBox: React.CSSProperties = { background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 };
const detailLabel: React.CSSProperties = { fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 };

/* ─── Nouvelle opportunité (tiroir latéral) ─────────────────────────────── */

const fieldLabel: React.CSSProperties = { fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 };
const fieldInput: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "11px 13px", outline: "none" };

function NewOpportunityPanel({ clients, commerciaux, initialStage, onClose, onCreated }: {
  clients: Client[]; commerciaux: Commercial[];
  initialStage: OpportunityStatus;
  onClose: () => void;
  onCreated: (o: Opportunite) => void;
}) {
  const [titre, setTitre]       = useState("");
  const [clientId, setClientId] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [commercialId, setCommercialId] = useState(commerciaux[0]?.id ?? "");
  const [montant, setMontant]   = useState("");
  const [proba, setProba]       = useState(String(PROB[initialStage] ?? 30));
  const [due, setDue]           = useState("");
  const [stage, setStage]       = useState<OpportunityStatus>(initialStage);
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);

  async function handleSave() {
    if (!titre.trim() || !clientId || !commercialId) return;
    setSaving(true);
    try {
      const r = await fetch("/api/opportunites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: titre.trim(),
          client_id: clientId,
          commercial_id: commercialId,
          montant_estime: montant ? Number(montant.replace(/\s/g, "").replace(",", ".")) : undefined,
          statut: stage,
          resultat_date: due || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setSaved(true);
        setTimeout(() => onCreated(data.opportunite), 600);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.45)", zIndex: 70, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="modal-slide-in" style={{ width: 460, maxWidth: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconDiamond /></span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>Nouvelle opportunité</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconClose /></span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={fieldLabel}>Nom de l&apos;opportunité</label>
            <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex. Refonte site vitrine" style={fieldInput} />
          </div>

          <div>
            <label style={fieldLabel}>Client / prospect</label>
            <div style={{ position: "relative" }}>
              <div onClick={() => setClientOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${clientOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
                <span style={{ fontSize: 13.5, color: selectedClient ? "#1C1B16" : "#9A998F", fontWeight: 600 }}>{selectedClient?.nom ?? "Sélectionner…"}</span>
                <IconChevDown />
              </div>
              {clientOpen && (
                <>
                  <div onClick={() => setClientOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                  <div style={{ position: "absolute", top: 48, left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
                    {clients.map(c => {
                      const on = clientId === c.id;
                      return (
                        <div key={c.id} onClick={() => { setClientId(c.id); setClientOpen(false); }} style={{ padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 500, color: "#33322C", background: on ? "#FBF8EF" : "transparent" }}>{c.nom}</div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Montant</label>
              <input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="€" style={fieldInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Probabilité</label>
              <input type="number" min={0} max={100} value={proba} onChange={e => setProba(e.target.value)} placeholder="%" style={fieldInput} />
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Date de signature visée</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} style={fieldInput} />
          </div>

          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Commercial responsable</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {commerciaux.map((c, i) => {
                const on = commercialId === c.id;
                return (
                  <span key={c.id} onClick={() => setCommercialId(c.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px", borderRadius: 99, cursor: "pointer", background: on ? "#FBF8EF" : "#fff", border: `1.5px solid ${on ? "#C9A24E" : "#ECEBE4"}` }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff", background: ownerColor(i) }}>{initials(c.nom)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#5C5A52" }}>{c.nom.split(" ")[0]}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Étape du cycle</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COLUMNS.map(c => {
                const on = stage === c.id;
                return (
                  <span key={c.id} onClick={() => { setStage(c.id); setProba(String(PROB[c.id] ?? 50)); }} style={{ fontSize: 12, fontWeight: 700, color: on ? "#fff" : c.accent, background: on ? c.accent : "#F5F4EF", border: `1px solid ${on ? c.accent : "#E5E4DD"}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
                    {c.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Contexte, besoin exprimé, prochaines étapes…" style={{ ...fieldInput, resize: "none", lineHeight: 1.55 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8C8B83" }}><IconClock size={13} />Arrive directement dans le pipeline</span>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</Button>
            <Button
              variant="primary"
              style={{ flex: 1, ...(saved ? { background: "#1F8A5B", borderColor: "#1F8A5B", color: "#fff" } : {}) }}
              onClick={handleSave}
              disabled={saving || !titre.trim() || !clientId}
            >
              {saved ? "Créée ✓" : saving ? "Création…" : "Créer l'opportunité"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
