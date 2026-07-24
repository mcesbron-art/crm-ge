-- ============================================================
-- Migration 028 : gestion des absences et des heures supplémentaires.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- Chaque collaborateur crée ses propres demandes (statut initial
-- "attente") ; seuls direction/admin (permission manage_absences,
-- lib/permissions.ts) peuvent les valider ou les refuser — même schéma
-- d'autorisation que task_billing_requests/task_bat_revisions : RLS large,
-- vérification réelle dans les routes API.
-- ============================================================

CREATE TABLE IF NOT EXISTS absences (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaborateur_id UUID       NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN (
                    'conges_payes', 'rtt', 'conges_sans_solde', 'arret_maladie',
                    'absence_injustifiee', 'recuperation', 'absence_exceptionnelle',
                    'formation', 'accident_travail', 'conge_maternite', 'conge_paternite',
                    'chomage_partiel', 'enfant_malade'
                  )),
  start_date      DATE        NOT NULL,
  end_date        DATE        NOT NULL,
  days            NUMERIC(4,1) NOT NULL CHECK (days > 0),
  status          TEXT        NOT NULL DEFAULT 'attente' CHECK (status IN ('attente', 'validee', 'refusee')),
  processed_by    UUID        REFERENCES collaborateurs(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_absences_collaborateur ON absences(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_absences_status ON absences(status);

DROP TRIGGER IF EXISTS trg_absences_updated ON absences;
CREATE TRIGGER trg_absences_updated
  BEFORE UPDATE ON absences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "absences select" ON absences;
CREATE POLICY "absences select" ON absences FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "absences insert" ON absences;
CREATE POLICY "absences insert" ON absences FOR INSERT
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "absences update" ON absences;
CREATE POLICY "absences update" ON absences FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Déclarations d'heures supplémentaires — liées à un projet réel (pas de
-- liste client/projet dupliquée : le client se lit via projects.client_name).
-- ============================================================
CREATE TABLE IF NOT EXISTS overtime_declarations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaborateur_id UUID       NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  hours           NUMERIC(4,2) NOT NULL CHECK (hours > 0),
  status          TEXT        NOT NULL DEFAULT 'attente' CHECK (status IN ('attente', 'validee', 'refusee')),
  processed_by    UUID        REFERENCES collaborateurs(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overtime_collaborateur ON overtime_declarations(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_declarations(status);

DROP TRIGGER IF EXISTS trg_overtime_updated ON overtime_declarations;
CREATE TRIGGER trg_overtime_updated
  BEFORE UPDATE ON overtime_declarations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE overtime_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "overtime select" ON overtime_declarations;
CREATE POLICY "overtime select" ON overtime_declarations FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "overtime insert" ON overtime_declarations;
CREATE POLICY "overtime insert" ON overtime_declarations FOR INSERT
  WITH CHECK (collaborateur_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "overtime update" ON overtime_declarations;
CREATE POLICY "overtime update" ON overtime_declarations FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
