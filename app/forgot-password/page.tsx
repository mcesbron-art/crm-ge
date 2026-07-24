"use client";

import { useState } from "react";
import Link from "next/link";

const GOLD_GRADIENT = "linear-gradient(135deg,#E0BC68,#A47E2A)";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, color: "#1C1B16", padding: "13px 0" };

  async function submit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSent(true);
    } catch {
      setError("Erreur de connexion au serveur");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", background: "#0A0A0A", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes geFloat2 { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
        @keyframes geGlow2  { 0%,100% { opacity:.55; } 50% { opacity:.9; } }
        @keyframes geSpin2  { to { transform:rotate(360deg); } }
        #ge-forgot input::placeholder { color:#A6A498; }
      `}</style>

      {/* ══ LEFT — BRAND PANEL ══ */}
      <div style={{ flex: 1.05, position: "relative", overflow: "hidden", background: "#0A0A0A", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 56px", minWidth: 0 }}>
        <div style={{ position: "absolute", top: -160, left: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.22),transparent 66%)", animation: "geGlow2 7s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -200, right: -160, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.13),transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "38%", left: "44%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(140,106,32,.14),transparent 70%)", animation: "geFloat2 9s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 20, border: "1px solid rgba(201,162,78,.14)", borderRadius: 22, pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-groupe-echo.png" alt="Groupe Écho — Communication | Formation | Événementiel" style={{ width: 186, height: "auto", display: "block" }} />
        </div>

        <div style={{ position: "relative", maxWidth: 440 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(201,162,78,.3)", borderRadius: 99, padding: "6px 14px", marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9A24E", boxShadow: "0 0 10px #C9A24E" }} />
            <span style={{ fontSize: 13.5, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700, color: "#D9BE7E" }}>CRM · Groupe Écho</span>
          </div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 52, lineHeight: 1.08, fontWeight: 800, color: "#F4ECD7", margin: 0, letterSpacing: "-.02em" }}>
            Un accès<br />sécurisé,<br /><span style={{ fontStyle: "italic", color: "#D9BE7E" }}>toujours</span> à portée de main.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#9A968A", margin: "22px 0 0", maxWidth: 400 }}>
            Renseignez votre e-mail professionnel et nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={{ fontSize: 14, color: "#6E6A5E", letterSpacing: ".04em" }}>© 2026 Groupe Écho</span>
            <span style={{ fontSize: 14, color: "#6E6A5E", cursor: "pointer" }}>Confidentialité</span>
            <span style={{ fontSize: 14, color: "#6E6A5E", cursor: "pointer" }}>Aide</span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — FORM PANEL ══ */}
      <div id="ge-forgot" style={{ flex: 1, background: "#F5F5F2", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 404 }}>

          {!sent ? (
            <>
              <div style={{ marginBottom: 30 }}>
                <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#8C8B83", textDecoration: "none", marginBottom: 16 }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5 7 10l5 5" /></svg>
                  Retour à la connexion
                </Link>
                <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 31, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Mot de passe oublié</h2>
                <p style={{ fontSize: 16, color: "#8C8B83", margin: "8px 0 0", lineHeight: 1.5 }}>
                  Indiquez votre adresse e-mail professionnelle, nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div style={{ marginBottom: 18, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: "#5C5A52", display: "block", marginBottom: 7 }}>Adresse e-mail</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${emailFocus ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 11, padding: "0 13px", transition: "border-color .15s ease,box-shadow .15s ease", boxShadow: emailFocus ? "0 0 0 3px rgba(201,162,78,.15)" : "0 1px 2px rgba(20,20,15,.03)" }}>
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="3" y="5" width="14" height="10" rx="2" /><path d="M3.5 6l6.5 5 6.5-5" /></svg>
                    <input
                      type="email"
                      value={email}
                      placeholder="prenom@groupe-echo.fr"
                      autoComplete="username"
                      required
                      disabled={submitting}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocus(true)}
                      onBlur={() => setEmailFocus(false)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: GOLD_GRADIENT, color: "#1A1206", fontSize: 16.5, fontWeight: 700, padding: 13, borderRadius: 11, cursor: submitting ? "default" : "pointer", border: "none", fontFamily: "inherit", boxShadow: "0 10px 24px -12px rgba(201,162,78,.7)", transition: "transform .12s ease" }}
                >
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 15, height: 15, border: "2px solid rgba(26,18,6,.3)", borderTopColor: "#1A1206", borderRadius: "50%", display: "inline-block", animation: "geSpin2 .7s linear infinite" }} />
                      Envoi…
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      Envoyer le lien
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#1A1206" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11" /><path d="M10 5l5 5-5 5" /></svg>
                    </span>
                  )}
                </button>
              </form>

              <p style={{ textAlign: "center", fontSize: 15, color: "#8C8B83", margin: "26px 0 0" }}>
                Besoin d&apos;aide ? <span style={{ color: "#B0892B", fontWeight: 700, cursor: "pointer" }}>Contacter l&apos;administrateur</span>
              </p>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <span style={{ width: 64, height: 64, borderRadius: "50%", background: "#E7F3EB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                <svg width="30" height="30" viewBox="0 0 20 20" fill="none" stroke="#1F8A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>
              </span>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>E-mail envoyé</h2>
              <p style={{ fontSize: 15, color: "#8C8B83", margin: "10px 0 0", lineHeight: 1.55, maxWidth: 340 }}>
                Si un compte existe pour <strong style={{ color: "#33322C" }}>{email || "votre adresse"}</strong>, un lien de réinitialisation vient d&apos;être envoyé. Vérifiez également vos spams.
              </p>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                style={{ marginTop: 26, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 10, cursor: submitting ? "default" : "pointer", fontFamily: "inherit" }}
              >
                {submitting ? "Envoi…" : "Renvoyer l'e-mail"}
              </button>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#B0892B", textDecoration: "none", marginTop: 20 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5 7 10l5 5" /></svg>
                Retour à la connexion
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
