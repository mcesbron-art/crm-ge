-- ============================================================
-- Migration 011 : collaborateurs additionnels sur un ticket
-- (en plus du responsable unique stocké dans tickets.assigned_to)
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_collaborators (
  ticket_id        UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, collaborateur_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_collaborators_ticket ON ticket_collaborators(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_collaborators_collab ON ticket_collaborators(collaborateur_id);

ALTER TABLE ticket_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_collaborators auth" ON ticket_collaborators;
CREATE POLICY "ticket_collaborators auth" ON ticket_collaborators FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
