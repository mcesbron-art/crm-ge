-- ============================================================
-- Migration 026 : simplification des demandes de facturation.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migration 025 (task_billing_requests).
--
-- Le CRM ne crée jamais la facture (ça reste le rôle d'Axonaut, fait par la
-- comptable) : il ne sert qu'à centraliser la demande, suivre son
-- avancement via un statut, et transmettre un commentaire comptable
-- optionnel. Les champs montant/pourcentage/n° facture/date facture
-- n'ont donc plus leur place ici.
--
-- billing_status change de sens : ce n'est plus un statut de traitement
-- générique (à facturer / infos manquantes / facture créée / terminée /
-- annulée) mais directement l'étape de facturation atteinte, avec le même
-- vocabulaire que billing_type (acompte/intermédiaire/totale) + une valeur
-- "à traiter" pour une demande pas encore regardée par la comptable.
-- billing_type reste la demande initiale figée du collaborateur ;
-- billing_status peut diverger si la comptable a fait autre chose dans
-- Axonaut — ce sont deux informations distinctes, volontairement gardées
-- séparées (cf. commentaire de create_billing_request plus bas).
-- ============================================================

-- L'ancien CHECK doit être retiré AVANT de normaliser les données : les
-- nouvelles valeurs (acompte/intermediaire/totale comme statut, pas
-- seulement comme type) ne sont pas encore autorisées tant qu'il est actif.
ALTER TABLE task_billing_requests DROP CONSTRAINT IF EXISTS task_billing_requests_billing_status_check;

-- Normalise les données existantes (test uniquement à ce stade, aucun usage
-- réel encore) : "facture créée"/"facturation terminée" -> le type
-- effectivement demandé ; "informations manquantes"/"annulée" -> à traiter
-- (aucun équivalent direct).
UPDATE task_billing_requests SET billing_status = billing_type
  WHERE billing_status IN ('facture_creee', 'facturation_terminee');
UPDATE task_billing_requests SET billing_status = 'a_facturer'
  WHERE billing_status IN ('informations_manquantes', 'annulee');

ALTER TABLE task_billing_requests ADD CONSTRAINT task_billing_requests_billing_status_check
  CHECK (billing_status IN ('a_facturer', 'acompte', 'intermediaire', 'totale'));

ALTER TABLE task_billing_requests
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS percentage,
  DROP COLUMN IF EXISTS invoice_number,
  DROP COLUMN IF EXISTS invoice_date;

-- ============================================================
-- update_billing_request : remplace la version de la migration 025,
-- réduite à statut + commentaire comptable (mêmes principes : reçoit
-- l'état cible complet, diffe contre l'ancien, journalise un événement par
-- champ effectivement modifié — PAS SECURITY DEFINER, autorisation vérifiée
-- dans la route API avant l'appel).
-- ============================================================
DROP FUNCTION IF EXISTS update_billing_request(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT);

CREATE OR REPLACE FUNCTION update_billing_request(
  p_request_id UUID,
  p_collaborateur_id UUID,
  p_billing_status TEXT,
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
    admin_comment  = p_admin_comment,
    processed_by   = p_collaborateur_id,
    processed_at   = now()
  WHERE id = p_request_id
  RETURNING * INTO v_new;

  IF v_old.billing_status IS DISTINCT FROM v_new.billing_status THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_status_changed', v_old.billing_status, v_new.billing_status, p_request_id);
  END IF;
  IF v_old.admin_comment IS DISTINCT FROM v_new.admin_comment THEN
    INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, billing_request_id)
    VALUES (v_old.task_id, p_collaborateur_id, 'billing_comment_changed', v_old.admin_comment, v_new.admin_comment, p_request_id);
  END IF;

  RETURN v_new;
END;
$$;
