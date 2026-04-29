# Guide de déploiement — CRM Groupe Écho

Cible : **Vercel** (hébergement Next.js) + **Supabase** (base + auth + storage) + **Axonaut** (devis & factures).

Toutes les données restent en **UE** (Vercel `cdg1` à Paris, Supabase EU, Axonaut FR).

---

## 1. Prérequis

- Compte **GitHub** : https://github.com (gratuit)
- Compte **Vercel** : https://vercel.com (gratuit)
- Compte **Supabase** : https://supabase.com (gratuit)
- Compte **Axonaut** actif (vous l'avez déjà)
- Un domaine personnalisé (optionnel) : `crm.groupe-echo.fr` par exemple

---

## 2. Pousser le code sur GitHub

```powershell
cd "$env:USERPROFILE\Documents\crm-groupe-echo"
git init
git add .
git commit -m "Initial commit — CRM Groupe Echo"
# Créer un repo privé "crm-groupe-echo" sur github.com puis :
git remote add origin git@github.com:VOTRE_USERNAME/crm-groupe-echo.git
git branch -M main
git push -u origin main
```

⚠️ **Vérifiez** que `.env.local` est bien dans `.gitignore` (déjà fait par défaut). Aucune clé secrète ne doit aller sur GitHub.

---

## 3. Provisionner Supabase

1. https://supabase.com → **New project**
   - Name : `crm-groupe-echo`
   - Region : **Europe (Paris)** ou **EU West (Frankfurt)**
   - Pricing : **Free**
   - Database password : un mot de passe fort (gardez-le)
2. Une fois prêt, ouvrez **SQL Editor** → New query → collez le contenu de [`supabase/schema.sql`](supabase/schema.sql) → Run
3. Allez dans **Storage** → New bucket → nom `bats`, visibilité **Private**
4. **Project Settings → API** : récupérez 3 valeurs
   - `Project URL` → `https://xxxxxxxx.supabase.co`
   - `anon public` → `eyJ...`
   - `service_role secret` → `eyJ...` (⚠️ ne jamais exposer côté client)

---

## 4. Récupérer la clé API Axonaut

1. Connectez-vous à Axonaut
2. **Paramètres → API → Clé API**
3. ⚠️ **Régénérez** la clé (l'ancienne `e6b47bf6...` est compromise — elle a fuité dans le guide d'origine)
4. Copiez la nouvelle clé en lieu sûr (gestionnaire de mots de passe)

---

## 5. Déployer sur Vercel

### 5.1 Importer le projet

1. https://vercel.com → **Add new → Project**
2. **Import Git Repository** → sélectionnez `crm-groupe-echo`
3. Framework : Next.js (détecté automatiquement)
4. Region : **cdg1** (Paris) — déjà configuré dans `vercel.json`
5. **Ne cliquez pas Deploy tout de suite** — configurez d'abord les variables ci-dessous

### 5.2 Variables d'environnement

Dans Vercel → **Settings → Environment Variables**, ajoutez :

| Nom | Valeur | Environnements |
|---|---|---|
| `AXONAUT_API_KEY` | (votre nouvelle clé Axonaut) | Production, Preview |
| `AXONAUT_API_URL` | `https://axonaut.com/api/v2` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://crm.groupe-echo.fr` (ou l'URL Vercel) | Production, Preview |
| `NEXT_PUBLIC_TAUX_HORAIRE_REFERENCE` | `83` | Production, Preview |

Cochez bien `Production` ET `Preview` pour chaque variable.

### 5.3 Déployer

Cliquez **Deploy**. Premier build ~2 minutes. Vous obtenez une URL `https://crm-groupe-echo-xxxx.vercel.app`.

### 5.4 Domaine personnalisé (optionnel)

Vercel → **Settings → Domains → Add** → `crm.groupe-echo.fr`. Vercel vous donne un enregistrement DNS (CNAME) à ajouter chez votre registrar (OVH, Gandi, etc.). Le HTTPS est généré automatiquement en 5-10 min.

---

## 6. Vérifier la sécurité

Après déploiement, testez avec ces 2 outils gratuits :

- **https://securityheaders.com** → entrez votre URL → vous devez avoir un score **A** minimum
- **https://observatory.mozilla.org** → idem, score **A** ou **A+**

Vérifications à faire dans la console Chrome (F12) :
- Onglet **Network** → cliquez la requête principale → onglet **Headers** → vérifiez :
  - `Strict-Transport-Security: max-age=63072000`
  - `X-Frame-Options: SAMEORIGIN`
  - `Content-Security-Policy` présent
  - **Pas** de header `X-Powered-By`

---

## 7. Tester l'intégration Axonaut

1. Allez sur `https://votre-url/administration` (en tant que Direction)
2. Section **Intégration Axonaut**
3. Cliquez **"Tester"** → vous devez voir `✓ Connexion OK · première entreprise : XXX`
4. Cliquez **"↻ Synchroniser"** → vous voyez le nombre de devis validés importés
5. Pour tester la facturation : `/facturation` → "30%" sur un projet → cochez "Créer aussi la facture dans Axonaut" → Confirmer
6. Vérifiez dans Axonaut que la facture brouillon est bien apparue

---

## 8. Mise en production réelle (checklist)

Avant d'ouvrir le CRM aux utilisateurs réels :

- [ ] Auth Supabase configurée (Sprint 1.3 du guide initial)
- [ ] Comptes collaborateurs créés via la page Administration
- [ ] Emails d'invitation envoyés (les collabs créent leur propre mot de passe)
- [ ] La data demo (mocks) est remplacée par les vraies données Axonaut
- [ ] Test d'accès en mode **Collaborateur** : aucun montant € visible
- [ ] Backups Supabase activés (paramètres du projet)
- [ ] **Régénération de la clé Axonaut compromise faite** ✅
- [ ] `.env.local` ne contient AUCUNE clé en clair sur le poste de dev (ou alors poste chiffré)
- [ ] DPA Vercel + Supabase signés (RGPD)

---

## 9. Mises à jour futures

Chaque commit sur `main` redéploie automatiquement Vercel.

Pour rebrancher vers Supabase au lieu de localStorage (mocks) :

1. Décommentez les imports `@supabase/supabase-js` (à installer : `npm install @supabase/supabase-js`)
2. Remplacez `INITIAL_BATS`, `INITIAL_USERS`, `INITIAL_TACHES` etc. par des appels Supabase
3. La structure des types est déjà alignée avec le schéma SQL

---

## 10. Support

- **Doc Vercel** : https://vercel.com/docs
- **Doc Supabase** : https://supabase.com/docs
- **Doc Axonaut API** : https://axonaut.com/api/doc/
- **Headers de sécurité** : https://owasp.org/www-project-secure-headers/

Pour les problèmes spécifiques au CRM, ouvrez Claude Code et décrivez le bug — il pourra investiguer le code et proposer un correctif.
