-- ============================================================
-- Migration 020 : pause/reprise du chrono de tâche.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 017 (task_timers) déjà exécutée.
--
-- started_at devient nullable : NULL signifie "chrono en pause".
-- accumulated_seconds cumule les segments déjà écoulés avant la pause
-- courante. Durée totale = accumulated_seconds + (started_at IS NOT
-- NULL ? now() - started_at : 0) — calculée côté application, pas ici.
-- ============================================================

ALTER TABLE task_timers ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE task_timers ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER NOT NULL DEFAULT 0;

-- Policy UPDATE manquante jusqu'ici (seules select/insert/delete existaient) —
-- nécessaire pour que pause/reprise (UPDATE task_timers) fonctionnent avec le
-- client RLS-respecting utilisé par ces routes.
DROP POLICY IF EXISTS "task_timers update" ON task_timers;
CREATE POLICY "task_timers update" ON task_timers FOR UPDATE
  USING (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()))
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
