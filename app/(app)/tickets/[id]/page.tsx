"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PRIO, PRIO_ORDER, STATUS, TAG } from "@/lib/tickets-data";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";

const ACCENT = "#C9A24E";

const STATUS_ORDER_DB = ["Nouveau", "En cours", "Résolu", "Fermé"] as const;

/* ─── Types ─── */
type Collaborateur = { id: string; nom: string; avatar: string | null; color: string | null };
type ProjetOption = { id: string; name: string; client_name: string };

type ApiTicket = {
  uuid: string;
  id: number;
  ref: string;
  title: string;
  client: string;
  clientInitials: string;
  project: string;
  projectId: string | null;
  priority: string;
  status: string;
  created: string;
  modified: string;
  echanges: number;
  tags: string[];
  description: string | null;
  source: "axonaut" | "manual";
  assignee: Collaborateur | null;
  collaborators: Collaborateur[];
};

type ApiComment = {
  id: string;
  content: string;
  created_at: string;
  date: string;
  author_nom: string;
  author_initials: string;
  author_color: string;
  canDelete: boolean;
};

/* ─── Helpers ─── */
function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: size * 0.34, fontWeight: 700, color: "#fff", background: color }}>
      {initials}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#9A998F", fontWeight: 700, marginBottom: 8 }}>{children}</div>;
}

function InlineSelect({ value, options, renderValue, onSelect }: {
  value: string;
  options: readonly string[];
  renderValue: (v: string) => React.ReactNode;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", background: "transparent", border: "none", padding: 0, fontFamily: "inherit" }}>
        {renderValue(value)}
        <span style={{ color: "#C0BEB3", fontSize: 12 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 180 }}>
            {options.map(o => (
              <div key={o} onClick={() => { onSelect(o); setOpen(false); }} style={{ padding: "8px 11px", borderRadius: 8, cursor: "pointer", background: o === value ? "#F6EFDD" : "transparent", fontWeight: o === value ? 700 : 500, fontSize: 15, color: o === value ? "#0A0A0A" : "#33322C" }}>
                {renderValue(o)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AssigneeSelect({ value, collaborateurs, onSelect }: {
  value: Collaborateur | null;
  collaborateurs: Collaborateur[];
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent", border: "none", padding: 0, fontFamily: "inherit", width: "100%" }}>
        {value ? (
          <>
            <Avatar initials={value.nom.slice(0, 2).toUpperCase()} color={value.color ?? "#888"} size={24} />
            <span style={{ fontSize: 15.5, fontWeight: 600, color: "#1C1B16" }}>{value.nom}</span>
          </>
        ) : (
          <span style={{ fontSize: 15.5, color: "#C0BEB3" }}>Non assigné</span>
        )}
        <span style={{ color: "#C0BEB3", fontSize: 12, marginLeft: "auto" }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 200 }}>
            <div onClick={() => { onSelect(null); setOpen(false); }} style={{ padding: "8px 11px", borderRadius: 8, cursor: "pointer", fontSize: 15, color: !value ? "#0A0A0A" : "#8C8B83", fontWeight: !value ? 700 : 500, background: !value ? "#F6EFDD" : "transparent" }}>
              Non assigné
            </div>
            {collaborateurs.map(c => (
              <div key={c.id} onClick={() => { onSelect(c.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 8, cursor: "pointer", background: value?.id === c.id ? "#F6EFDD" : "transparent" }}>
                <Avatar initials={c.nom.slice(0, 2).toUpperCase()} color={c.color ?? "#888"} size={22} />
                <span style={{ fontSize: 15, fontWeight: value?.id === c.id ? 700 : 500, color: "#33322C" }}>{c.nom}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CollaboratorsPicker({ value, collaborateurs, onChange }: {
  value: Collaborateur[];
  collaborateurs: Collaborateur[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(value.map(c => c.id));

  const toggle = (id: string) => {
    const next = selectedIds.has(id) ? value.filter(c => c.id !== id).map(c => c.id) : [...Array.from(selectedIds), id];
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {value.map(c => (
          <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F4F3EE", borderRadius: 99, padding: "3px 10px 3px 4px" }}>
            <Avatar initials={c.nom.slice(0, 2).toUpperCase()} color={c.color ?? "#888"} size={20} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: "#1C1B16" }}>{c.nom}</span>
            <span onClick={() => toggle(c.id)} style={{ cursor: "pointer", opacity: .5, fontSize: 14 }}>×</span>
          </span>
        ))}
        <span onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 700, color: "#9A998F", background: "#F0EFEA", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
          + Collaborateur
        </span>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 200 }}>
            {collaborateurs.map(c => {
              const checked = selectedIds.has(c.id);
              return (
                <div key={c.id} onClick={() => toggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 8, cursor: "pointer", background: checked ? "#F6EFDD" : "transparent" }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${checked ? ACCENT : "#CFCDC2"}`, background: checked ? ACCENT : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    {checked && <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l2.8 2.8L11.5 4"/></svg>}
                  </span>
                  <Avatar initials={c.nom.slice(0, 2).toUpperCase()} color={c.color ?? "#888"} size={22} />
                  <span style={{ fontSize: 15, fontWeight: checked ? 700 : 500, color: "#33322C" }}>{c.nom}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {tags.map(k => {
        const t = TAG[k] ?? { color: "#6E6A5E", bg: "#EFEDE8" };
        return (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 700, color: t.color, background: t.bg, borderRadius: 7, padding: "3px 6px 3px 10px" }}>
            {k}
            <span onClick={() => onChange(tags.filter(x => x !== k))} style={{ cursor: "pointer", opacity: .6, fontSize: 14, lineHeight: 1 }}>×</span>
          </span>
        );
      })}
      {adding ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
          onBlur={commit}
          placeholder="Nom du tag…"
          style={{ fontSize: 13.5, fontWeight: 600, border: "1px solid #E2E1DA", borderRadius: 7, padding: "3px 8px", outline: "none", fontFamily: "inherit", width: 110 }}
        />
      ) : (
        <span onClick={() => setAdding(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 700, color: "#9A998F", background: "#F0EFEA", borderRadius: 7, padding: "3px 9px", cursor: "pointer" }}>
          + Tag
        </span>
      )}
    </div>
  );
}

function ProjectPicker({ value, projectLabel, onSelect, onClear }: {
  value: string | null;
  projectLabel: string;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProjetOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/projets?q=${encodeURIComponent(q)}&page_size=15`)
        .then(r => r.json())
        .then((d: { data?: ProjetOption[] }) => setResults(Array.isArray(d.data) ? d.data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [open, q]);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent", border: "none", padding: 0, fontFamily: "inherit", width: "100%" }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#A09E92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5C3 5.7 3.6 5 4.4 5H8l1.6 1.8h6C16.4 6.8 17 7.4 17 8.2V14.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 16 3 15.4 3 14.6Z"/></svg>
        <span style={{ fontSize: 15.5, fontWeight: 600, color: value ? "#1C1B16" : "#C0BEB3" }}>{value ? projectLabel : "Aucun projet lié"}</span>
        <span style={{ color: "#C0BEB3", fontSize: 12, marginLeft: "auto" }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 8, minWidth: 260 }}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un projet…"
              style={{ width: "100%", fontSize: 15, border: "1px solid #E6E5DE", borderRadius: 8, padding: "7px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, marginBottom: 6 }}
            />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {value && (
                <div onClick={() => { onClear(); setOpen(false); }} style={{ padding: "8px 9px", borderRadius: 8, cursor: "pointer", fontSize: 14.5, fontWeight: 600, color: "#B91C1C" }}>
                  × Retirer le lien projet
                </div>
              )}
              {loading ? (
                <div style={{ padding: "10px 8px", fontSize: 14.5, color: "#A6A498" }}>Recherche…</div>
              ) : results.length === 0 ? (
                <div style={{ padding: "10px 8px", fontSize: 14.5, color: "#A6A498" }}>Aucun projet trouvé.</div>
              ) : (
                results.map(p => (
                  <div key={p.id} onClick={() => { onSelect(p.id, p.name); setOpen(false); }} style={{ padding: "8px 9px", borderRadius: 8, cursor: "pointer", background: p.id === value ? "#F6EFDD" : "transparent" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1B16" }}>{p.name}</div>
                    <div style={{ fontSize: 13.5, color: "#A6A498" }}>{p.client_name}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CommentBubble({ comment, isLast, onDelete }: { comment: ApiComment; isLast: boolean; onDelete: (id: string) => void }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 24, position: "relative" }}>
      {!isLast && <div style={{ position: "absolute", left: 13, top: 30, bottom: 0, width: 1, background: "#EAE9E3" }} />}
      <Avatar initials={comment.author_initials} color={comment.author_color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{comment.author_nom}</span>
          <span style={{ fontSize: 14, color: "#A6A498" }}>{comment.date}</span>
          {h && (
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, color: "#C0BEB3", fontStyle: "italic" }}>Note interne</span>
              {comment.canDelete && (
                <span
                  onClick={() => { if (confirm("Supprimer cette note ?")) onDelete(comment.id); }}
                  title="Supprimer"
                  style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#B91C1C", opacity: .7 }}
                >
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.4A1.5 1.5 0 0 1 11.9 17H8.1a1.5 1.5 0 0 1-1.5-1.6L6 6"/></svg>
                </span>
              )}
            </span>
          )}
        </div>
        <div style={{ background: "#FBFAF5", border: "1px solid #EFEAD9", borderRadius: "4px 14px 14px 14px", padding: "12px 15px", fontSize: 15.5, lineHeight: 1.65, color: "#33322C", whiteSpace: "pre-wrap" }}>
          {comment.content}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { effectiveRole } = useAuth();
  const canAssign = can(effectiveRole, "manage_ticket_assignment");

  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ddOpen, setDdOpen] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!rawId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tickets/${rawId}`).then(r => r.json()),
      fetch(`/api/tickets/${rawId}/comments`).then(r => r.json()),
      fetch("/api/collaborateurs").then(r => r.json()),
    ])
      .then(([td, cd, coll]) => {
        if (td.ticket) setTicket(td.ticket);
        if (Array.isArray(cd.comments)) setComments(cd.comments);
        if (Array.isArray(coll.collaborateurs)) setCollaborateurs(coll.collaborateurs);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [rawId]);

  // Met à jour l'UI de façon optimiste, puis annule si le serveur refuse
  // la modification (sinon un échec silencieux laisse croire que c'est
  // enregistré alors que rien n'a été persisté en base).
  const patchTicket = (body: Record<string, unknown>, apply: (t: ApiTicket) => ApiTicket) => {
    if (!ticket) return;
    const previous = ticket;
    setTicket(apply(previous));
    setSaveError(null);
    fetch(`/api/tickets/${rawId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async res => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Erreur ${res.status}`);
        }
      })
      .catch(err => {
        setTicket(previous);
        setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement");
      });
  };

  const patchStatus = (newStatus: string) =>
    patchTicket({ status: newStatus }, t => ({ ...t, status: newStatus }));

  const patchAssignee = (collabId: string | null) => {
    const assignee = collabId ? collaborateurs.find(c => c.id === collabId) ?? null : null;
    patchTicket({ assigned_to: collabId }, t => ({ ...t, assignee }));
  };

  const patchTags = (tags: string[]) =>
    patchTicket({ tags }, t => ({ ...t, tags }));

  const patchProject = (projectId: string, projectName: string) =>
    patchTicket({ project_id: projectId }, t => ({ ...t, projectId, project: projectName }));

  const clearProject = () =>
    patchTicket({ project_id: null }, t => ({ ...t, projectId: null, project: "—" }));

  const patchCollaborators = (ids: string[]) => {
    const selected = collaborateurs.filter(c => ids.includes(c.id));
    patchTicket({ collaborator_ids: ids }, t => ({ ...t, collaborators: selected }));
  };

  const addComment = async () => {
    const content = commentText.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${rawId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => [...prev, data.comment]);
        setCommentText("");
        setTicket(prev => prev ? { ...prev, echanges: prev.echanges + 1 } : prev);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    const previous = comments;
    setComments(prev => prev.filter(c => c.id !== commentId));
    setTicket(prev => prev ? { ...prev, echanges: Math.max(0, prev.echanges - 1) } : prev);
    try {
      const res = await fetch(`/api/tickets/${rawId}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setComments(previous);
      setTicket(prev => prev ? { ...prev, echanges: previous.length } : prev);
      setSaveError("Impossible de supprimer cette note.");
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#33322C", marginBottom: 6 }}>Chargement…</div>
          <Link href="/tickets" style={{ fontSize: 15, color: ACCENT, textDecoration: "none" }}>← Retour aux tickets</Link>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#33322C", marginBottom: 6 }}>Ticket introuvable</div>
          <Link href="/tickets" style={{ fontSize: 15, color: ACCENT, textDecoration: "none" }}>← Retour aux tickets</Link>
        </div>
      </div>
    );
  }

  const st = STATUS[ticket.status] ?? { color: "#8C8B83", bg: "#F0EFEA" };
  const pc = PRIO[ticket.priority] ?? { color: "#8C8B83", rank: 9 };

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>

      {saveError && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 16px", borderRadius: 10, boxShadow: "0 12px 30px -10px rgba(20,20,15,.3)", display: "flex", alignItems: "center", gap: 10 }}>
          {saveError}
          <span onClick={() => setSaveError(null)} style={{ cursor: "pointer", opacity: .6 }}>×</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ padding: "14px 30px", borderBottom: "1px solid #EAE9E3", background: "#FBFBF9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#8C8B83" }}>
          <Link href="/tickets" style={{ color: "#8C8B83", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 16l-6-6 6-6"/></svg>
            Tickets
          </Link>
          <span style={{ color: "#D4D2C8" }}>/</span>
          <span style={{ color: "#C9A24E", fontWeight: 600, fontFamily: "monospace", fontSize: 14 }}>{ticket.ref}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ticket.status !== "Résolu" && ticket.status !== "Fermé" && (
            <button className="btn" onClick={() => patchStatus("Résolu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "#E4F3EC", color: "#1F8A5B", border: "1px solid #B8E3D0", fontSize: 15, fontWeight: 600, padding: "8px 14px", borderRadius: 9, fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4.5 4.5L16 6"/></svg>
              Marquer résolu
            </button>
          )}
          {ticket.status !== "Fermé" && (
            <Button variant="secondary" size="sm" onClick={() => patchStatus("Fermé")}>
              Fermer
            </Button>
          )}
          <div style={{ position: "relative" }}>
            <Button variant="icon" aria-label="Plus d'actions" onClick={() => setDdOpen(d => d === "actions" ? null : "actions")}>⋮</Button>
            {ddOpen === "actions" && (
              <>
                <div onClick={() => setDdOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", top: 40, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, minWidth: 170 }}>
                  <div onClick={() => { router.push("/tickets"); setDdOpen(null); }} style={{ padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 500, color: "#33322C" }}>
                    Retour à la liste
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, overflow: "hidden" }}>

        {/* ── LEFT: main ── */}
        <div style={{ flex: 1, minWidth: 0, padding: "28px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Title + meta */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#B08D32", fontFamily: "monospace" }}>{ticket.ref}</span>
              {ticket.source === "axonaut" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#1F8A5B", background: "#E7F3EB", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
                  AXONAUT
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 99, padding: "3px 10px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />
                {ticket.status}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: pc.color }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: pc.color }} />
                {ticket.priority}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, color: "#A6A498" }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4h9c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H9l-3.5 3v-3H5.5C4.7 13 4 12.3 4 11.5z"/></svg>
                {ticket.echanges} échange{ticket.echanges !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 style={typography.pageTitle}>
              {ticket.title}
            </h1>
          </div>

          {/* Description */}
          <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#A09E92" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="10" y2="14"/></svg>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" as const, color: "#9A998F" }}>Description</span>
            </div>
            {ticket.description ? (
              <div style={{ fontSize: 16, lineHeight: 1.75, color: "#33322C", whiteSpace: "pre-wrap" }}>{ticket.description}</div>
            ) : (
              <div style={{ fontSize: 16, color: "#C0BEB3", fontStyle: "italic" }}>Aucune description fournie.</div>
            )}
          </div>

          {/* Comments / Notes internes */}
          <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#A09E92" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="12" height="8" rx="2"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" as const, color: "#9A998F" }}>Notes internes</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#A09E92", background: "#F0EFEA", borderRadius: 99, padding: "1px 8px" }}>{comments.length}</span>
            </div>

            {comments.length === 0 ? (
              <div style={{ textAlign: "center" as const, padding: "24px 0", color: "#C0BEB3", fontSize: 15 }}>Aucune note interne pour l'instant.</div>
            ) : (
              <div>
                {comments.map((c, i) => <CommentBubble key={c.id} comment={c} isLast={i === comments.length - 1} onDelete={deleteComment} />)}
              </div>
            )}

            {/* Comment input */}
            <div style={{ marginTop: 24, borderTop: "1px solid #F0EFEA", paddingTop: 20 }}>
              <div style={{ background: "#FFFBF0", border: "1.5px solid #E4C77B", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#FDF6E4", borderBottom: "1px solid #F0E3B0", fontSize: 13.5, fontWeight: 700, color: "#B08D32" }}>
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="12" height="8" rx="2"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>
                  Note interne — visible uniquement par l'équipe
                </div>
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment(); }}
                  placeholder="Ajouter une note interne…"
                  rows={3}
                  style={{ width: "100%", border: "none", outline: "none", padding: "12px 14px", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "transparent", resize: "none" as const, lineHeight: 1.6, boxSizing: "border-box" as const }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "8px 12px", borderTop: "1px solid #EFEEE8", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "#C0BEB3" }}>⌘ + Entrée</span>
                  <Button variant="primary" size="sm" onClick={addComment} disabled={!commentText.trim() || submitting}>
                    {submitting ? "Envoi…" : "Ajouter"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div style={{ width: 296, flexShrink: 0, borderLeft: "1px solid #EAE9E3", background: "#FBFBF9", padding: "24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Statut */}
          <div>
            <FieldLabel>Statut</FieldLabel>
            <InlineSelect
              value={ticket.status}
              options={STATUS_ORDER_DB}
              onSelect={patchStatus}
              renderValue={v => {
                const s = STATUS[v] ?? { color: "#8C8B83", bg: "#F0EFEA" };
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: "4px 12px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                    {v}
                  </span>
                );
              }}
            />
          </div>

          <div style={{ height: 1, background: "#EFEEE8" }} />

          {/* Priorité */}
          <div>
            <FieldLabel>Priorité</FieldLabel>
            <InlineSelect
              value={ticket.priority}
              options={[...PRIO_ORDER].reverse()}
              onSelect={() => {}} // read-only for Axonaut tickets
              renderValue={v => {
                const p = PRIO[v] ?? { color: "#8C8B83" };
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: p.color }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                    {v}
                  </span>
                );
              }}
            />
          </div>

          <div style={{ height: 1, background: "#EFEEE8" }} />

          {/* Client */}
          <div>
            <FieldLabel>Client</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11.5, fontWeight: 800, color: "#1A1206", background: "linear-gradient(135deg,#E0BC68,#A47E2A)" }}>
                {ticket.clientInitials}
              </span>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: "#1C1B16" }}>{ticket.client}</span>
            </div>
          </div>

          <div>
            <FieldLabel>Assigné à</FieldLabel>
            {canAssign ? (
              <AssigneeSelect value={ticket.assignee} collaborateurs={collaborateurs} onSelect={patchAssignee} />
            ) : ticket.assignee ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar initials={ticket.assignee.nom.slice(0, 2).toUpperCase()} color={ticket.assignee.color ?? "#888"} size={24} />
                <span style={{ fontSize: 15.5, fontWeight: 600, color: "#1C1B16" }}>{ticket.assignee.nom}</span>
              </div>
            ) : (
              <span style={{ fontSize: 15.5, color: "#C0BEB3" }}>Non assigné</span>
            )}
          </div>

          <div style={{ height: 1, background: "#EFEEE8" }} />

          {(canAssign || ticket.collaborators.length > 0) && (
            <>
              <div>
                <FieldLabel>Collaborateurs</FieldLabel>
                {canAssign ? (
                  <CollaboratorsPicker value={ticket.collaborators} collaborateurs={collaborateurs} onChange={patchCollaborators} />
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ticket.collaborators.map(c => (
                      <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F4F3EE", borderRadius: 99, padding: "3px 10px 3px 4px" }}>
                        <Avatar initials={c.nom.slice(0, 2).toUpperCase()} color={c.color ?? "#888"} size={20} />
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: "#1C1B16" }}>{c.nom}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: "#EFEEE8" }} />
            </>
          )}

          <div>
            <FieldLabel>Projet</FieldLabel>
            <ProjectPicker value={ticket.projectId} projectLabel={ticket.project} onSelect={patchProject} onClear={clearProject} />
          </div>

          <div style={{ height: 1, background: "#EFEEE8" }} />

          <div>
            <FieldLabel>Tags</FieldLabel>
            <TagEditor tags={ticket.tags} onChange={patchTags} />
          </div>

          <div style={{ height: 1, background: "#EFEEE8" }} />

          {/* Dates */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <FieldLabel>Créé le</FieldLabel>
              <span style={{ fontSize: 15, color: "#6E6C63" }}>{ticket.created}</span>
            </div>
            <div>
              <FieldLabel>Dernière modification</FieldLabel>
              <span style={{ fontSize: 15, color: "#6E6C63" }}>{ticket.modified}</span>
            </div>
          </div>

          {ticket.source === "axonaut" && (
            <>
              <div style={{ height: 1, background: "#EFEEE8" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#7A9E8A", background: "#EFF7F2", borderRadius: 9, padding: "10px 13px" }}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4L16 6"/></svg>
                <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".05em" }}>Synchronisé depuis Axonaut</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
