"use client";

import { useState } from "react";
import { COLORS } from "@/lib/mock-data";

/**
 * Panneau Axonaut — visible dans la page Administration.
 * Permet à la Direction de :
 *   - Tester la connexion (clé API valide ?)
 *   - Lancer une synchronisation (récupère les devis validés)
 *
 * La clé API n'est JAMAIS visible côté client : tout passe par les routes /api/axonaut/*
 */

type SyncStatus = {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
  count?: number;
  syncedAt?: string;
};

export default function AxonautPanel() {
  const [testStatus, setTestStatus] = useState<SyncStatus>({ state: "idle" });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "idle" });

  const handleTest = async () => {
    setTestStatus({ state: "loading" });
    try {
      const r = await fetch("/api/axonaut/test", { cache: "no-store" });
      const data = await r.json();
      if (data.ok) {
        setTestStatus({
          state: "success",
          message: data.sample
            ? `Connexion OK · première entreprise : ${data.sample}`
            : "Connexion OK",
        });
      } else {
        setTestStatus({ state: "error", message: data.error || "Échec de la connexion" });
      }
    } catch (e) {
      setTestStatus({
        state: "error",
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  };

  const handleSync = async () => {
    setSyncStatus({ state: "loading" });
    try {
      const r = await fetch("/api/axonaut/sync", { cache: "no-store" });
      const data = await r.json();
      if (data.ok) {
        setSyncStatus({
          state: "success",
          count: data.count,
          syncedAt: data.synced_at,
          message: `${data.count} projet${data.count > 1 ? "s" : ""} synchronisé${data.count > 1 ? "s" : ""}`,
        });
      } else {
        setSyncStatus({ state: "error", message: data.error || "Échec de la synchro" });
      }
    } catch (e) {
      setSyncStatus({
        state: "error",
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  };

  return (
    <section style={{
      background: COLORS.blanc, borderRadius: 16,
      border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      marginBottom: 24,
    }}>
      <header style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${COLORS.grisBorder}`,
        background: COLORS.gris,
      }}>
        <h2 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 18, color: COLORS.noir, margin: "0 0 2px", fontWeight: 400,
        }}>Intégration Axonaut</h2>
        <p style={{ fontSize: 14, color: COLORS.grisMoyen, margin: 0 }}>
          Synchronisation des devis validés et création des factures
        </p>
      </header>

      <div style={{ padding: 20 }}>
        {/* Status clé API */}
        <div style={{
          padding: "10px 14px", marginBottom: 16,
          background: "#FFF8E1", border: "1px solid #FFE082",
          borderRadius: 8, fontSize: 14, color: COLORS.noir, lineHeight: 1.5,
        }}>
          <strong>⚠ Sécurité :</strong> la clé API est lue côté serveur uniquement
          (variable d&apos;environnement <code style={{ background: COLORS.blanc, padding: "1px 5px", borderRadius: 3 }}>AXONAUT_API_KEY</code>).
          Elle n&apos;est jamais exposée au navigateur. Pour la modifier : Vercel → Settings → Environment Variables.
        </div>

        {/* Test connexion */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.noir, marginBottom: 2 }}>
              1. Tester la connexion
            </div>
            <div style={{ fontSize: 13, color: COLORS.grisMoyen }}>
              Vérifie que la clé API est valide en faisant un appel léger à Axonaut.
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testStatus.state === "loading"}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${COLORS.grisBorder}`,
              background: COLORS.blanc, color: COLORS.noir,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: testStatus.state === "loading" ? 0.6 : 1,
            }}
          >
            {testStatus.state === "loading" ? "Test en cours…" : "Tester"}
          </button>
        </div>

        {testStatus.state !== "idle" && testStatus.state !== "loading" && (
          <StatusLine status={testStatus} />
        )}

        <div style={{ height: 1, background: COLORS.grisBorder, margin: "16px 0" }} />

        {/* Synchro projets */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.noir, marginBottom: 2 }}>
              2. Synchroniser les projets
            </div>
            <div style={{ fontSize: 13, color: COLORS.grisMoyen }}>
              Importe tous les devis validés / acceptés depuis Axonaut.
              Chaque ligne devient une tâche, le temps alloué est calculé via
              <code style={{ margin: "0 4px", background: COLORS.gris, padding: "1px 5px", borderRadius: 3 }}>marge ÷ 83€</code>.
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncStatus.state === "loading"}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: COLORS.noir, color: COLORS.dore,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: syncStatus.state === "loading" ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {syncStatus.state === "loading" ? "Synchronisation…" : "↻ Synchroniser"}
          </button>
        </div>

        {syncStatus.state !== "idle" && syncStatus.state !== "loading" && (
          <StatusLine status={syncStatus} />
        )}

        <div style={{
          marginTop: 20, padding: "10px 14px",
          background: COLORS.gris, borderRadius: 8,
          fontSize: 13, color: COLORS.grisMoyen, lineHeight: 1.5,
        }}>
          ℹ Pour l&apos;instant les projets synchronisés ne sont pas persistés (logs uniquement).
          Une fois Supabase branché, ils seront upserts dans la table <code style={{ background: COLORS.blanc, padding: "1px 4px", borderRadius: 3 }}>projets</code>.
        </div>
      </div>
    </section>
  );
}

function StatusLine({ status }: { status: SyncStatus }) {
  const isError = status.state === "error";
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 8,
      background: isError ? "#FFEBEE" : "#E8F5E9",
      border: `1px solid ${isError ? "#FFCDD2" : "#C8E6C9"}`,
      fontSize: 14, color: isError ? "#C62828" : "#2E7D32",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span>{isError ? "✗" : "✓"}</span>
      <span>{status.message}</span>
      {status.syncedAt && (
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#999" }}>
          {new Date(status.syncedAt).toLocaleTimeString("fr-FR")}
        </span>
      )}
    </div>
  );
}
