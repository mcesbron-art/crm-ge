-- ============================================================
-- Migration 006 : import tickets Axonaut
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migrations 001–005 déjà exécutées.
-- ============================================================

-- ── Nouvelles colonnes sur la table tickets existante ───────

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS axonaut_ticket_id INTEGER UNIQUE;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'Nouveau';

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS client_name TEXT;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS projet_name TEXT;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS echanges INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'manual';

-- ── Index ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tickets_axonaut_id  ON tickets(axonaut_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_statut       ON tickets(statut);
CREATE INDEX IF NOT EXISTS idx_tickets_created_via  ON tickets(created_via);

-- ── RLS ──────────────────────────────────────────────────────
-- Le cron utilise service_role (bypass automatique).
-- Les utilisateurs authentifiés peuvent lire/écrire leurs tickets.

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets all auth" ON tickets;
CREATE POLICY "tickets all auth" ON tickets FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Entrée sync_state ────────────────────────────────────────

INSERT INTO sync_state (key, value)
VALUES ('axonaut_tickets_last_synced_at', '2026-01-01T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;
