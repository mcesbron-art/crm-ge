-- ============================================================
-- Schéma Supabase — CRM Groupe Écho
--
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Ensuite : seed.sql (données de démo) si souhaité.
--
-- Toutes les tables sont protégées par Row Level Security (RLS) :
-- les policies vérifient le rôle stocké dans `collaborateurs.role`.
-- ============================================================

-- ----------------------------------------
-- Extensions
-- ----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------
-- Enums
-- ----------------------------------------
CREATE TYPE user_role        AS ENUM ('direction', 'admin', 'collaborateur');
CREATE TYPE projet_type      AS ENUM ('Standard', 'Abonnement');
CREATE TYPE projet_statut    AS ENUM ('À affecter', 'En production', 'BAT en cours', 'Facturé', 'Clôturé');
CREATE TYPE tache_statut     AS ENUM ('Brief', 'À faire', 'En cours', 'Attente élément', 'En attente validation client',
                                       'BAT envoyé', 'BAT OK', 'BAT à modifier', 'Terminé');
CREATE TYPE bat_statut       AS ENUM ('envoye', 'valide', 'modifier');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'meeting');
CREATE TYPE deal_statut      AS ENUM ('prospect', 'negotiation', 'won', 'lost');

-- ============================================================
-- TABLE collaborateurs (= utilisateurs du CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS collaborateurs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nom         TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  pole        TEXT,
  avatar      TEXT,
  color       TEXT,
  base_heures NUMERIC(4,1) NOT NULL DEFAULT 35,
  role        user_role NOT NULL DEFAULT 'collaborateur',
  actif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collaborateurs_email   ON collaborateurs(email);
CREATE INDEX idx_collaborateurs_auth_id ON collaborateurs(auth_id);

-- ============================================================
-- TABLE projets
-- ============================================================
CREATE TABLE IF NOT EXISTS projets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  axonaut_id   BIGINT UNIQUE,                -- id du devis source dans Axonaut
  nom          TEXT NOT NULL,
  client       TEXT NOT NULL,
  type         projet_type NOT NULL DEFAULT 'Standard',
  statut       projet_statut NOT NULL DEFAULT 'À affecter',
  montant_ht   NUMERIC(12,2) NOT NULL DEFAULT 0,
  cout_revient NUMERIC(12,2) NOT NULL DEFAULT 0,
  axonaut_company_id BIGINT,                  -- id Axonaut du client (utilisé pour facturation)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projets_statut     ON projets(statut);
CREATE INDEX idx_projets_axonaut_id ON projets(axonaut_id);

-- ============================================================
-- TABLE taches
-- ============================================================
CREATE TABLE IF NOT EXISTS taches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id       UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  nom             TEXT NOT NULL,
  statut          tache_statut NOT NULL DEFAULT 'Brief',
  priorite        TEXT NOT NULL DEFAULT 'moyenne',
  montant_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cout_revient    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- temps_alloue est dérivé : (montant_ht - cout_revient) / 83
  temps_alloue    NUMERIC(6,2) NOT NULL DEFAULT 0,
  temps_consomme  NUMERIC(6,2) NOT NULL DEFAULT 0,
  echeance        DATE,
  abonnement      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taches_projet     ON taches(projet_id);
CREATE INDEX idx_taches_collab     ON taches(collaborateur_id);
CREATE INDEX idx_taches_statut     ON taches(statut);

-- ============================================================
-- TABLE timers (suivi du temps de production)
-- ============================================================
CREATE TABLE IF NOT EXISTS timers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tache_id        UUID NOT NULL REFERENCES taches(id) ON DELETE CASCADE,
  collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
  debut           TIMESTAMPTZ NOT NULL,
  fin             TIMESTAMPTZ,
  duree_secondes  INTEGER,
  source          TEXT DEFAULT 'play',  -- 'play' (auto) ou 'manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timers_tache  ON timers(tache_id);
CREATE INDEX idx_timers_collab ON timers(collaborateur_id);
CREATE INDEX idx_timers_debut  ON timers(debut DESC);

-- ============================================================
-- TABLE bats (Bons à tirer)
-- ============================================================
CREATE TABLE IF NOT EXISTS bats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tache_id      UUID NOT NULL REFERENCES taches(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,             -- token public (lien client)
  version       INTEGER NOT NULL DEFAULT 1,
  pdf_path      TEXT,                              -- chemin Supabase Storage
  pdf_size      BIGINT,
  statut        bat_statut NOT NULL DEFAULT 'envoye',
  uploaded_by   UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_by     TEXT,
  signed_at     TIMESTAMPTZ,
  commentaire   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bats_tache  ON bats(tache_id);
CREATE INDEX idx_bats_token  ON bats(token);
CREATE INDEX idx_bats_statut ON bats(statut);

-- ============================================================
-- TABLE factures (paliers 30/50/100 % + lien Axonaut)
-- ============================================================
CREATE TABLE IF NOT EXISTS factures (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id         UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  palier            INTEGER NOT NULL CHECK (palier IN (30, 50, 100)),
  montant_ht        NUMERIC(12,2) NOT NULL,
  axonaut_id        BIGINT UNIQUE,             -- id de la facture créée dans Axonaut
  axonaut_number    TEXT,                       -- numéro de facture Axonaut
  axonaut_status    TEXT,                       -- 'draft' | 'sent' | 'paid' | 'late' | ...
  axonaut_synced_at TIMESTAMPTZ,
  commentaire       TEXT,
  created_by        UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_factures_projet     ON factures(projet_id);
CREATE INDEX idx_factures_axonaut_id ON factures(axonaut_id);

-- ============================================================
-- TABLE audit_log (traçabilité — sprint 5)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,           -- 'tache.statut.change', 'bat.upload', 'facture.create', ...
  entity_type     TEXT,                     -- 'tache', 'bat', 'facture', ...
  entity_id       UUID,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_collab     ON audit_log(collaborateur_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projets_updated BEFORE UPDATE ON projets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_taches_updated BEFORE UPDATE ON taches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE collaborateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- Helper : récupère le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT role FROM collaborateurs WHERE auth_id = auth.uid() AND actif = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- collaborateurs : tous lisent, seule la direction modifie
CREATE POLICY "read all" ON collaborateurs FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "direction manages" ON collaborateurs FOR ALL
  USING (current_user_role() = 'direction')
  WITH CHECK (current_user_role() = 'direction');

-- projets : tous lisent, direction+admin modifient
CREATE POLICY "projets read" ON projets FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "projets write" ON projets FOR ALL
  USING (current_user_role() IN ('direction', 'admin'))
  WITH CHECK (current_user_role() IN ('direction', 'admin'));

-- taches : tous lisent, direction+admin modifient (les collabs peuvent updater leurs propres tâches)
CREATE POLICY "taches read" ON taches FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "taches admin write" ON taches FOR ALL
  USING (current_user_role() IN ('direction', 'admin'))
  WITH CHECK (current_user_role() IN ('direction', 'admin'));
CREATE POLICY "taches own update" ON taches FOR UPDATE
  USING (collaborateur_id IN (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

-- timers : un collab voit/écrit les siens, direction voit tous
CREATE POLICY "timers own" ON timers FOR ALL
  USING (collaborateur_id IN (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
         OR current_user_role() IN ('direction', 'admin'))
  WITH CHECK (collaborateur_id IN (SELECT id FROM collaborateurs WHERE auth_id = auth.uid())
         OR current_user_role() IN ('direction', 'admin'));

-- bats : tous lisent (pour visualisation), direction+admin créent/modifient
CREATE POLICY "bats read" ON bats FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "bats write" ON bats FOR ALL
  USING (current_user_role() IN ('direction', 'admin'))
  WITH CHECK (current_user_role() IN ('direction', 'admin'));

-- factures : direction+admin uniquement
CREATE POLICY "factures direction admin" ON factures FOR ALL
  USING (current_user_role() IN ('direction', 'admin'))
  WITH CHECK (current_user_role() IN ('direction', 'admin'));

-- audit_log : direction lit, le système écrit (via service_role)
CREATE POLICY "audit read direction" ON audit_log FOR SELECT
  USING (current_user_role() = 'direction');

-- ============================================================
-- VIEW : projets enrichis (avec totaux temps + marge)
-- ============================================================
CREATE OR REPLACE VIEW projets_enriched AS
SELECT
  p.*,
  (p.montant_ht - p.cout_revient) AS marge,
  COALESCE((SELECT SUM(temps_alloue)   FROM taches WHERE projet_id = p.id), 0) AS total_temps_alloue,
  COALESCE((SELECT SUM(temps_consomme) FROM taches WHERE projet_id = p.id), 0) AS total_temps_consomme,
  COALESCE((SELECT SUM(montant_ht)     FROM factures WHERE projet_id = p.id), 0) AS total_facture
FROM projets p;

-- ============================================================
-- BUCKET Storage (à créer manuellement dans Supabase UI)
-- ============================================================
-- Bucket : "bats"
-- Visibilité : private (lecture via URL signée uniquement)
-- Policy : seule l'app via service_role peut uploader/lire
-- TTL des liens signés : 24-48h pour les liens client de validation BAT
