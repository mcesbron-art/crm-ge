-- ============================================================
-- Migration 005 : colonne project_type sur la table projects
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT
  CONSTRAINT chk_project_type CHECK (
    project_type IS NULL OR project_type IN (
      'site_web', 'graphisme', 'communication',
      'community_management', 'formation', 'evenementiel', 'autre'
    )
  );

CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
