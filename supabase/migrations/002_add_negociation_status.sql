-- Ajoute la valeur 'negociation' à l'ENUM opportunity_status
-- À exécuter dans Supabase > SQL Editor
ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'negociation';
