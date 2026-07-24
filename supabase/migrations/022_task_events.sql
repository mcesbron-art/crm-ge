-- ============================================================
-- Migration 022 : journal d'activité générique par tâche.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 019 (tasks.stage) déjà exécutée.
--
-- Premier consommateur : le changement d'étape du Kanban de production
-- (action 'stage_changed'). Conçu pour être le SEUL journal d'activité
-- du projet — les phases suivantes (BAT, facturation, diffusion, retour
-- commerce) y ajouteront leurs propres valeurs d'`action` plutôt que de
-- créer une table par fonctionnalité.
-- ============================================================

CREATE TABLE IF NOT EXISTS task_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  collaborateur_id UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  action           TEXT        NOT NULL,
  old_value        TEXT,
  new_value        TEXT,
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);

-- ============================================================
-- RLS — historique collectif (comme time_entries) : tout authentifié peut
-- lire, chacun n'écrit qu'en son propre nom, personne ne modifie ni ne
-- supprime — un journal ne se corrige pas rétroactivement.
-- ============================================================
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_events select" ON task_events;
CREATE POLICY "task_events select" ON task_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_events insert" ON task_events;
CREATE POLICY "task_events insert" ON task_events FOR INSERT
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
