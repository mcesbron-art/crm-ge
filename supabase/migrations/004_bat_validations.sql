-- ============================================================
-- Migration 004 : table bat_validations
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

CREATE TABLE IF NOT EXISTS bat_validations (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token          UUID        NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  bat_url        TEXT        NOT NULL,
  client_email   TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CONSTRAINT chk_bat_status CHECK (status IN ('pending', 'approved', 'rejected')),
  client_comment TEXT,
  responded_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bat_validations_project   ON bat_validations(project_id);
CREATE INDEX IF NOT EXISTS idx_bat_validations_token     ON bat_validations(token);
CREATE INDEX IF NOT EXISTS idx_bat_validations_status    ON bat_validations(status);

-- RLS : accès complet aux utilisateurs authentifiés
ALTER TABLE bat_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bat_validations auth" ON bat_validations;
CREATE POLICY "bat_validations auth" ON bat_validations FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Le respond endpoint est appelé sans auth (service_role via route API dédiée)
-- → pas de policy SELECT publique : on utilise service_role dans la route.

-- ============================================================
-- Bucket Supabase Storage pour les fichiers BAT
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bat-files',
  'bat-files',
  true,
  52428800, -- 50 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (lien dans email client)
DROP POLICY IF EXISTS "bat files public read" ON storage.objects;
CREATE POLICY "bat files public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'bat-files');

-- Upload : service_role seulement (la route API utilise admin client)
-- Pas de policy INSERT publique volontairement.
