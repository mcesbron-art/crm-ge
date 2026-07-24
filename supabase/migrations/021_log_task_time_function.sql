-- ============================================================
-- Migration 021 : écriture transactionnelle durée + statut de tâche.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migrations 018 (duration_seconds), 019 (tasks.stage).
--
-- Fonction volontairement simple (PAS SECURITY DEFINER) : elle
-- s'exécute avec les droits de l'appelant (client à clé anon + cookies
-- de session, RLS active). La vérification de permission (assigné à
-- la tâche, ou direction/admin) est faite dans la route API AVANT cet
-- appel — cohérent avec le reste du projet où l'autorisation vit dans
-- les routes, pas dans des policies RLS fines. L'intérêt de la
-- fonction est uniquement l'atomicité : les deux écritures (entrée de
-- temps + changement de statut) réussissent ou échouent ensemble.
-- ============================================================

CREATE OR REPLACE FUNCTION log_task_time(
  p_task_id UUID,
  p_project_id UUID,
  p_collaborateur_id UUID,
  p_duration_seconds INT,
  p_date DATE,
  p_note TEXT,
  p_new_stage TEXT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO time_entries (project_id, task_id, collaborateur_id, date, duration_minutes, duration_seconds, note)
  VALUES (p_project_id, p_task_id, p_collaborateur_id, p_date, CEIL(p_duration_seconds / 60.0), p_duration_seconds, p_note)
  RETURNING id INTO v_entry_id;

  IF p_new_stage IS NOT NULL THEN
    UPDATE tasks SET stage = p_new_stage WHERE id = p_task_id;
  END IF;

  RETURN v_entry_id;
END;
$$;
