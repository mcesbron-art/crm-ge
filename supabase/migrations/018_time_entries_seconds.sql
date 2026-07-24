-- ============================================================
-- Migration 018 : précision seconde pour les saisies de temps
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 013 (time_entries) déjà exécutée.
--
-- duration_minutes reste la colonne utilisée par les agrégats existants
-- (rapports, dashboard, badges de charge sur les cartes projet/tâche) —
-- elle continue de valoir CEIL(duration_seconds / 60), jamais 0 pour une
-- saisie non nulle. duration_seconds est la nouvelle valeur exacte,
-- utilisée par le panneau "Temps passé sur la tâche" (chrono et saisie
-- manuelle) pour afficher/cumuler le détail heures/minutes/secondes.
-- ============================================================

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

UPDATE time_entries SET duration_seconds = duration_minutes * 60 WHERE duration_seconds IS NULL;

ALTER TABLE time_entries ALTER COLUMN duration_seconds SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE time_entries ADD CONSTRAINT time_entries_duration_seconds_positive CHECK (duration_seconds > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
