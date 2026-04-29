-- ============================================================
-- Migration 001 : tables Clients + Commerciaux + Opportunites
-- À exécuter dans Supabase SQL Editor (une seule fois).
-- Pré-requis : schema.sql déjà exécuté.
-- ============================================================

-- Table clients (base de données clients de l'agence)
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom             TEXT NOT NULL,
  secteur         TEXT,
  contact_nom     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  adresse         TEXT,
  notes           TEXT,
  axonaut_id      BIGINT UNIQUE,
  actif           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_actif ON clients(actif);

-- Table commerciaux (peuvent être liés ou non à un compte CRM)
CREATE TABLE IF NOT EXISTS commerciaux (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom             TEXT NOT NULL UNIQUE,
  email           TEXT,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  actif           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Type ENUM pour le statut d'opportunité
DO $$ BEGIN
  CREATE TYPE opportunity_status AS ENUM ('demande', 'contacte', 'devis', 'gagne', 'perdu');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Table opportunites (le cœur du pipeline commercial)
CREATE TABLE IF NOT EXISTS opportunites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre           TEXT NOT NULL,
  description     TEXT,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  commercial_id   UUID NOT NULL REFERENCES commerciaux(id),
  demandeur_id    UUID NOT NULL REFERENCES collaborateurs(id),
  montant_estime  NUMERIC(12,2),
  statut          opportunity_status NOT NULL DEFAULT 'demande',
  resultat_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opportunites_statut     ON opportunites(statut);
CREATE INDEX IF NOT EXISTS idx_opportunites_commercial ON opportunites(commercial_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_client     ON opportunites(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_demandeur  ON opportunites(demandeur_id);

-- Trigger updated_at (la fonction set_updated_at existe déjà depuis schema.sql)
DROP TRIGGER IF EXISTS trg_opportunites_updated ON opportunites;
CREATE TRIGGER trg_opportunites_updated BEFORE UPDATE ON opportunites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS : tous les utilisateurs authentifiés peuvent lire et écrire
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerciaux  ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients all auth" ON clients;
CREATE POLICY "clients all auth" ON clients FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "commerciaux all auth" ON commerciaux;
CREATE POLICY "commerciaux all auth" ON commerciaux FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "opportunites all auth" ON opportunites;
CREATE POLICY "opportunites all auth" ON opportunites FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Commerciaux : Maryline (liée à son compte CRM) + Loris (externe)
INSERT INTO commerciaux (nom, email, collaborateur_id)
SELECT 'Maryline', 'm.cesbron@groupe-echo.fr', id
FROM collaborateurs
WHERE email = 'm.cesbron@groupe-echo.fr'
ON CONFLICT (nom) DO NOTHING;

INSERT INTO commerciaux (nom, email)
VALUES ('Loris', NULL)
ON CONFLICT (nom) DO NOTHING;

-- Quelques clients de démonstration (à enrichir ensuite via l'UI)
INSERT INTO clients (nom, secteur, contact_nom, contact_email, contact_phone) VALUES
  ('Maison Relais Gourmet', 'Restauration',  'Élise Dumas',         'elise@maisonrelaisgourmet.fr', '02 51 22 33 44'),
  ('Netzy',                 'Tech',          'Marie Bouvet',        'contact@netzy.fr',             '06 98 76 54 32'),
  ('BÉRYL Patrimoine',      'Finance',       'Jean Bertrand',       'j.bertrand@beryl.fr',          '02 41 88 90 21'),
  ('Vins d''Anjou-Saumur',  'Vinicole',      'Karine Leduc',        'karine@vins-anjou.fr',         NULL),
  ('Roul''Anjou',           'Industrie',     'B. Aulié',            'contact@roulanjou.fr',         NULL),
  ('Acme Corp',             'Commerce',      'Vincent Delcourt',    'v.delcourt@acme.fr',           '02 41 33 44 55'),
  ('Atelier Métal',         'Artisanat',     'Pierre Roussel',      'p.roussel@atelier-metal.com',  '02 41 88 90 21'),
  ('OpenForm Éducation',    'Éducation',     'Thierry Nguyen',      'tnguyen@openform-edu.fr',      '06 11 22 33 44');
