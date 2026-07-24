"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TASK_BILLING_TYPE_LABEL, TASK_BILLING_STATUSES, TASK_BILLING_STATUS_LABEL, TASK_BILLING_STATUS_COLOR,
} from "@/lib/task-taxonomy";

type BillingRequest = {
  id: string; taskId: string; taskLabel: string; taskDueDate: string | null;
  projectName: string; projectClient: string;
  billingType: string; billingStatus: string;
  adminComment: string | null;
  requestedBy: { id: string; nom: string; color: string | null } | null;
  requestedAt: string;
  processedByNom: string | null; processedAt: string | null;
};

type Event = {
  id: string; action: string; oldValue: string | null; newValue: string | null;
  comment: string | null; createdAt: string; actorNom: string; actorColor: string;
};

type Props = {
  requestId: string;
  onClose: () => void;
  onUpdated: () => void;
};

const IconX = () => (<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>);

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function dueUrgency(dueDate: string | null): "over" | "soon" | "ok" | "none" {
  if (!dueDate) return "none";
  const diff = (new Date(dueDate).getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "over";
  if (diff <= 3) return "soon";
  return "ok";
}

const EVENT_LABEL: Record<string, string> = {
  billing_requested: "Demande créée",
  billing_status_changed: "Statut modifié",
  billing_comment_changed: "Commentaire modifié",
};

function eventValueLabel(action: string, value: string | null): string {
  if (value === null) return "—";
  if (action === "billing_status_changed") return TASK_BILLING_STATUS_LABEL[value] ?? value;
  return value;
}

/**
 * Panneau latéral admin. La facture elle-même se fait dans Axonaut : ce
 * panneau ne pilote qu'un statut d'avancement (pastilles cliquables,
 * enregistrement immédiat — pas de bouton "Enregistrer" global) et un
 * commentaire comptable optionnel (son propre petit bouton d'enregistrement,
 * puisqu'un champ texte ne peut pas s'auto-sauvegarder à chaque frappe). Le
 * collaborateur n'a jamais accès à cet écran (route /api/billing/[id]
 * réservée à manage_billing).
 */
export default function BillingRequestDrawer({ requestId, onClose, onUpdated }: Props) {
  const [request, setRequest] = useState<BillingRequest | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminComment, setAdminComment] = useState("");
  const [initialComment, setInitialComment] = useState("");

  // loadSeq ignore toute réponse qui n'est plus la plus récente requête
  // émise — sans ça, un fetch lent revenu tard écraserait un état plus
  // frais (statut ou commentaire changé entretemps) avec des données
  // périmées. resetForm=false (après un save) ne touche qu'aux champs
  // d'affichage (request, events), jamais au formulaire local.
  const loadSeq = useRef(0);
  const load = useCallback((resetForm: boolean) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    return fetch(`/api/billing/${requestId}`)
      .then(r => r.json())
      .then((d: { request?: BillingRequest; events?: Event[] }) => {
        if (seq !== loadSeq.current) return;
        if (d.request) {
          setRequest(d.request);
          if (resetForm) {
            const comment = d.request.adminComment ?? "";
            setAdminComment(comment);
            setInitialComment(comment);
          }
        }
        if (Array.isArray(d.events)) setEvents(d.events);
      })
      .finally(() => { if (seq === loadSeq.current) setLoading(false); });
  }, [requestId]);

  useEffect(() => { load(true); }, [load]);

  const changeStatus = async (status: string) => {
    if (!request || status === request.billingStatus || savingStatus) return;
    setSavingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_status: status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de l'enregistrement");
      }
      await load(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    } finally {
      setSavingStatus(false);
    }
  };

  const commentDirty = adminComment.trim() !== initialComment;

  const saveComment = async () => {
    if (!commentDirty || savingComment) return;
    setSavingComment(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_comment: adminComment.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de l'enregistrement");
      }
      await load(true);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    } finally {
      setSavingComment(false);
    }
  };

  const urgency = request ? dueUrgency(request.taskDueDate) : "none";
  const dueCardBg = urgency === "over" ? "#FBEAE0" : urgency === "soon" ? "#FBF1E8" : "#fff";
  const dueCardBorder = urgency === "over" ? "#F0C5B0" : urgency === "soon" ? "#F0D9C5" : "#ECEBE4";
  const dueCardLabelColor = urgency === "over" || urgency === "soon" ? "#C2410C" : "#A6A498";
  const dueCardColor = urgency === "over" ? "#DC2626" : urgency === "soon" ? "#C2410C" : "#5C5A52";
  const statusColor = request ? (TASK_BILLING_STATUS_COLOR[request.billingStatus] ?? TASK_BILLING_STATUS_COLOR.a_facturer) : "#8C8B83";

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", zIndex: 90, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Détail de la demande de facturation" className="modal-slide-in" style={{ width: 520, maxWidth: "100%", height: "100%", background: "#F5F5F2", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ background: "#0A0A0A", padding: "22px 24px 20px", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)" }} />
          <span onClick={onClose} style={{ position: "absolute", top: 18, right: 18, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
          {request && (
            <span data-testid="billing-status-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: statusColor, background: `${statusColor}26`, borderRadius: 99, padding: "3px 10px", position: "relative" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
              {TASK_BILLING_STATUS_LABEL[request.billingStatus] ?? request.billingStatus}
            </span>
          )}
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 800, color: "#F4ECD7", marginTop: 12, lineHeight: 1.25, position: "relative" }}>{request?.taskLabel ?? "…"}</div>
          {request && (
            <div style={{ fontSize: 15, color: "#AEA890", marginTop: 5, position: "relative" }}>
              {request.projectClient ? `${request.projectClient} · ` : ""}{request.projectName}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {loading || !request ? (
            <div style={{ textAlign: "center", color: "#A6A498", padding: 30 }}>Chargement…</div>
          ) : (
            <>
              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", background: request.requestedBy?.color ?? "#8C846F", flex: "none" }}>{getInitials(request.requestedBy?.nom ?? "—")}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16" }}>{request.requestedBy?.nom ?? "—"}</div>
                  <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 1 }}>Demandeur</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 12, padding: 13 }}>
                  <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Date de la demande</div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1B16", marginTop: 6 }}>{fmtDate(request.requestedAt)}</div>
                </div>
                <div style={{ background: dueCardBg, border: `1px solid ${dueCardBorder}`, borderRadius: 12, padding: 13 }}>
                  <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: dueCardLabelColor, fontWeight: 700 }}>Échéance</div>
                  <div style={{ fontSize: 16.5, fontWeight: 800, color: dueCardColor, marginTop: 6 }}>{request.taskDueDate ? fmtDate(request.taskDueDate) : "—"}</div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Client / Projet</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>{request.projectClient ? `${request.projectClient} · ` : ""}{request.projectName}</div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Type de demande</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1C1B16" }}>{TASK_BILLING_TYPE_LABEL[request.billingType] ?? request.billingType}</div>
              </div>

              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Statut · changer ici</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {TASK_BILLING_STATUSES.map(s => {
                    const on = request.billingStatus === s.value;
                    const c = TASK_BILLING_STATUS_COLOR[s.value];
                    return (
                      <span
                        key={s.value}
                        onClick={() => changeStatus(s.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600,
                          color: on ? "#fff" : c, background: on ? c : `${c}1A`, border: `1px solid ${on ? c : "transparent"}`,
                          borderRadius: 8, padding: "6px 11px", cursor: savingStatus ? "default" : "pointer", opacity: savingStatus && !on ? 0.5 : 1,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: on ? "#fff" : c }} />
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 14, padding: "15px 16px" }}>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 9 }}>Commentaire comptable</div>
                <textarea
                  value={adminComment} onChange={e => setAdminComment(e.target.value)} rows={3}
                  placeholder="Visible par le collaborateur, ex. précision utile sur la facturation…"
                  style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#FBFAF6", border: "1px solid #E2E1DA", borderRadius: 9, padding: "9px 12px", outline: "none", resize: "vertical" }}
                />
                {commentDirty && (
                  <span
                    onClick={saveComment}
                    style={{ display: "inline-flex", marginTop: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: savingComment ? "#8C846F" : "#0A0A0A", borderRadius: 99, padding: "6px 13px", cursor: savingComment ? "default" : "pointer" }}
                  >{savingComment ? "Enregistrement…" : "Enregistrer le commentaire"}</span>
                )}
              </div>

              {error && (
                <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
              )}

              <div>
                <div style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, marginBottom: 10 }}>Historique</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 15, color: "#A6A498", textAlign: "center", padding: "12px 0" }}>Aucun événement</div>
                  ) : events.map(ev => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, background: "#fff", border: "1px solid #ECEBE4", borderRadius: 10, padding: "10px 13px" }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: ev.actorColor, flex: "none" }}>{getInitials(ev.actorNom)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1B16" }}>{ev.actorNom} · {EVENT_LABEL[ev.action] ?? ev.action}</div>
                        {ev.action === "billing_comment_changed" ? (
                          ev.newValue && <div style={{ fontSize: 14, color: "#5C5A52", marginTop: 3 }}>{ev.newValue}</div>
                        ) : (
                          <div style={{ fontSize: 13.5, color: "#8C8B83", marginTop: 2 }}>
                            {eventValueLabel(ev.action, ev.oldValue)} → {eventValueLabel(ev.action, ev.newValue)}
                          </div>
                        )}
                        <div style={{ fontSize: 12.5, color: "#B4B2A7", marginTop: 3 }}>{fmtDateTime(ev.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 24px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9", flex: "none" }}>
          <button onClick={onClose} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15, fontWeight: 700, padding: 11, borderRadius: 10, cursor: "pointer", border: "none", fontFamily: "inherit" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export function BillingStatusBadge({ status }: { status: string }) {
  const color = TASK_BILLING_STATUS_COLOR[status] ?? TASK_BILLING_STATUS_COLOR.a_facturer;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color, background: `${color}1A`, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />
      {TASK_BILLING_STATUS_LABEL[status] ?? status}
    </span>
  );
}
