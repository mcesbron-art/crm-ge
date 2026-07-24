-- ============================================================
-- Migration 019 : étape de workflow par tâche (Phase 1 du panneau
-- de temps v2 — pose le champ, le Kanban qui l'exploitera pleinement
-- viendra dans une phase séparée).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 014 (table tasks) déjà exécutée.
--
-- Vocabulaire figé dès maintenant sur les 9 colonnes cibles du futur
-- Kanban de production (voir lib/task-taxonomy.ts:TASK_STAGES) pour
-- éviter une seconde migration de renommage plus tard. Par défaut
-- toutes les tâches existantes démarrent à 'brief'.
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'brief';

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_stage_check CHECK (stage IN (
    'brief', 'a_faire', 'abonnement', 'attente_elements', 'bat_envoye',
    'etat_bat', 'attente_diffusion', 'facturation', 'retour_commerce'
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
