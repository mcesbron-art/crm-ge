-- ============================================================
-- Migration 007 : rendre axonaut_company_id nullable sur tickets
-- Nécessaire pour que les tickets importés depuis Axonaut (qui
-- peuvent ne pas avoir de client associé) puissent être insérés.
-- Les tickets manuels continuent de fournir ce champ.
-- ============================================================

ALTER TABLE tickets
  ALTER COLUMN axonaut_company_id DROP NOT NULL;
