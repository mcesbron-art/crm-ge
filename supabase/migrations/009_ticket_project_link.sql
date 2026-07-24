-- ============================================================
-- Migration 009 : lien ticket → projet existant + affectation collaborateur
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Les colonnes assigned_to / created_by existent déjà mais sans contrainte de
-- clé étrangère : PostgREST a besoin de ces FK pour pouvoir faire des
-- jointures (embed), utilisées par /api/tickets et /api/clients/[id]/tickets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_assigned_to'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_assigned_to FOREIGN KEY (assigned_to)
      REFERENCES collaborateurs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_created_by'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by)
      REFERENCES collaborateurs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_project_id  ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
