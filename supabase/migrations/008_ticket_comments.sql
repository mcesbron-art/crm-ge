-- ============================================================
-- Migration 008 : commentaires internes sur les tickets
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id  UUID        REFERENCES collaborateurs(id) ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket     ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author     ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_comments auth" ON ticket_comments;
CREATE POLICY "ticket_comments auth" ON ticket_comments FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
