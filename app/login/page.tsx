"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Identifiants invalides");
        setLoading(false);
        return;
      }

      // Auth réussie : redirige vers le dashboard
      router.push("/dashboard");
      router.refresh(); // force rechargement du layout server (qui lit la session)
    } catch {
      setError("Erreur de connexion au serveur");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-noir-deep via-noir to-[#2a1f10] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#181818] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="font-display text-3xl tracking-wider text-dore">
            GROUPE ÉCHO
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[1.5px] text-[#666]">
            CRM Production
          </div>
        </div>

        <h1 className="mb-1 font-display text-2xl text-white">Connexion</h1>
        <p className="mb-6 text-sm text-[#888]">
          Accédez à votre espace de pilotage.
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

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-dore disabled:opacity-60"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-dore px-4 py-3 text-sm font-semibold text-noir transition hover:bg-dore-light disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#555]">
          Mot de passe oublié ? Contactez la Direction.
        </p>
      </div>
    </div>
  );
}
