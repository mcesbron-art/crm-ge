-- ============================================================
-- Migration 033 : colonne archived sur projects
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- Contexte : import Axonaut massif (543 projets historiques, certains
-- remontant à 2020) qui noient les projets réellement en cours dans la
-- page Projets, le rapport de temps, etc. `archived` masque ces projets
-- des vues de navigation normales SANS les supprimer (réversible) — les
-- tâches/saisies de temps déjà liées restent intactes et accessibles.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
