export const AV: Record<string, string> = { N:"#7C3AED", AD:"#0E7C66", T:"#2563EB", NK:"#BE185D", J:"#16A34A" };
export const ROSTER: Record<string, string> = { N:"Nina R.", AD:"Adèle D.", T:"Thomas L.", NK:"Naïma K.", J:"Julien P." };
export const ORDER = ["N","AD","T","NK","J"];

export const PRIO: Record<string,{color:string;rank:number}> = {
  Urgente:{ color:"#B91C1C", rank:0 },
  Haute:  { color:"#C2530B", rank:1 },
  Normale:{ color:"#2563EB", rank:2 },
  Basse:  { color:"#8C8B83", rank:3 },
};
export const PRIO_ORDER = ["Basse","Normale","Haute","Urgente"];

export const STATUS: Record<string,{color:string;bg:string}> = {
  "Nouveau":    { color:"#B08D32", bg:"#F6EFDD" },
  "En cours":   { color:"#2563EB", bg:"#E6EEFB" },
  "En attente": { color:"#C2530B", bg:"#FBEAE0" },
  "Résolu":     { color:"#1F8A5B", bg:"#E4F3EC" },
  "Fermé":      { color:"#6E6A5E", bg:"#EFEDE8" },
};
export const STATUS_ORDER = ["Nouveau","En cours","En attente","Résolu","Fermé"];

export const TAG: Record<string,{color:string;bg:string}> = {
  Bug:          { color:"#B91C1C", bg:"#FBE9E7" },
  Urgent:       { color:"#C2530B", bg:"#FBEAE0" },
  Demande:      { color:"#2563EB", bg:"#E6EEFB" },
  Design:       { color:"#7C3AED", bg:"#EFE9FB" },
  SEO:          { color:"#0E7C66", bg:"#E1F1EC" },
  Contenu:      { color:"#9A7B22", bg:"#F6EFDD" },
  Hébergement:  { color:"#475569", bg:"#EEF1F5" },
  Relance:      { color:"#BE185D", bg:"#FCE7F0" },
};
export const TAG_ORDER = ["Bug","Urgent","Demande","Design","SEO","Contenu","Hébergement","Relance"];

export const CLIENTS: Record<string,{ini:string;projects:string[]}> = {
  "Maison Relais Gourmet": { ini:"MR", projects:["Maison Relais","Site e-commerce"] },
  "Netzy":                 { ini:"NZ", projects:["Netzy — Refonte","Maintenance"] },
  "InterLoire":            { ini:"VA", projects:["Vins d'Anjou","SEO Vins d'Anjou"] },
  "BÉRYL Patrimoine":      { ini:"BP", projects:["BÉRYL Patrimoine","Identité visuelle"] },
  "Studio Mira":           { ini:"SM", projects:["Studio Mira","Film de marque"] },
};

export type Ticket = {
  id: number; ref: string; title: string;
  client: string; clientInitials: string; project: string;
  priority: string; status: string;
  created: string; cOrd: number; modified: string; mOrd: number;
  echanges: number; tags: string[]; owner: string; collabs: string[];
  description?: string;
};

export type Comment = {
  id: number; author: string; date: string; body: string; internal?: boolean;
};

function mk(ref:string,title:string,client:string,project:string,priority:string,status:string,created:string,cOrd:number,modified:string,mOrd:number,echanges:number,tags:string[],owner:string,collabs:string[],description?:string): Ticket {
  return { id: parseInt(ref.replace(/\D/g,""),10), ref, title, client, clientInitials: CLIENTS[client]?.ini ?? "?", project, priority, status, created, cOrd, modified, mOrd, echanges, tags, owner, collabs, description };
}

export const TICKETS_DATA: Ticket[] = [
  mk("#TK-1042","Erreur 500 au paiement panier","Maison Relais Gourmet","Maison Relais","Urgente","En cours","24 juin",624,"29 juin",629,9,["Bug","Urgent"],"T",["AD"],
    "Une erreur 500 se produit de manière aléatoire lors du paiement du panier. Le client rapporte que cela arrive surtout en fin de journée (après 18h). Les logs serveur indiquent une exception non gérée dans le module de paiement Stripe.\n\nÉtapes pour reproduire :\n1. Ajouter un article au panier\n2. Procéder au paiement\n3. Remplir les informations de carte\n4. Cliquer sur « Confirmer la commande »\n\nRésultat attendu : Confirmation de commande\nRésultat obtenu : Page d'erreur 500"),
  mk("#TK-1041","Logo flou sur mobile","BÉRYL Patrimoine","Identité visuelle","Normale","Nouveau","27 juin",627,"27 juin",627,2,["Design"],"N",[],
    "Le logo BÉRYL Patrimoine apparaît flou sur les écrans Retina des appareils mobiles (iPhone 13, 14, 15). L'image source fournie est en 72 dpi alors qu'un affichage net nécessite 144 dpi minimum pour les écrans haute densité."),
  mk("#TK-1039","Demande ajout page actualités","Netzy","Netzy — Refonte","Normale","En attente","20 juin",620,"26 juin",626,5,["Demande","Contenu"],"AD",["T"],
    "Le client souhaite ajouter une page « Actualités » à son site refonte. Cette page devra permettre la publication d'articles via le CMS WordPress, avec les fonctionnalités suivantes :\n- Liste paginée des articles (10 par page)\n- Filtres par catégorie\n- Barre de recherche\n- Partage sur les réseaux sociaux\n\nMaquettes à valider par le client avant développement."),
  mk("#TK-1038","Optimisation SEO fiches produits","InterLoire","SEO Vins d'Anjou","Basse","En cours","18 juin",618,"25 juin",625,3,["SEO"],"AD",["NK"],
    "Optimisation des balises meta (title, description) et du contenu textuel des 45 fiches produits du catalogue. Objectif : améliorer le positionnement sur les requêtes longue traîne liées aux cépages et aux millésimes."),
  mk("#TK-1036","Certificat SSL expiré","Netzy","Maintenance","Haute","Résolu","15 juin",615,"16 juin",616,4,["Hébergement","Urgent"],"T",[],
    "Le certificat SSL Let's Encrypt du site netzy.fr a expiré le 15 juin. Les visiteurs reçoivent un avertissement de sécurité. Renouvellement à effectuer en urgence."),
  mk("#TK-1035","Mise à jour mentions légales","Maison Relais Gourmet","Maison Relais","Basse","Fermé","12 juin",612,"14 juin",614,2,["Contenu"],"NK",[],
    "Mise à jour des mentions légales et de la politique de confidentialité suite aux nouvelles directives CNIL. Les textes ont été fournis par le service juridique du client."),
  mk("#TK-1033","Newsletter non envoyée","Maison Relais Gourmet","Maison Relais","Haute","En attente","22 juin",622,"27 juin",627,6,["Bug","Relance"],"NK",["T"],
    "La campagne newsletter du 22 juin n'a pas été envoyée malgré le déclenchement manuel depuis Mailchimp. Les 2 347 abonnés n'ont rien reçu. Aucun message d'erreur dans le tableau de bord Mailchimp."),
  mk("#TK-1031","Refonte page contact","BÉRYL Patrimoine","BÉRYL Patrimoine","Normale","Nouveau","26 juin",626,"26 juin",626,1,["Demande","Design"],"N",["AD"],
    "Refonte complète de la page contact pour une meilleure conversion. Le client souhaite :\n- Un formulaire de contact simplifié (nom, email, téléphone, message)\n- L'intégration d'une carte interactive (Google Maps)\n- Les horaires d'ouverture\n- Un bouton d'appel direct sur mobile"),
  mk("#TK-1029","Galerie photos lente","Studio Mira","Studio Mira","Normale","En cours","19 juin",619,"28 juin",628,4,["Bug"],"T",["J"],
    "La galerie photos du portfolio Studio Mira met plus de 8 secondes à charger sur une connexion fibre standard. Les images ne sont pas optimisées (PNG non compressés, tailles originales > 4 Mo). Mise en place d'une optimisation automatique et d'un lazy loading nécessaire."),
  mk("#TK-1027","Ajout pixel de tracking","InterLoire","Vins d'Anjou","Basse","Résolu","10 juin",610,"13 juin",613,3,["SEO","Demande"],"AD",[],
    "Installation du pixel Meta Ads et du tag Google Ads sur l'ensemble des pages du site vinskdanjou.fr. Configuration des événements de conversion (achat, ajout panier, visite page produit)."),
  mk("#TK-1024","Formulaire devis cassé","Netzy","Netzy — Refonte","Urgente","En cours","23 juin",623,"29 juin",629,9,["Bug","Urgent"],"AD",["T","NK"],
    "Le formulaire de demande de devis ne soumet plus les données. Depuis la mise à jour WordPress 6.5.3 du 22 juin, le formulaire s'affiche correctement mais le clic sur « Envoyer » ne produit aucun effet. Aucune notification par email côté client ni côté agence."),
];

export const COMMENTS_DATA: Record<number, Comment[]> = {
  1042: [
    { id:1, author:"T", date:"24 juin, 14:32", body:"J'ai reproduit l'erreur en local. C'est bien une exception non gérée dans le hook `payment_complete` de WooCommerce. Elle se produit quand le token Stripe expire entre l'affichage du formulaire et la soumission.", internal:false },
    { id:2, author:"AD", date:"25 juin, 09:15", body:"Est-ce qu'on a contacté le client pour savoir depuis combien de temps ça se produit ? Ça pourrait avoir un impact sur les commandes perdues.", internal:true },
    { id:3, author:"T", date:"25 juin, 11:42", body:"Le client dit que ça a commencé le 22 juin. J'ai vérifié les logs : 23 erreurs 500 en 7 jours. Le fix est en cours, je déploie ce soir en staging d'abord.", internal:false },
    { id:4, author:"AD", date:"26 juin, 16:08", body:"Staging validé. Peut-on déployer en prod ? Il faut que Thomas confirme.", internal:true },
    { id:5, author:"T", date:"27 juin, 10:30", body:"Déploiement en prod planifié demain matin à 7h avant l'ouverture du site. Je reste en ligne pour surveiller.", internal:false },
  ],
  1041: [
    { id:1, author:"N", date:"27 juin, 09:10", body:"Reçu. Je vais créer une version SVG du logo et une version PNG 2x pour tous les formats utilisés sur le site.", internal:false },
  ],
  1039: [
    { id:1, author:"AD", date:"20 juin, 15:22", body:"J'ai reçu la demande. Avant de commencer le dev, il nous faut les maquettes validées. Je vais préparer une proposition cette semaine.", internal:false },
    { id:2, author:"T", date:"21 juin, 11:00", body:"Le client a répondu qu'il voulait aussi un système de newsletter intégré à cette page. À prendre en compte dans le chiffrage.", internal:true },
    { id:3, author:"AD", date:"22 juin, 14:30", body:"Maquettes envoyées au client. En attente de validation.", internal:false },
    { id:4, author:"AD", date:"26 juin, 09:00", body:"Toujours en attente de retour. Relance envoyée par email.", internal:true },
    { id:5, author:"NK", date:"26 juin, 16:45", body:"Le client a appelé, il valide les maquettes mais demande à changer la couleur du bouton de CTA. Nina peut faire ça rapidement ?", internal:true },
  ],
  1033: [
    { id:1, author:"NK", date:"22 juin, 18:00", body:"J'ai vérifié dans Mailchimp : la campagne est bien en statut « Envoyée » mais aucun email n'apparaît dans les boîtes de réception. Problème potentiel avec le serveur SMTP.", internal:false },
    { id:2, author:"T", date:"23 juin, 08:45", body:"J'ai regardé les logs du serveur SMTP. Le rate limit a été atteint à 17h58. Les 2347 emails ont été mis en queue mais jamais traités. Il faut contacter l'hébergeur.", internal:true },
    { id:3, author:"NK", date:"24 juin, 10:00", body:"Hébergeur contacté. Ils confirment un incident de leur côté le 22 juin entre 17h et 19h. Ils proposent un avoir mais pas de ré-envoi possible.", internal:true },
    { id:4, author:"NK", date:"24 juin, 14:30", body:"J'ai proposé au client de renvoyer la campagne avec un objet légèrement modifié pour éviter les filtres anti-spam. En attente de leur accord.", internal:false },
    { id:5, author:"T", date:"27 juin, 09:15", body:"Le client a donné son accord. Campagne prête à renvoyer. Quelle date leur proposer ?", internal:true },
    { id:6, author:"NK", date:"27 juin, 11:00", body:"On part sur le 30 juin à 10h. J'envoie un email de confirmation au client.", internal:false },
  ],
  1024: [
    { id:1, author:"AD", date:"23 juin, 14:20", body:"Problème confirmé. Le formulaire CF7 est en conflit avec un plugin de sécurité récemment mis à jour. J'ai désactivé le plugin en staging.", internal:false },
    { id:2, author:"T", date:"24 juin, 09:30", body:"C'est bien un conflit avec Wordfence 7.11.2 qui bloque les requêtes AJAX du formulaire. Il faut soit mettre le plugin en liste blanche pour CF7, soit migrer vers un autre plugin de sécurité.", internal:true },
    { id:3, author:"NK", date:"25 juin, 10:00", body:"Le client a été informé. Il préfère qu'on migre vers Sucuri. Thomas, tu peux estimer le temps ?", internal:true },
    { id:4, author:"T", date:"25 juin, 15:00", body:"Migration Sucuri estimée à 3h. Je peux faire ça vendredi. En attendant j'ai mis le formulaire CF7 en liste blanche dans Wordfence, les emails arrivent à nouveau.", internal:false },
    { id:5, author:"AD", date:"27 juin, 11:30", body:"Bien. Priorité : finaliser la migration Sucuri vendredi. J'informe le client.", internal:false },
  ],
};
