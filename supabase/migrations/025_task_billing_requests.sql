-- ============================================================
-- Migration 025 : demandes de facturation par tâche (workflow partagé
-- Collaborateur / Admin — colonne "Facturation" du Kanban de production).
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migrations 019 (tasks.stage), 022 (task_events), 024 (task_waits, gabarit repris ici).
--
-- Le Collaborateur choisit uniquement un type de facture (acompte /
-- intermédiaire / totale) au moment de l'envoi en facturation. Toutes les
-- informations comptables (montant, %, n° facture, statut) sont ensuite
-- gérées exclusivement par direction/admin (permission manage_billing,
-- lib/permissions.ts) depuis l'onglet dédié de /facturation.
--
-- Contrairement à task_waits, une tâche peut accumuler PLUSIEURS demandes
-- de facturation dans le temps (acompte puis solde) — donc pas de notion
-- de "demande active unique" ni de restauration d'étape automatique :
-- "Facturation" est une étape persistante, pas un aller-retour ponctuel.
-- ============================================================

CREATE TABLE IF NOT EXISTS task_billing_requests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  billing_type    TEXT        NOT NULL CHECK (billing_type IN (
                    'acompte', 'intermediaire', 'totale'
                  )),
  billing_status  TEXT        NOT NULL DEFAULT 'a_facturer' CHECK (billing_status IN (
                    'a_facturer', 'informations_manquantes', 'facture_creee',
                    'facturation_terminee', 'annulee'
                  )),
  amount          NUMERIC(12,2) CHECK (amount IS NULL OR amount >= 0),
  percentage      NUMERIC(5,2)  CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
  invoice_number  TEXT,
  invoice_date    DATE,
  admin_comment   TEXT,
  requested_by    UUID        NOT NULL REFERENCES collaborateurs(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_by    UUID        REFERENCES collaborateurs(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_billing_requests_task   ON task_billing_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_task_billing_requests_status ON task_billing_requests(billing_status);

-- même pattern que sur tasks/task_waits (fonction définie dans schema.sql)
DROP TRIGGER IF EXISTS trg_task_billing_requests_updated ON task_billing_requests;
CREATE TRIGGER trg_task_billing_requests_updated
  BEFORE UPDATE ON task_billing_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- task_events : colonne de désambiguïsation. Nécessaire dès lors que
-- plusieurs demandes peuvent être ouvertes simultanément sur la même
-- tâche — sans elle, impossible de savoir à quelle demande un
-- commentaire/changement appartient. Nullable : les actions existantes
-- (stage_changed, waiting_started/resolved) restent NULL.
-- ============================================================
ALTER TABLE task_events ADD COLUMN IF NOT EXISTS billing_request_id UUID
  REFERENCES task_billing_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_events_billing_request ON task_events(billing_request_id)
  WHERE billing_request_id IS NOT NULL;

-- ============================================================
-- RLS — même schéma que task_waits/task_events : lecture ouverte aux
-- authentifiés, écriture au nom de soi-même ; l'autorisation réelle
-- (assigné à la tâche pour créer, manage_billing pour gérer) vit dans
-- les routes API.
-- ============================================================
ALTER TABLE task_billing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_billing_requests select" ON task_billing_requests;
CREATE POLICY "task_billing_requests select" ON task_billing_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_billing_requests insert" ON task_billing_requests;
CREATE POLICY "task_billing_requests insert" ON task_billing_requests FOR INSERT
  WITH CHECK (requested_by = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "task_billing_requests update" ON task_billing_requests;
CREATE POLICY "task_billing_requests update" ON task_billing_requests FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- create_billing_request : atomique (demande + passage en étape
-- "facturation" + trace d'historique), PAS SECURITY DEFINER — même
-- rationale que start_task_wait/log_task_time (migrations 024/021) :
-- s'exécute avec les droits RLS de l'appelant, l'autorisation (assigné à
-- la tâche, ou rôle privilégié) est vérifiée dans la route API avant cet
-- appel.
-- ============================================================
CREATE OR REPLACE FUNCTION create_billing_request(
  p_task_id UUID,
  p_billing_type TEXT,
  p_collaborateur_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id UUID;
  v_current_stage TEXT;
BEGIN
  SELECT stage INTO v_current_stage FROM tasks WHERE id = p_task_id;

  INSERT INTO task_billing_requests (task_id, billing_type, requested_by)
  VALUES (p_task_id, p_billing_type, p_collaborateur_id)
  RETURNING id INTO v_request_id;

  UPDATE tasks SET stage = 'facturation' WHERE id = p_task_id;

  INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
  VALUES (p_task_id, p_collaborateur_id, 'billing_requested', v_current_stage, p_billing_type, v_request_id);

  RETURN v_request_id;
END;
$$;

-- ============================================================
-- update_billing_request : reçoit l'état cible complet (déjà fusionné
-- côté route API avec l'existant pour les champs non fournis dans un
-- PATCH partiel), diffe champ par champ contre l'ancien et journalise une
-- ligne task_events par champ modifié — c'est le mécanisme d'historique
-- complet du workflow de facturation.
-- ============================================================
CREATE OR REPLACE FUNCTION update_billing_request(
  p_request_id UUID,
  p_collaborateur_id UUID,
  p_billing_status TEXT,
  p_amount NUMERIC,
  p_percentage NUMERIC,
  p_invoice_number TEXT,
  p_invoice_date DATE,
  p_admin_comment TEXT
) RETURNS task_billing_requests
LANGUAGE plpgsql
AS $$
DECLARE
  v_old task_billing_requests%ROWTYPE;
  v_new task_billing_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM task_billing_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de facturation introuvable';
  END IF;

  UPDATE task_billing_requests SET
    billing_status = p_billing_status,
    amount         = p_amount,
    percentage     = p_percentage,
    invoice_number = p_invoice_number,
    invoice_date   = p_invoice_date,
    admin_comment  = p_admin_comment,
    processed_by   = p_collaborateur_id,
    processed_at   = now()
  WHERE id = p_request_id
  RETURNING * INTO v_new;

  IF v_old.billing_status IS DISTINCT FROM v_new.billing_status THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_status_changed', v_old.billing_status, v_new.billing_status, p_request_id);
  END IF;
  IF v_old.amount IS DISTINCT FROM v_new.amount THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_amount_changed', v_old.amount::TEXT, v_new.amount::TEXT, p_request_id);
  END IF;
  IF v_old.percentage IS DISTINCT FROM v_new.percentage THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_percentage_changed', v_old.percentage::TEXT, v_new.percentage::TEXT, p_request_id);
  END IF;
  IF v_old.invoice_number IS DISTINCT FROM v_new.invoice_number THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_invoice_number_changed', v_old.invoice_number, v_new.invoice_number, p_request_id);
  END IF;
  IF v_old.invoice_date IS DISTINCT FROM v_new.invoice_date THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_invoice_date_changed', v_old.invoice_date::TEXT, v_new.invoice_date::TEXT, p_request_id);
  END IF;
  IF v_old.admin_comment IS DISTINCT FROM v_new.admin_comment THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_comment_changed', v_old.admin_comment, v_new.admin_comment, p_request_id);
  END IF;

  RETURN v_new;
END;
$$;
