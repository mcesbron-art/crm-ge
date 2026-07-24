-- ============================================================
-- Migration 027 : workflow BAT (bon à tirer) au niveau tâche.
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Pré-requis : migrations 019 (tasks.stage), 022 (task_events), 025 (gabarit
-- task_billing_requests repris ici).
--
-- Contrairement à task_waits (un seul cycle attente/résolution), une tâche
-- peut accumuler PLUSIEURS révisions de BAT dans le temps (v1 refusée, v2
-- envoyée, v2 validée...) — chaque révision garde son propre cycle de vie
-- (waiting_feedback -> validated | rejected), jamais écrasée.
--
-- La colonne de statut "etat_bat" (migration 019) n'est PAS utilisée par ce
-- workflow : la transition va directement de bat_envoye vers a_faire (refus)
-- ou attente_diffusion/facturation (validation) — décision produit explicite
-- pour ne pas laisser de tâches bloquées dans une étape intermédiaire sans
-- action à faire.
-- ============================================================

CREATE TABLE IF NOT EXISTS task_bat_revisions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  version          INTEGER     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'waiting_feedback' CHECK (status IN (
                     'waiting_feedback', 'validated', 'rejected'
                   )),
  link             TEXT,
  send_comment     TEXT,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by          UUID        NOT NULL REFERENCES collaborateurs(id),
  returned_at      TIMESTAMPTZ,
  returned_by      UUID        REFERENCES collaborateurs(id),
  return_comment   TEXT,
  rejection_reason TEXT,
  next_stage       TEXT        CHECK (next_stage IN ('attente_diffusion', 'facturation')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_bat_revisions_task_version ON task_bat_revisions(task_id, version);
CREATE INDEX IF NOT EXISTS idx_task_bat_revisions_task ON task_bat_revisions(task_id);

DROP TRIGGER IF EXISTS trg_task_bat_revisions_updated ON task_bat_revisions;
CREATE TRIGGER trg_task_bat_revisions_updated
  BEFORE UPDATE ON task_bat_revisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- task_events : colonne de désambiguïsation, même principe que
-- billing_request_id (migration 025) — une tâche peut avoir plusieurs
-- révisions, il faut savoir à laquelle un événement se rattache.
-- ============================================================
ALTER TABLE task_events ADD COLUMN IF NOT EXISTS bat_revision_id UUID
  REFERENCES task_bat_revisions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_events_bat_revision ON task_events(bat_revision_id)
  WHERE bat_revision_id IS NOT NULL;

-- ============================================================
-- RLS — même schéma que task_waits/task_billing_requests : lecture ouverte
-- aux authentifiés, écriture au nom de soi-même ; l'autorisation réelle
-- (assigné à la tâche, ou direction) vit dans les routes API.
-- ============================================================
ALTER TABLE task_bat_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_bat_revisions select" ON task_bat_revisions;
CREATE POLICY "task_bat_revisions select" ON task_bat_revisions FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_bat_revisions insert" ON task_bat_revisions;
CREATE POLICY "task_bat_revisions insert" ON task_bat_revisions FOR INSERT
  WITH CHECK (sent_by = (SELECT id FROM collaborateurs WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "task_bat_revisions update" ON task_bat_revisions;
CREATE POLICY "task_bat_revisions update" ON task_bat_revisions FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- send_task_bat : atomique (nouvelle révision + passage en étape
-- "bat_envoye" + trace d'historique), PAS SECURITY DEFINER — même
-- rationale que create_billing_request (migration 025) : s'exécute avec
-- les droits RLS de l'appelant, l'autorisation (assigné, ou direction) est
-- vérifiée dans la route API avant cet appel.
-- ============================================================
CREATE OR REPLACE FUNCTION send_task_bat(
  p_task_id UUID,
  p_link TEXT,
  p_comment TEXT,
  p_collaborateur_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision_id UUID;
  v_version INTEGER;
  v_current_stage TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM task_bat_revisions WHERE task_id = p_task_id AND status = 'waiting_feedback') THEN
    RAISE EXCEPTION 'Un BAT est déjà en attente de retour sur cette tâche' USING ERRCODE = 'P0001';
  END IF;

  SELECT stage INTO v_current_stage FROM tasks WHERE id = p_task_id;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version FROM task_bat_revisions WHERE task_id = p_task_id;

  INSERT INTO task_bat_revisions (task_id, version, link, send_comment, sent_by)
  VALUES (p_task_id, v_version, p_link, p_comment, p_collaborateur_id)
  RETURNING id INTO v_revision_id;

  UPDATE tasks SET stage = 'bat_envoye' WHERE id = p_task_id;

  INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, comment, bat_revision_id)
  VALUES (p_task_id, p_collaborateur_id, 'bat_sent', v_current_stage, 'bat_envoye', p_comment, v_revision_id);

  RETURN v_revision_id;
END;
$$;

-- ============================================================
-- record_bat_result : enregistre validé/refusé sur une révision en
-- attente. Le choix "facturation" comme prochaine étape NE déplace PAS la
-- tâche ici — c'est le flux de création de demande de facturation
-- (create_billing_request, migration 025) qui le fera, une fois la
-- modale de type de facture complétée côté client. Sans ça, une tâche
-- pourrait atterrir en colonne Facturation sans aucune demande associée,
-- ce qui casserait l'invariant posé plus tôt (migration 025/026).
-- ============================================================
CREATE OR REPLACE FUNCTION record_bat_result(
  p_revision_id UUID,
  p_collaborateur_id UUID,
  p_status TEXT,
  p_return_comment TEXT,
  p_rejection_reason TEXT,
  p_next_stage TEXT
) RETURNS task_bat_revisions
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision task_bat_revisions%ROWTYPE;
  v_task_id UUID;
  v_current_stage TEXT;
  v_new_stage TEXT;
BEGIN
  SELECT * INTO v_revision FROM task_bat_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Révision de BAT introuvable';
  END IF;
  IF v_revision.status <> 'waiting_feedback' THEN
    RAISE EXCEPTION 'Cette révision a déjà un résultat enregistré' USING ERRCODE = 'P0001';
  END IF;

  v_task_id := v_revision.task_id;
  SELECT stage INTO v_current_stage FROM tasks WHERE id = v_task_id;

  UPDATE task_bat_revisions SET
    status           = p_status,
    returned_at      = now(),
    returned_by      = p_collaborateur_id,
    return_comment   = p_return_comment,
    rejection_reason = p_rejection_reason,
    next_stage       = p_next_stage
  WHERE id = p_revision_id
  RETURNING * INTO v_revision;

  IF p_status = 'rejected' THEN
    v_new_stage := 'a_faire';
    UPDATE tasks SET stage = v_new_stage WHERE id = v_task_id;
  ELSIF p_status = 'validated' AND p_next_stage = 'attente_diffusion' THEN
    v_new_stage := 'attente_diffusion';
    UPDATE tasks SET stage = v_new_stage WHERE id = v_task_id;
  ELSE
    v_new_stage := v_current_stage; -- validated + facturation : la tâche ne bouge pas ici
  END IF;

  INSERT INTO task_events (task_id, collaborateur_id, action, old_value, new_value, comment, bat_revision_id)
  VALUES (
    v_task_id, p_collaborateur_id,
    CASE WHEN p_status = 'rejected' THEN 'bat_rejected' ELSE 'bat_validated' END,
    v_current_stage, v_new_stage,
    COALESCE(p_rejection_reason, p_return_comment),
    p_revision_id
  );

  RETURN v_revision;
END;
$$;
