-- ============================================================
-- Migration 016 : priorité, type, début et fin sur les tâches
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 015 (estimated_minutes/due_date) déjà exécutée.
--
-- due_date (migration 015) reste la date butoir / prévisionnelle.
-- start_date/end_date sont des dates de réalisation distinctes, à l'image
-- du kanban (mock, non touché) qui distingue déjà dateDebut/dateFin/dateButoir.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority   TEXT DEFAULT 'Normale',
  ADD COLUMN IF NOT EXISTS task_type  TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

-- Aucun changement RLS nécessaire : la policy "tasks all auth" (FOR ALL,
-- USING/WITH CHECK auth.uid() IS NOT NULL) couvre déjà ces colonnes.
