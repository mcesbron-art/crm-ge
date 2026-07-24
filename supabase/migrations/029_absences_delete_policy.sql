-- ============================================================
-- Migration 029 : autorise la suppression d'une absence (RLS).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- La table absences n'avait qu'une policy SELECT/INSERT/UPDATE — DELETE
-- était donc refusé par défaut par RLS. Nécessaire pour permettre à la
-- direction de supprimer une absence déjà validée (app/api/absences/[id]/
-- route.ts). Même schéma que le reste du fichier : RLS large, vérification
-- réelle (role === "direction") dans la route API.
-- ============================================================

DROP POLICY IF EXISTS "absences delete" ON absences;
CREATE POLICY "absences delete" ON absences FOR DELETE
  USING (auth.uid() IS NOT NULL);
