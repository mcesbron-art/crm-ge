-- ============================================================
-- Migration 034 : colonne archived sur tickets
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- Même principe que projects.archived (migration 033) : masque les
-- tickets Axonaut anciens des vues de navigation normales SANS les
-- supprimer (réversible) — commentaires et liens projet déjà existants
-- restent intacts et accessibles pour un collaborateur qui y est assigné.
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets(archived);
