import { NextRequest, NextResponse } from "next/server";
import { listContractsSince, AxonautError } from "@/lib/axonaut";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60; // 60 s max sur Vercel Hobby

// ---------------------------------------------------------------------------
// Sécurité : Vercel Cron ajoute automatiquement "Authorization: Bearer <CRON_SECRET>"
// CRON_SECRET doit être défini dans les variables d'environnement Vercel.
// ---------------------------------------------------------------------------
function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[contracts-sync] CRON_SECRET non configuré — route bloquée.");
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Convertit une date ISO (ou datetime) en format DD/MM/YYYY pour l'API Axonaut
function toAxonautDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

// Normalise les dates renvoyées par Axonaut → YYYY-MM-DD pour Supabase (type DATE)
function toSupabaseDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  // Déjà au format YYYY-MM-DD ou ISO datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  // Format DD/MM/YYYY
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const created: number[] = [];
  const skipped: number[] = [];
  const errors: { id: number; error: string }[] = [];

  try {
    // 1. Lire la date de dernière synchro réussie
    const { data: stateRow, error: stateErr } = await supabase
      .from("sync_state")
      .select("value")
      .eq("key", "axonaut_last_synced_at")
      .single();

    if (stateErr) {
      throw new Error(`Lecture sync_state échouée : ${stateErr.message}`);
    }

    const lastSyncedAt = stateRow?.value ?? "2020-01-01T00:00:00.000Z";
    const updatedAfter = toAxonautDate(lastSyncedAt);

    console.log(`[contracts-sync] Démarrage. Filtre updated_after=${updatedAfter}`);

    // 2. Récupérer les commandes Axonaut (pagination automatique via axonautFetchAll)
    const contracts = await listContractsSince(updatedAfter);

    console.log(`[contracts-sync] ${contracts.length} commande(s) reçue(s) d'Axonaut.`);

    // 3. Récupérer en une requête les IDs déjà présents en base
    const incomingIds = contracts.map((c) => c.id);
    const { data: existingRows } = await supabase
      .from("projects")
      .select("axonaut_contract_id")
      .in("axonaut_contract_id", incomingIds);

    const existingIds = new Set(
      (existingRows ?? []).map((r) => r.axonaut_contract_id as number)
    );

    const toInsert = contracts
      .filter((c) => {
        if (existingIds.has(c.id)) { skipped.push(c.id); return false; }
        return true;
      })
      .map((c) => {
        const clientName  = c.company?.name ?? "Client inconnu";
        const projectName = c.project?.name?.trim() || `Projet ${clientName}`;
        return {
          axonaut_contract_id:  c.id,
          axonaut_quotation_id: c.quotation?.id ?? null,
          name:                 projectName,
          client_name:          clientName,
          status:               "brief",
          created_via:          "axonaut",
          start_date:           toSupabaseDate(c.start_date),
          due_date:             toSupabaseDate(c.expected_delivery_date),
        };
      });

    // 4. Batch INSERT unique (ON CONFLICT DO NOTHING en cas de doublon résiduel)
    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("projects")
        .upsert(toInsert, { onConflict: "axonaut_contract_id", ignoreDuplicates: true })
        .select("axonaut_contract_id");

      if (insertErr) {
        errors.push({ id: -1, error: insertErr.message });
        console.error(`[contracts-sync] Erreur batch INSERT: ${insertErr.message}`);
      } else {
        (inserted ?? []).forEach((r) => created.push(r.axonaut_contract_id as number));
        console.log(`[contracts-sync] Batch créé : ${created.length} projet(s).`);
      }
    }

    // 5. Mettre à jour last_synced_at seulement si le run s'est déroulé sans erreur fatale
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("sync_state")
      .update({ value: now, updated_at: now })
      .eq("key", "axonaut_last_synced_at");

    if (updateErr) {
      console.error(`[contracts-sync] Impossible de mettre à jour sync_state : ${updateErr.message}`);
    }

    console.log(
      `[contracts-sync] Terminé. Créés: ${created.length}, Ignorés: ${skipped.length}, Erreurs: ${errors.length}`
    );

    return NextResponse.json({
      ok:             true,
      created:        created.length,
      skipped:        skipped.length,
      errors:         errors.length,
      last_synced_at: now,
      filter_used:    `updated_after=${updatedAfter}`,
      ...(errors.length > 0 ? { error_details: errors } : {}),
    });
  } catch (e) {
    const message =
      e instanceof AxonautError
        ? `Axonaut ${e.status}: ${e.message}`
        : e instanceof Error
          ? e.message
          : "Erreur interne inconnue";

    console.error(`[contracts-sync] FATAL: ${message}`);

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
