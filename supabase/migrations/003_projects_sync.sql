-- ============================================================
-- Migration 003 : tables projects (kanban production) + sync_state
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : schema.sql + migrations 001/002 déjà exécutées.
-- ============================================================

-- ============================================================
-- Table projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lien Axonaut
  axonaut_contract_id  INTEGER     UNIQUE,
  axonaut_quotation_id INTEGER,

  -- Données métier
  name                 TEXT        NOT NULL,
  client_name          TEXT        NOT NULL DEFAULT '',
  status               TEXT        NOT NULL DEFAULT 'brief'
                       CONSTRAINT chk_projects_status
                       CHECK (status IN (
                         'brief',
                         'a_faire',
                         'en_cours',
                         'attente_element',
                         'validation_client',
                         'bat_envoye',
                         'a_facturer',
                         'termine'
                       )),

  -- Assignation (à compléter manuellement, non fourni par Axonaut)
  assigned_to          UUID        REFERENCES collaborateurs(id) ON DELETE SET NULL,

  -- Dates
  start_date           DATE,
  due_date             DATE,

  -- Traçabilité de l'origine
  created_via          TEXT        NOT NULL DEFAULT 'manual'
                       CONSTRAINT chk_projects_created_via
                       CHECK (created_via IN ('axonaut', 'manual')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status             ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_axonaut_contract   ON projects(axonaut_contract_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to        ON projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_due_date           ON projects(due_date);

-- Trigger updated_at (réutilise la fonction set_updated_at() de schema.sql)
DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS : utilisateurs authentifiés ont accès complet (lecture + écriture manuelle)
-- Le cron utilise service_role → bypass automatique du RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects all auth" ON projects;
CREATE POLICY "projects all auth" ON projects FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Table sync_state
-- Clé-valeur simple pour stocker les marqueurs de synchronisation.
-- Accessible uniquement via service_role (cron) — pas de policy auth.
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_state (
  key        TEXT        PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row initiale : on remonte à 2020 pour tout récupérer au premier run.
-- Mettre à jour manuellement si l'on ne veut pas importer l'historique complet.
INSERT INTO sync_state (key, value)
VALUES ('axonaut_last_synced_at', '2020-01-01T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;

-- RLS activé sans policy → seul service_role peut écrire/lire sync_state
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
