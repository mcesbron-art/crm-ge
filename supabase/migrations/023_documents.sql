-- ============================================================
-- Migration 023 : fonctionnalité Documents (communs / personnels).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : lib/permissions.ts (manage_documents, upload_*_document,
-- view_*_documents) déjà défini côté application.
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL CHECK (category IN ('rh', 'com', 'process', 'perso')),
  visibility    TEXT        NOT NULL DEFAULT 'commun' CHECK (visibility IN ('commun', 'personnel')),
  file_path     TEXT        NOT NULL,
  mime_type     TEXT        NOT NULL,
  file_size     INTEGER     NOT NULL,
  uploaded_by   UUID        NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  recipient_id  UUID        REFERENCES collaborateurs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT documents_personal_needs_recipient CHECK (visibility <> 'personnel' OR recipient_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_recipient  ON documents(recipient_id);

-- ============================================================
-- RLS — défense en profondeur (les routes utilisent le client admin +
-- vérification explicite de lib/permissions.ts, ceci n'est pas le
-- mécanisme principal, mais ces documents peuvent contenir des données
-- sensibles — fiches de paie, contrats — donc pas de policy ouverte
-- comme sur tickets/tasks).
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents select" ON documents;
CREATE POLICY "documents select" ON documents FOR SELECT
  USING (
    visibility = 'commun'
    OR uploaded_by  = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
    OR recipient_id = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
  );

-- ============================================================
-- Bucket Storage privé — pas de lecture publique (à la différence de
-- bat-files) : le téléchargement passe uniquement par une URL signée
-- générée après vérification de permission côté route API.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Aucune policy storage.objects publique volontairement : upload et
-- téléchargement passent exclusivement par le client admin (service_role)
-- dans les routes API dédiées.
