-- ============================================================
-- Migration 031 : historique des (ré)affectations de projets et tickets.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- task_events (migration 022) ne peut pas être réutilisée ici : sa colonne
-- task_id est NOT NULL, elle ne peut donc pas représenter un événement sur
-- un projet ou un ticket. assignment_events joue le même rôle générique,
-- mais au niveau ressource (resource_type/resource_id) plutôt qu'au
-- niveau tâche — même reste du pattern (lecture ouverte, écriture par
-- soi-même, jamais de update/delete : un journal ne se corrige pas
-- rétroactivement).
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type    TEXT        NOT NULL CHECK (resource_type IN ('project', 'ticket')),
  resource_id      UUID        NOT NULL,
  actor_id         UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  old_assignee_id  UUID        REFERENCES collaborateurs(id) ON DELETE SET NULL,
  new_assignee_id  UUID        REFERENCES collaborateurs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_events_resource ON assignment_events(resource_type, resource_id);

ALTER TABLE assignment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_events select" ON assignment_events;
CREATE POLICY "assignment_events select" ON assignment_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assignment_events insert" ON assignment_events;
CREATE POLICY "assignment_events insert" ON assignment_events FOR INSERT
  WITH CHECK (actor_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
