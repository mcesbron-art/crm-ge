-- ============================================================
-- Migration 010 : correction des FK sur tickets.assigned_to / created_by
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- La table tickets avait déjà des contraintes historiques
-- tickets_assigned_to_fkey / tickets_created_by_fkey pointant vers
-- auth.users. La migration 009 a ajouté par erreur des FK concurrentes
-- vers collaborateurs sur ces deux colonnes : une valeur devait alors
-- satisfaire les deux contraintes à la fois, ce qui bloquait toute
-- écriture (erreur 23503 sur assigned_to/created_by).
--
-- Décision :
-- - assigned_to doit référencer collaborateurs(id), comme
--   projects.assigned_to (aucun autre code n'écrit dans cette colonne
--   avec un UID Supabase Auth) → on retire l'ancienne FK vers auth.users.
-- - created_by continue de stocker l'UID Supabase Auth (utilisé par
--   /api/clients/[id]/tickets et /notes) → on retire la FK vers
--   collaborateurs ajoutée par erreur en 009.
-- ============================================================

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_created_by;
