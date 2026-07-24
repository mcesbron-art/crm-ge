-- ============================================================
-- Migration 015 : durée estimée + échéance prévisionnelle sur les tâches
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 014 (table tasks) déjà exécutée.
--
-- Aucun changement RLS nécessaire : la policy "tasks all auth" (FOR ALL,
-- USING/WITH CHECK auth.uid() IS NOT NULL) s'applique par ligne, pas par
-- colonne — elle couvre déjà ces deux nouvelles colonnes.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS due_date DATE;
