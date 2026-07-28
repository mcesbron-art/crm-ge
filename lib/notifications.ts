import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-server";

/**
 * Création de notifications in-app — UTILISATION SERVER-SIDE UNIQUEMENT.
 *
 * Passe par le client admin (service_role) car la table `notifications`
 * n'a volontairement aucune policy RLS INSERT pour "authenticated" (voir
 * supabase/migrations/035_notifications.sql) : une notification est quasi
 * toujours créée par un acteur pour un AUTRE destinataire, ce qu'une policy
 * du style "collaborateur_id = auth.uid()" ne permettrait pas.
 */

export type CreateNotificationArgs = {
  recipientId: string;
  type: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
};

/**
 * Ne lève jamais d'erreur : un échec de notification (table pas encore
 * migrée, colonne manquante, etc.) ne doit jamais faire échouer l'action
 * métier principale (assignation, commentaire, réponse BAT...).
 */
export async function createNotification(args: CreateNotificationArgs): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("notifications").insert({
    recipient_id: args.recipientId,
    type: args.type,
    entity_type: args.entityType,
    entity_id: args.entityId ?? null,
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
  });

  if (error) {
    console.error("[createNotification] insert failed:", error.message);
  }
}
