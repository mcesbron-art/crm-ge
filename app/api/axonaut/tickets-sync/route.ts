import { NextRequest, NextResponse } from "next/server";
import { listTicketsSince, listCompanies, AxonautError } from "@/lib/axonaut";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[tickets-sync] CRON_SECRET non configuré — route bloquée.");
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function toAxonautDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  // Slashes littéraux — Axonaut ne peut pas parser %2F
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

// Extrait un texte lisible du HTML renvoyé par Axonaut (corps du 1er message du ticket).
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“")
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&euml;/gi, "ë")
    .replace(/&agrave;/gi, "à")
    .replace(/&acirc;/gi, "â")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&icirc;/gi, "î")
    .replace(/&ugrave;/gi, "ù")
    .replace(/&ucirc;/gi, "û")
    .replace(/&oelig;/gi, "œ")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const upserted: number[] = [];
  const errors: { id: number; error: string }[] = [];

  try {
    // 1. Lire la date de dernière synchro
    const { data: stateRow, error: stateErr } = await supabase
      .from("sync_state")
      .select("value")
      .eq("key", "axonaut_tickets_last_synced_at")
      .single();

    if (stateErr) {
      throw new Error(`Lecture sync_state échouée : ${stateErr.message}`);
    }

    const lastSyncedAt = stateRow?.value ?? "2026-01-01T00:00:00.000Z";
    const updatedAfter = toAxonautDate(lastSyncedAt);

    console.log(`[tickets-sync] Démarrage. Filtre updated_after=${updatedAfter}`);

    // 2. Récupérer les tickets Axonaut (pagination automatique)
    const tickets = await listTicketsSince(updatedAfter);

    console.log(`[tickets-sync] ${tickets.length} ticket(s) reçu(s) d'Axonaut.`);

    // 3. Upsert en batch sur axonaut_ticket_id
    if (tickets.length > 0) {
      // Les tickets Axonaut ne renvoient que company_id (pas le nom) — on résout
      // via la liste des entreprises pour remplir client_name.
      const companies = await listCompanies();
      const companyNameById = new Map(companies.map(c => [c.id, c.name]));

      const rows = tickets.map(t => {
        const comments = t.comments ?? [];
        const firstCommentText = comments[0]?.text;
        return {
          axonaut_ticket_id:  t.id,
          axonaut_company_id: t.company_id ?? null,
          titre:              t.title,
          statut:             t.is_closed ? "ferme" : "ouvert",
          priorite:           t.priority?.toLowerCase() || "normale",
          client_name:        (t.company_id != null ? companyNameById.get(t.company_id) : null) ?? null,
          projet_name:        null,
          description:        firstCommentText ? htmlToPlainText(firstCommentText) : null,
          tags:               [] as string[],
          echanges:           comments.length,
          created_via:        "axonaut",
          created_at:         t.creation_date,
          updated_at:         t.last_update_date,
        };
      });

      const { data: inserted, error: upsertErr } = await supabase
        .from("tickets")
        .upsert(rows, { onConflict: "axonaut_ticket_id", ignoreDuplicates: false })
        .select("axonaut_ticket_id");

      if (upsertErr) {
        errors.push({ id: -1, error: upsertErr.message });
        console.error(`[tickets-sync] Erreur upsert: ${upsertErr.message}`);
      } else {
        (inserted ?? []).forEach(r => upserted.push(r.axonaut_ticket_id as number));
        console.log(`[tickets-sync] Batch upsert : ${upserted.length} ticket(s).`);
      }
    }

    // 4. Mettre à jour sync_state uniquement si pas d'erreur fatale
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("sync_state")
      .update({ value: now, updated_at: now })
      .eq("key", "axonaut_tickets_last_synced_at");

    if (updateErr) {
      console.error(`[tickets-sync] Impossible de mettre à jour sync_state : ${updateErr.message}`);
    }

    console.log(`[tickets-sync] Terminé. Upsertés: ${upserted.length}, Erreurs: ${errors.length}`);

    return NextResponse.json({
      ok:             true,
      upserted:       upserted.length,
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

    console.error(`[tickets-sync] FATAL: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
