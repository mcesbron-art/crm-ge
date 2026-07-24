-- ============================================================
-- Migration 012 : informations de profil collaborateur + photos
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- ============================================================

ALTER TABLE collaborateurs
  ADD COLUMN IF NOT EXISTS telephone  TEXT,
  ADD COLUMN IF NOT EXISTS bio        TEXT,
  ADD COLUMN IF NOT EXISTS poste      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- Bucket Supabase Storage pour les photos de profil
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (affichée partout dans le CRM)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Upload : service_role seulement (la route API vérifie la session avant d'écrire)
-- Pas de policy INSERT publique volontairement.
