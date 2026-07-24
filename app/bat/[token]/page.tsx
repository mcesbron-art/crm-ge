"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ValidationState =
  | { phase: "loading" }
  | { phase: "form"; token: string; projectName: string; clientName: string; batUrl: string; defaultAction: "approve" | "reject" | null }
  | { phase: "done"; action: "approve" | "reject" }
  | { phase: "already_done" }
  | { phase: "error"; message: string };

export default function BatResponsePage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const defaultAction = searchParams.get("action") as "approve" | "reject" | null;

  const [state, setState] = useState<ValidationState>({ phase: "loading" });
  const [action, setAction] = useState<"approve" | "reject" | null>(defaultAction);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/bat/info?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setState({ phase: "error", message: d.error }); return; }
        if (d.status !== "pending") { setState({ phase: "already_done" }); return; }
        setState({
          phase: "form",
          token,
          projectName: d.project_name,
          clientName:  d.client_name,
          batUrl:      d.bat_url,
          defaultAction,
        });
        if (defaultAction) setAction(defaultAction);
      })
      .catch(() => setState({ phase: "error", message: "Impossible de charger les informations." }));
  }, [token, defaultAction]);

  const submit = async () => {
    if (!action) return;
    if (action === "reject" && !comment.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/bat/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action, comment: comment.trim() || undefined }),
    });
    if (res.ok) {
      setState({ phase: "done", action });
    } else {
      const d = await res.json();
      if (d.error?.includes("déjà été traité")) {
        setState({ phase: "already_done" });
      } else {
        setState({ phase: "error", message: d.error ?? "Erreur inconnue" });
      }
    }
    setSubmitting(false);
  };

  const base: React.CSSProperties = {
    minHeight: "100vh", background: "#F5F5F2",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };

  if (state.phase === "loading") {
    return (
      <div style={base}>
        <div style={{ textAlign: "center", color: "#8C8B83" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ margin: 0, fontSize: 15 }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (state.phase === "already_done") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "40px 36px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#1C1B16" }}>Déjà traité</h2>
          <p style={{ margin: 0, fontSize: 16, color: "#8C8B83" }}>Votre réponse pour ce BAT a déjà été enregistrée. Merci !</p>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "40px 36px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#1C1B16" }}>Lien invalide</h2>
          <p style={{ margin: 0, fontSize: 16, color: "#8C8B83" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "40px 36px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{state.action === "approve" ? "🎉" : "📝"}</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: state.action === "approve" ? "#1F8A5B" : "#C2410C" }}>
            {state.action === "approve" ? "BAT accepté !" : "BAT refusé"}
          </h2>
          <p style={{ margin: 0, fontSize: 16, color: "#8C8B83", lineHeight: 1.55 }}>
            {state.action === "approve"
              ? "Votre validation a bien été enregistrée. L'équipe Groupe Écho va passer votre projet en production."
              : "Votre refus a bien été enregistré. L'équipe Groupe Écho prendra en compte vos remarques et vous recontactera."}
          </p>
        </div>
      </div>
    );
  }

  // phase === "form"
  const { projectName, clientName, batUrl } = state;

  return (
    <div style={base}>
      <div style={{ background: "#fff", borderRadius: 18, maxWidth: 540, width: "100%", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.12)" }}>
        {/* Header */}
        <div style={{ background: "#0A0A0A", padding: "24px 32px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "#9A9078", letterSpacing: ".1em", textTransform: "uppercase" }}>Groupe Écho · Validation BAT</p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#F4ECD7", lineHeight: 1.2 }}>{projectName}</h1>
          {clientName && <p style={{ margin: "6px 0 0", fontSize: 15, color: "#9A9078" }}>{clientName}</p>}
        </div>

        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* BAT link */}
          <a href={batUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 12, background: "#F5F5F2", border: "1px solid #E5E4DD", borderRadius: 12, padding: "14px 18px", textDecoration: "none", color: "#1C1B16" }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Consulter le BAT</div>
              <div style={{ fontSize: 14, color: "#8C8B83", marginTop: 2 }}>Ouvre dans un nouvel onglet</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 18, color: "#A6A498" }}>→</span>
          </a>

          {/* Choice buttons */}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".06em" }}>Votre décision</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["approve", "reject"] as const).map(a => {
                const on = action === a;
                const isApprove = a === "approve";
                return (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    style={{
                      padding: "14px 16px", borderRadius: 12, fontFamily: "inherit",
                      fontSize: 16, fontWeight: 700, cursor: "pointer",
                      border: `2px solid ${on ? (isApprove ? "#1F8A5B" : "#C2410C") : "#E5E4DD"}`,
                      background: on ? (isApprove ? "#E7F3EB" : "#FBEAE0") : "#fff",
                      color: on ? (isApprove ? "#1F8A5B" : "#C2410C") : "#5C5A52",
                      transition: "all .15s",
                    }}
                  >
                    {isApprove ? "✓ Accepter le BAT" : "✗ Refuser le BAT"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment (toujours visible, obligatoire si reject) */}
          {action && (
            <div>
              <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#5C5A52", marginBottom: 8 }}>
                Commentaire {action === "reject" ? <span style={{ color: "#C2410C" }}>*</span> : <span style={{ color: "#A6A498", fontWeight: 400 }}>(optionnel)</span>}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={action === "reject" ? "Indiquez vos remarques ou corrections demandées…" : "Un commentaire à ajouter ? (optionnel)"}
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", background: "#fff", border: `1.5px solid ${action === "reject" && !comment.trim() ? "#F0C5B0" : "#E5E4DD"}`, borderRadius: 10, padding: "10px 13px", outline: "none", resize: "vertical" }}
              />
              {action === "reject" && !comment.trim() && (
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "#C2410C" }}>Un commentaire est obligatoire en cas de refus.</p>
              )}
            </div>
          )}

          {/* Submit */}
          {action && (
            <button
              onClick={submit}
              disabled={submitting || (action === "reject" && !comment.trim())}
              style={{
                padding: "14px 24px", borderRadius: 12, fontFamily: "inherit",
                fontSize: 15, fontWeight: 700, cursor: submitting ? "wait" : "pointer",
                border: "none", width: "100%",
                background: action === "approve" ? "#1F8A5B" : "#C2410C",
                color: "#fff", opacity: (submitting || (action === "reject" && !comment.trim())) ? 0.6 : 1,
                transition: "opacity .15s",
              }}
            >
              {submitting ? "Envoi en cours…" : action === "approve" ? "✓ Confirmer l'acceptation" : "✗ Confirmer le refus"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
