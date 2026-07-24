-- ============================================================
-- Migration 014 : table tasks (checklist projet persistée) + lien avec
-- time_entries pour la saisie de temps par tâche.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 013 (time_entries) déjà exécutée.
--
-- Portée validée avec l'utilisateur :
-- - La checklist du slide-over projet (ProjetsClient.tsx) n'était PAS
--   persistée avant cette migration (setState React pur, tasks: []
--   toujours renvoyé par dbToProject) — cette table la rend réelle.
-- - Le kanban (/kanban) reste un système séparé, non touché.
-- ============================================================

-- ============================================================
-- Table tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label        TEXT        NOT NULL,
  done         BOOLEAN     NOT NULL DEFAULT false,
  assigned_to  UUID        REFERENCES collaborateurs(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- même pattern que sur projects/time_entries (fonction définie dans schema.sql)
DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS — tasks est un item d'équipe partagé (comme projects/tickets),
-- pas un enregistrement personnel comme time_entries : lecture ET
-- écriture ouvertes à tout authentifié, n'importe qui peut créer,
-- cocher, réassigner ou supprimer une tâche. Décision validée
-- explicitement avec l'utilisateur (écart par rapport à la règle
-- "assigné/direction/admin uniquement" suggérée en premier jet).
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks all auth" ON tasks;
CREATE POLICY "tasks all auth" ON tasks FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Lien time_entries → tasks (nullable : NULL = temps général projet,
-- rempli = temps saisi sur cette tâche précise). Le total projet reste
-- SUM(duration_minutes) WHERE project_id = X, que task_id soit rempli
-- ou non — aucun double comptage possible par construction, pas besoin
-- d'une table séparée task_time_entries.
-- ============================================================
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
