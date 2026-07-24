-- ============================================================
-- Migration 013 : saisie de temps (Phase 1)
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : schema.sql + migration 003 (table projects) déjà exécutées.
--
-- Portée : suivi du temps au niveau PROJET (table `projects`), pas par
-- tâche individuelle — le kanban (/kanban) n'est aujourd'hui connecté à
-- aucune table (données mock côté client), il n'existe donc pas de table
-- `tasks` à laquelle rattacher un task_id. À réévaluer si le kanban est
-- un jour persisté en base.
-- ============================================================

-- ============================================================
-- Table time_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  collaborateur_id  UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes  INTEGER     NOT NULL CHECK (duration_minutes > 0),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_project       ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_collaborateur ON time_entries(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date          ON time_entries(date);

DROP TRIGGER IF EXISTS trg_time_entries_updated ON time_entries;
CREATE TRIGGER trg_time_entries_updated
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Colonne taux_horaire sur collaborateurs (Phase 2 — vide pour l'instant)
-- ============================================================
ALTER TABLE collaborateurs
  ADD COLUMN IF NOT EXISTS taux_horaire NUMERIC(10,2) DEFAULT NULL;

-- ============================================================
-- RLS — contrairement aux autres tables de ce projet (qui utilisent une
-- policy large "auth.uid() IS NOT NULL" et laissent l'autorisation fine
-- aux routes API via le client service_role), time_entries applique une
-- RLS réellement restrictive : les routes /api/time-entries utilisent le
-- client serveur (respectant RLS), pas le client admin, pour que ces
-- policies soient la ligne de défense effective.
-- ============================================================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les collaborateurs authentifiés voient toutes les saisies.
-- Nécessaire pour le panneau projet (total + répartition par collaborateur,
-- liste des saisies avec nom de l'auteur) qui n'est pas réservé à
-- direction/admin. La restriction "chacun ne voit que ses saisies" du
-- brief initial est incompatible avec cet affichage collectif — seule
-- l'ÉCRITURE (insert/update/delete) reste limitée à ses propres saisies.
DROP POLICY IF EXISTS "time_entries select" ON time_entries;
CREATE POLICY "time_entries select" ON time_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Création : uniquement pour soi-même.
DROP POLICY IF EXISTS "time_entries insert" ON time_entries;
CREATE POLICY "time_entries insert" ON time_entries FOR INSERT
  WITH CHECK (
    collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
  );

-- Modification / suppression : uniquement ses propres saisies (même pour
-- direction/admin, qui peuvent tout VOIR mais pas éditer les saisies des
-- autres depuis cette table).
DROP POLICY IF EXISTS "time_entries update" ON time_entries;
CREATE POLICY "time_entries update" ON time_entries FOR UPDATE
  USING (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()))
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "time_entries delete" ON time_entries;
CREATE POLICY "time_entries delete" ON time_entries FOR DELETE
  USING (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));
