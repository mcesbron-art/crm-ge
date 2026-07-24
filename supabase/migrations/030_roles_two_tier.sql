-- ============================================================
-- Migration 030 : rôles à 2 niveaux (admin / collaborateur).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
--
-- Fusionne 'direction' et 'admin' en un seul rôle 'admin' à accès complet
-- (lib/permissions.ts). collaborateurs.role est un ENUM Postgres
-- (user_role, défini dans schema.sql) — Postgres ne permet pas de retirer
-- une valeur d'un ENUM directement, d'où le remplacement de type ci-dessous
-- plutôt qu'un simple ALTER CONSTRAINT.
--
-- Données réelles vérifiées avant écriture de cette migration : seuls 2
-- comptes portent le rôle 'direction' (aucun utilisateur ne se retrouve
-- sans rôle après conversion).
-- ============================================================

-- 1) Convertir les comptes 'direction' existants en 'admin' AVANT de
--    retirer la valeur de l'enum.
UPDATE collaborateurs SET role = 'admin' WHERE role = 'direction';

-- 2) schema.sql (legacy — tables projets/taches/timers/bats/factures/
--    audit_log, toutes à 0 ligne, non utilisées par l'app actuelle, qui
--    opère sur projects/tasks/task_bat_revisions etc.) définit des
--    policies RLS et une fonction current_user_role() qui référencent
--    'direction' en dur. collaborateurs, elle, EST une table live : sa
--    policy "direction manages" doit rester valide. On les supprime avant
--    de toucher au type/à la fonction dont elles dépendent, pour éviter
--    une erreur de dépendance, puis on les recrée plus bas avec 'admin'.
DROP POLICY IF EXISTS "direction manages"        ON collaborateurs;
DROP POLICY IF EXISTS "projets write"             ON projets;
DROP POLICY IF EXISTS "taches admin write"        ON taches;
DROP POLICY IF EXISTS "timers own"                ON timers;
DROP POLICY IF EXISTS "bats write"                ON bats;
DROP POLICY IF EXISTS "factures direction admin"  ON factures;
DROP POLICY IF EXISTS "audit read direction"      ON audit_log;

DROP FUNCTION IF EXISTS current_user_role();

-- 3) Remplace le type enum user_role (3 valeurs) par une version à 2
--    valeurs — impossible de faire DROP VALUE directement en Postgres.
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'collaborateur');

ALTER TABLE collaborateurs ALTER COLUMN role DROP DEFAULT;
ALTER TABLE collaborateurs
  ALTER COLUMN role TYPE user_role USING role::text::user_role;
ALTER TABLE collaborateurs ALTER COLUMN role SET DEFAULT 'collaborateur';

DROP TYPE user_role_old;

-- 4) Recrée la fonction helper (retournait l'ancien type).
CREATE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT role FROM collaborateurs WHERE auth_id = auth.uid() AND actif = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 5) Recrée les policies avec 'admin' (fusion direction+admin).
CREATE POLICY "direction manages" ON collaborateurs FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "projets write" ON projets FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "taches admin write" ON taches FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "timers own" ON timers FOR ALL
  USING (collaborateur_id IN (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
         OR current_user_role() = 'admin')
  WITH CHECK (collaborateur_id IN (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
         OR current_user_role() = 'admin');

CREATE POLICY "bats write" ON bats FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "factures direction admin" ON factures FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "audit read direction" ON audit_log FOR SELECT
  USING (current_user_role() = 'admin');
