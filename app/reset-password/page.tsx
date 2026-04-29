"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Page de réinitialisation du mot de passe — appelée via le lien magique
 * envoyé par Supabase à la suite d'une demande "mot de passe oublié".
 *
 * Supporte deux formats de retour Supabase :
 *   1. Flow PKCE (récent) : ?code=xxxxx → on appelle exchangeCodeForSession(code)
 *   2. Flow legacy (hash) : #access_token=...&type=recovery → géré par getSession()
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
    const supabase = createSupabaseBrowserClient();
    const code = searchParams.get("code");

    async function init() {
      // 1. Si on a un ?code=... → flow PKCE : échange le code contre une session
      if (code) {
        try {
          const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setHasSession(false);
            setDebugInfo(`Échange du code échoué : ${exErr.message}`);
            return;
          }
          if (data?.session) {
            setHasSession(true);
            return;
          }
        } catch (e) {
          setHasSession(false);
          setDebugInfo(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
          return;
        }
      }

      // 2. Sinon, vérifie s'il y a déjà une session active (flow hash legacy)
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      if (!data.session) {
        setDebugInfo("Aucune session de réinitialisation détectée. Lien expiré ou invalide.");
      }
    }

    init();
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
          <h1 className="mb-3 font-display text-2xl text-white">Lien expiré ou invalide</h1>
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
          <h1 className="mb-3 font-display text-2xl text-white">Mot de passe mis à jour ✓</h1>
          <p className="mb-2 text-sm text-[#aaa]">
            Vous allez être redirigé(e) vers votre Dashboard…
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-1 font-display text-2xl text-white">Nouveau mot de passe</h1>
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
        <div className="mb-8 text-center">
          <div className="font-display text-3xl tracking-wider text-dore">GROUPE ÉCHO</div>
          <div className="mt-1 text-[11px] uppercase tracking-[1.5px] text-[#666]">
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
