-- ============================================================
-- Migration 024 : colonne "Attente d'éléments" du Kanban.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migrations 019 (tasks.stage), 022 (task_events).
-- ============================================================

CREATE TABLE IF NOT EXISTS task_waits (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id        UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reason         TEXT        NOT NULL CHECK (reason IN (
                   'textes', 'photos', 'documents', 'informations', 'acces',
                   'validation', 'reponse_client', 'retour_interne', 'autre'
                 )),
  waiting_for    TEXT,
  comment        TEXT,
  follow_up_date DATE,
  previous_stage TEXT        NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  created_by     UUID        NOT NULL REFERENCES collaborateurs(id)
);

-- Une seule attente active à la fois par tâche — l'index partiel accélère
-- aussi la recherche de "l'attente active" faite par resolve_task_wait.
CREATE INDEX IF NOT EXISTS idx_task_waits_active ON task_waits(task_id) WHERE resolved_at IS NULL;

-- ============================================================
-- RLS — même schéma que tasks/task_events : lecture ouverte aux
-- authentifiés, écriture au nom de soi-même ; l'autorisation réelle
-- (assigné à la tâche, ou rôle privilégié) vit dans les routes API.
-- ============================================================
ALTER TABLE task_waits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_waits select" ON task_waits;
CREATE POLICY "task_waits select" ON task_waits FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_waits insert" ON task_waits;
CREATE POLICY "task_waits insert" ON task_waits FOR INSERT
  WITH CHECK (created_by = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "task_waits update" ON task_waits;
CREATE POLICY "task_waits update" ON task_waits FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Fonctions transactionnelles (même esprit que log_task_time, migration
-- 021) : durée+statut ou ici attente+statut doivent réussir ensemble.
-- ============================================================
CREATE OR REPLACE FUNCTION start_task_wait(
  p_task_id UUID,
  p_reason TEXT,
  p_waiting_for TEXT,
  p_comment TEXT,
  p_follow_up_date DATE,
  p_collaborateur_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_wait_id UUID;
  v_current_stage TEXT;
BEGIN
  SELECT stage INTO v_current_stage FROM tasks WHERE id = p_task_id;

  INSERT INTO task_waits (task_id, reason, waiting_for, comment, follow_up_date, previous_stage, created_by)
  VALUES (p_task_id, p_reason, p_waiting_for, p_comment, p_follow_up_date, v_current_stage, p_collaborateur_id)
  RETURNING id INTO v_wait_id;

  UPDATE tasks SET stage = 'attente_elements' WHERE id = p_task_id;

  INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value)
  VALUES (p_task_id, p_collaborateur_id, 'waiting_started', v_current_stage, p_reason);

  RETURN v_wait_id;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_task_wait(
  p_task_id UUID,
  p_collaborateur_id UUID
) RETURNS TABLE(wait_id UUID, restored_stage TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wait_id UUID;
  v_previous_stage TEXT;
BEGIN
  SELECT id, previous_stage INTO v_wait_id, v_previous_stage
    FROM task_waits WHERE task_id = p_task_id AND resolved_at IS NULL
    ORDER BY started_at DESC LIMIT 1;

  IF v_wait_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE task_waits SET resolved_at = now() WHERE id = v_wait_id;
  UPDATE tasks SET stage = v_previous_stage WHERE id = p_task_id;

  INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value)
  VALUES (p_task_id, p_collaborateur_id, 'waiting_resolved', 'attente_elements', v_previous_stage);

  RETURN QUERY SELECT v_wait_id, v_previous_stage;
END;
$$;
