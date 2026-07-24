-- ============================================================
-- Migration 017 : chronomètre de tâche (démarrer/arrêter un suivi de
-- temps en direct sur une tâche), en plus de la saisie manuelle
-- existante (time_entries).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 014 (table tasks) déjà exécutée.
--
-- Un seul chrono actif par collaborateur à la fois (UNIQUE sur
-- collaborateur_id) : on ne peut pas dire "je travaille sur X" et "je
-- travaille sur Y" en même temps. Démarrer un chrono sur une nouvelle
-- tâche pendant qu'un autre tourne arrête et encaisse automatiquement
-- le précédent (logique côté route API, pas ici).
-- ============================================================

CREATE TABLE IF NOT EXISTS task_timers (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  collaborateur_id UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collaborateur_id)
);

CREATE INDEX IF NOT EXISTS idx_task_timers_task ON task_timers(task_id);

-- ============================================================
-- RLS — un chrono est un état personnel et éphémère (comme
-- time_entries) : chacun ne voit et ne gère que le sien, jamais celui
-- d'un collègue.
-- ============================================================
ALTER TABLE task_timers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_timers select" ON task_timers;
CREATE POLICY "task_timers select" ON task_timers FOR SELECT
  USING (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "task_timers insert" ON task_timers;
CREATE POLICY "task_timers insert" ON task_timers FOR INSERT
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "task_timers delete" ON task_timers;
CREATE POLICY "task_timers delete" ON task_timers FOR DELETE
  USING (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
