-- ============================================================
-- Migration 035 : centre de notifications in-app.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- Contrairement à task_events (chacun écrit en son propre nom), une
-- notification est presque toujours créée par un acteur POUR un autre
-- destinataire (ex : A commente un ticket assigné à B → notif pour B).
-- Une policy INSERT classique du style "collaborateur_id = auth.uid()"
-- bloquerait donc ce cas général. Choix assumé : aucune policy INSERT
-- pour le rôle authenticated — l'écriture ne passe que par le
-- service_role (lib/notifications.ts), jamais par le client anon.
--
-- Pas de FK stricte vers l'entité source (entity_type/entity_id en
-- colonnes libres) car le type de l'entité varie selon la notification
-- (tâche, ticket, projet, opportunité) — un lien peut donc pointer vers
-- une entité supprimée depuis ; accepté en v1, pas de purge automatique.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  title        TEXT        NOT NULL,
  body         TEXT,
  link         TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);

-- ============================================================
-- RLS — chacun ne lit/ne modifie que ses propres notifications.
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications select own" ON notifications;
CREATE POLICY "notifications select own" ON notifications FOR SELECT
  USING (recipient_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "notifications update own" ON notifications;
CREATE POLICY "notifications update own" ON notifications FOR UPDATE
  USING (recipient_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()))
  WITH CHECK (recipient_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
