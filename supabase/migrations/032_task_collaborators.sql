-- ============================================================
-- Migration 032 : collaborateurs additionnels sur une tâche
-- (en plus de l'assigné principal stocké dans tasks.assigned_to)
-- Même pattern que 011_ticket_collaborators.sql.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

CREATE TABLE IF NOT EXISTS task_collaborators (
  task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, collaborateur_id)
);

CREATE INDEX IF NOT EXISTS idx_task_collaborators_task   ON task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_collab ON task_collaborators(collaborateur_id);

ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_collaborators auth" ON task_collaborators;
CREATE POLICY "task_collaborators auth" ON task_collaborators FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
