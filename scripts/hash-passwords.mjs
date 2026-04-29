#!/usr/bin/env node
/**
 * Script interactif pour générer les hashs bcrypt des mots de passe utilisateurs.
 *
 * Utilisation :
 *   node scripts/hash-passwords.mjs
 *
 * Le script vous demande un mot de passe pour chaque utilisateur,
 * puis vous affiche la valeur JSON à coller dans :
 *   - Vercel : Settings > Environment Variables > USER_PASSWORDS_JSON
 *   - Local  : .env.local (si vous voulez tester en local)
 *
 * Il génère aussi une SESSION_SECRET aléatoire prête à l'emploi.
 */

import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";

const USERS = [
  { email: "maryline@groupe-echo.fr",  nom: "Maryline (Direction)" },
  { email: "noemie@groupe-echo.fr",    nom: "Noémie (Graphisme)" },
  { email: "amandine@groupe-echo.fr",  nom: "Amandine (Web/SEO)" },
  { email: "jeremy@groupe-echo.fr",    nom: "Jérémy (Social Media)" },
  { email: "marcellin@groupe-echo.fr", nom: "Marcellin (SEO/SEA)" },
  { email: "arthur@groupe-echo.fr",    nom: "Arthur (Sites/Ads)" },
  { email: "fanny@groupe-echo.fr",     nom: "Fanny (Planning · Admin)" },
];

const COST = 10; // bcrypt cost factor (10 = bon compromis sécurité/perf)

function suggestPassword() {
  // Génère une suggestion : 4 mots aléatoires courts + 2 chiffres
  const words = [
    "cafe", "lune", "vent", "neige", "echo", "sable", "pluie", "feu",
    "miel", "rose", "bois", "ile", "etoile", "nuit", "aube", "sel",
  ];
  const w = () => words[Math.floor(Math.random() * words.length)];
  const n = () => Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `${w()}-${w()}-${n()}`;
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log("\n=================================================");
  console.log(" CRM Groupe Écho — Génération mots de passe");
  console.log("=================================================\n");
  console.log("Pour chaque utilisateur, tapez le mot de passe souhaité (ou Entrée pour générer un mot de passe aléatoire).\n");

  const passwords = {};
  const plainTextSummary = [];

  for (const u of USERS) {
    const suggestion = suggestPassword();
    const answer = (await rl.question(`  ${u.nom}\n    [${u.email}]\n    Mot de passe (ou Entrée pour utiliser "${suggestion}") : `)).trim();
    const plain = answer || suggestion;
    if (plain.length < 4) {
      console.log("    ⚠ Trop court — utilisation de la suggestion.");
    }
    const finalPlain = plain.length < 4 ? suggestion : plain;
    const hash = await bcrypt.hash(finalPlain, COST);
    passwords[u.email] = hash;
    plainTextSummary.push({ email: u.email, nom: u.nom, password: finalPlain });
    console.log("");
  }

  await rl.close();

  // Génère une SESSION_SECRET aléatoire de 32 octets en base64
  const sessionSecret = randomBytes(32).toString("base64");

  console.log("\n=================================================");
  console.log(" RÉCAP : MOTS DE PASSE À NOTER ET DISTRIBUER");
  console.log("=================================================\n");
  console.log("⚠  GARDEZ CETTE LISTE EN LIEU SÛR (gestionnaire de mots de passe).");
  console.log("⚠  NE LA PARTAGEZ PAS PAR EMAIL EN CLAIR.\n");
  for (const s of plainTextSummary) {
    console.log(`  ${s.nom}`);
    console.log(`    Email    : ${s.email}`);
    console.log(`    Password : ${s.password}\n`);
  }

  console.log("\n=================================================");
  console.log(" À COPIER DANS VERCEL — Environment Variables");
  console.log("=================================================\n");
  console.log("Variable 1 :");
  console.log("  Key   : USER_PASSWORDS_JSON");
  console.log(`  Value : ${JSON.stringify(passwords)}\n`);
  console.log("Variable 2 :");
  console.log("  Key   : SESSION_SECRET");
  console.log(`  Value : ${sessionSecret}\n`);
  console.log("Cocher pour les 3 environnements : Production, Preview, Development\n");
  console.log("Une fois ajoutées dans Vercel : Deployments > redeploy le dernier déploiement.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
