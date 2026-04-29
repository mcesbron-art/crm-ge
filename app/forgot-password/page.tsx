"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-noir-deep via-noir to-[#2a1f10] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#181818] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl tracking-wider text-dore">GROUPE ÉCHO</div>
          <div className="mt-1 text-[11px] uppercase tracking-[1.5px] text-[#666]">
            CRM Production
          </div>
        </div>

        {submitted ? (
          <>
            <h1 className="mb-3 font-display text-2xl text-white">Vérifiez votre email</h1>
            <p className="mb-6 text-sm text-[#aaa] leading-relaxed">
              Si l&apos;adresse <strong className="text-white">{email}</strong> correspond à un
              compte existant, vous recevrez un email avec un lien de réinitialisation dans les
              prochaines minutes.
            </p>
            <p className="mb-6 text-xs text-[#777] leading-relaxed">
              Pensez à vérifier votre dossier spam si l&apos;email n&apos;arrive pas.
              Le lien expire après 1 heure.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg border border-[#2a2a2a] bg-transparent px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#222]"
            >
              ← Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-1 font-display text-2xl text-white">Mot de passe oublié</h1>
            <p className="mb-6 text-sm text-[#888]">
              Entrez votre email, nous vous envoyons un lien pour réinitialiser votre mot de passe.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-rouge/40 bg-rouge/10 px-4 py-2.5 text-sm text-rouge">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-dore disabled:opacity-60"
                  placeholder="prenom@groupe-echo.fr"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-dore px-4 py-3 text-sm font-semibold text-noir transition hover:bg-dore-light disabled:opacity-60"
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-6 block text-center text-xs text-[#777] hover:text-dore"
            >
              ← Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
