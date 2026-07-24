"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Page de réinitialisation du mot de passe — atteinte APRÈS l'échange du
 * code PKCE, déjà effectué côté serveur par app/auth/reset-callback/route.ts
 * (le lien de l'email pointe vers ce callback, qui redirige ici une fois la
 * session posée). Cette page n'a donc qu'à vérifier qu'une session existe
 * via getSession() — elle ne reçoit plus jamais de ?code= à échanger
 * elle-même : le faire côté navigateur cassait avec "PKCE code verifier not
 * found in storage" (le client navigateur ne retrouve pas toujours, via
 * document.cookie, le code verifier posé par l'appel serveur initial).
 */

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      setHasSession(false);
      setDebugInfo(
        callbackError === "missing_code"
          ? "Lien incomplet (aucun code de réinitialisation)."
          : "L'échange du code de réinitialisation a échoué côté serveur."
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      if (!data.session) {
        setDebugInfo("Aucune session de réinitialisation détectée. Lien expiré ou invalide.");
      }
    });
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      {hasSession === false ? (
        <>
          <h1 className="mb-3 text-2xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 800 }}>Lien expiré ou invalide</h1>
          <p className="mb-4 text-sm text-[#aaa] leading-relaxed">
            Le lien de réinitialisation a expiré (ils sont valides 1h) ou a déjà été utilisé.
          </p>
          {debugInfo && (
            <p className="mb-6 text-xs text-[#666] font-mono break-all">{debugInfo}</p>
          )}
          <Link
            href="/forgot-password"
            className="block w-full rounded-lg bg-dore px-4 py-3 text-center text-sm font-semibold text-noir transition hover:bg-dore-light"
          >
            Demander un nouveau lien
          </Link>
        </>
      ) : done ? (
        <>
          <h1 className="mb-3 text-2xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 800 }}>Mot de passe mis à jour ✓</h1>
          <p className="mb-2 text-sm text-[#aaa]">
            Vous allez être redirigé(e) vers votre Dashboard…
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-2xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 800 }}>Nouveau mot de passe</h1>
          <p className="mb-6 text-sm text-[#888]">
            Choisissez un mot de passe d&apos;au moins 8 caractères.
          </p>

          {hasSession === null && (
            <div className="mb-4 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-2.5 text-sm text-[#888]">
              Vérification du lien…
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-rouge/40 bg-rouge/10 px-4 py-2.5 text-sm text-rouge">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || hasSession !== true}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-dore disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
                Confirmation
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading || hasSession !== true}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-dore disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || hasSession !== true}
              className="mt-2 w-full rounded-lg bg-dore px-4 py-3 text-sm font-semibold text-noir transition hover:bg-dore-light disabled:opacity-60"
            >
              {loading ? "Mise à jour…" : "Définir le mot de passe"}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-noir-deep via-noir to-[#2a1f10] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#181818] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-groupe-echo.png" alt="Groupe Écho" style={{ width: 160, height: "auto", display: "block" }} />
          <div className="mt-2 text-[11px] uppercase tracking-[1.5px] text-[#666]">
            CRM Production
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <Shell>
      <p className="text-sm text-[#888]">Chargement…</p>
    </Shell>
  );
}
