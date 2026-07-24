"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  domain:  "Accès réservé aux membres de Groupe Écho (@groupe-echo.fr).",
  profile: "Compte désactivé ou profil manquant. Contactez un administrateur.",
  oauth:   "Erreur lors de la connexion avec Google. Réessayez.",
};

const GOLD_GRADIENT = "linear-gradient(135deg,#E0BC68,#A47E2A)";
const DONE_GRADIENT = "linear-gradient(135deg,#8FD3A8,#3FA974)";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 10S5.5 4.5 10 4.5c1.6 0 3 .6 4.2 1.4M17.5 10s-1 1.8-2.9 3.3M8 5c-3.4 1-5.5 5-5.5 5" />
      <line x1="3.5" y1="3.5" x2="16.5" y2="16.5" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err && OAUTH_ERROR_MESSAGES[err]) setError(OAUTH_ERROR_MESSAGES[err]);
  }, []);

  const inputStyle: React.CSSProperties = { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, color: "#1C1B16", padding: "13px 0" };

  const signInWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "groupe-echo.fr", prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const submit = async () => {
    if (submitting || done) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pw }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Identifiants invalides");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch {
      setError("Erreur de connexion au serveur");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", background: "#0A0A0A", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes geFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
        @keyframes geGlow  { 0%,100% { opacity:.55; } 50% { opacity:.9; } }
        @keyframes geSpin  { to { transform:rotate(360deg); } }
        #ge-login input::placeholder { color:#A6A498; }
      `}</style>

      {/* ══ LEFT — BRAND PANEL ══ */}
      <div style={{ flex: 1.05, position: "relative", overflow: "hidden", background: "#0A0A0A", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 56px", minWidth: 0 }}>
        {/* ambient glows */}
        <div style={{ position: "absolute", top: -160, left: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.22),transparent 66%)", animation: "geGlow 7s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -200, right: -160, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.13),transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "38%", left: "44%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(140,106,32,.14),transparent 70%)", animation: "geFloat 9s ease-in-out infinite", pointerEvents: "none" }} />
        {/* hairline frame */}
        <div style={{ position: "absolute", inset: 20, border: "1px solid rgba(201,162,78,.14)", borderRadius: 22, pointerEvents: "none" }} />

        {/* logo */}
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-groupe-echo.png" alt="Groupe Écho — Communication | Formation | Événementiel" style={{ width: 186, height: "auto", display: "block" }} />
        </div>

        {/* centrepiece */}
        <div style={{ position: "relative", maxWidth: 440 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(201,162,78,.3)", borderRadius: 99, padding: "6px 14px", marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9A24E", boxShadow: "0 0 10px #C9A24E" }} />
            <span style={{ fontSize: 13.5, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700, color: "#D9BE7E" }}>CRM interne · Production</span>
          </div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 52, lineHeight: 1.08, fontWeight: 800, color: "#F4ECD7", margin: 0, letterSpacing: "-.02em" }}>
            Pilotez chaque<br />projet, du <span style={{ fontStyle: "italic", color: "#D9BE7E" }}>brief</span><br />à la facturation.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#9A968A", margin: "22px 0 0", maxWidth: 400 }}>
            L&apos;espace de travail des équipes Groupe Écho — Communication, Formation, Événementiel. Suivi des projets, clients et devis en un seul endroit.
          </p>
        </div>

        {/* footer meta */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={{ fontSize: 14, color: "#6E6A5E", letterSpacing: ".04em" }}>© 2026 Groupe Écho</span>
            <span style={{ fontSize: 14, color: "#6E6A5E", cursor: "pointer" }}>Confidentialité</span>
            <span style={{ fontSize: 14, color: "#6E6A5E", cursor: "pointer" }}>Aide</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "#6E6A5E", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "6px 11px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3FBF77" }} />CRM · Groupe Écho
          </div>
        </div>
      </div>

      {/* ══ RIGHT — FORM PANEL ══ */}
      <div id="ge-login" style={{ flex: 1, background: "#F5F5F2", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 404 }}>

          <div style={{ marginBottom: 30 }}>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 31, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Connexion</h2>
            <p style={{ fontSize: 16, color: "#8C8B83", margin: "8px 0 0" }}>Accédez à votre espace de travail Groupe Écho.</p>
          </div>

          {error && (
            <div style={{ marginBottom: 18, background: "#FBEAE0", border: "1px solid #F0B08A", color: "#9A3412", fontSize: 15, fontWeight: 600, padding: "10px 14px", borderRadius: 10 }}>
              {error}
            </div>
          )}

          {/* SSO */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading || submitting || done}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 16, fontWeight: 600, padding: 12, borderRadius: 11, cursor: googleLoading ? "default" : "pointer", fontFamily: "inherit", boxShadow: "0 1px 2px rgba(20,20,15,.04)", opacity: googleLoading ? .7 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {googleLoading ? "Redirection…" : "Continuer avec Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
            <span style={{ flex: 1, height: 1, background: "#E2E1DA" }} />
            <span style={{ fontSize: 14, color: "#A6A498", fontWeight: 500 }}>ou par e-mail</span>
            <span style={{ flex: 1, height: 1, background: "#E2E1DA" }} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {/* email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: "#5C5A52", display: "block", marginBottom: 7 }}>Adresse e-mail</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${emailFocus ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 11, padding: "0 13px", transition: "border-color .15s ease,box-shadow .15s ease", boxShadow: emailFocus ? "0 0 0 3px rgba(201,162,78,.15)" : "0 1px 2px rgba(20,20,15,.03)" }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="3" y="5" width="14" height="10" rx="2" /><path d="M3.5 6l6.5 5 6.5-5" /></svg>
                <input
                  type="email"
                  value={email}
                  placeholder="prenom@groupe-echo.fr"
                  autoComplete="username"
                  required
                  disabled={submitting || done}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* password */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: "#5C5A52" }}>Mot de passe</label>
                <Link href="/forgot-password" style={{ fontSize: 14, fontWeight: 600, color: "#B0892B", cursor: "pointer", textDecoration: "none" }}>Mot de passe oublié ?</Link>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${pwFocus ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 11, padding: "0 13px", transition: "border-color .15s ease,box-shadow .15s ease", boxShadow: pwFocus ? "0 0 0 3px rgba(201,162,78,.15)" : "0 1px 2px rgba(20,20,15,.03)" }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" /></svg>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting || done}
                  onChange={(e) => setPw(e.target.value)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  style={inputStyle}
                />
                <span onClick={() => setShowPw(s => !s)} style={{ cursor: "pointer", color: "#A6A498", flex: "none", display: "flex" }}>
                  <EyeIcon open={showPw} />
                </span>
              </div>
            </div>

            {/* remember */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22, cursor: "pointer" }} onClick={() => setRemember(r => !r)}>
              <span style={{ width: 19, height: 19, borderRadius: 6, border: `2px solid ${remember ? "#C9A24E" : "#CFCDC4"}`, background: remember ? "#C9A24E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", transition: "all .15s ease" }}>
                {remember && <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#1A1206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>}
              </span>
              <span style={{ fontSize: 15, color: "#5C5A52", fontWeight: 500 }}>Rester connecté sur cet appareil</span>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={submitting || done}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: done ? DONE_GRADIENT : GOLD_GRADIENT, color: "#1A1206", fontSize: 16.5, fontWeight: 700, padding: 13, borderRadius: 11, cursor: submitting || done ? "default" : "pointer", border: "none", fontFamily: "inherit", boxShadow: "0 10px 24px -12px rgba(201,162,78,.7)", transition: "transform .12s ease" }}
            >
              {done ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#1A1206" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 8 14l8-8.5" /></svg>
                  Connecté
                </span>
              ) : submitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 15, height: 15, border: "2px solid rgba(26,18,6,.3)", borderTopColor: "#1A1206", borderRadius: "50%", display: "inline-block", animation: "geSpin .7s linear infinite" }} />
                  Connexion…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  Se connecter
                  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#1A1206" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11" /><path d="M10 5l5 5-5 5" /></svg>
                </span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
