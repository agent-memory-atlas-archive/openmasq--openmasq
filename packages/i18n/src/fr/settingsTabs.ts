/**
 * The FR catalogue's « settingsTabs » slice — the SOURCE language (Compte, Confidentialité,
 * Navigateur, Modèles). `satisfies` par entrée : le compilateur exige EXACTEMENT les clés
 * du contrat (`../messages/settingsTabs.ts`).
 */
import type { Messages } from "../messages";

export const accountTab = {
  eyebrow: "Compte",
  signedInFallback: "Compte connecté",
  signedInHint: (brand) => `Connecté à ${brand} sur cet appareil.`,
  signOut: "Se déconnecter",
  signOutConfirmTitle: "Se déconnecter de ce compte ?",
  signOutConfirmBody:
    "Vous reviendrez à l'écran de connexion. Rien n'est supprimé : vous retrouverez vos conversations en vous reconnectant avec ce compte.",
  createOrgTip: "Créer une organisation dans l'app web",
  createOrg: "Créer une organisation",
  createOrgHint:
    "Partages d'équipe, règles imposées, facturation par siège. La création se fait dans l'app web.",
  dataEyebrow: "Vos données",
  importTitle: "Importer des conversations",
  beta: "Bêta",
  importHint: "Depuis un export ChatGPT ou Claude, traité sur votre appareil.",
  importCta: "Importer",
  billingEyebrow: "Facturation des messages",
  subscriptionToggle: (brand) => `Utiliser mon abonnement ${brand}`,
  subscriptionToggleHint:
    "Si désactivé, vos messages passent par vos propres comptes (OpenAI, Gemini…).",
  notifEyebrow: "Notifications",
  notifTitle: "Prévenir quand une réponse arrive",
  notifHint:
    "Seulement si vous êtes dans une autre fenêtre ou une autre conversation. La notification n'affiche ni le message ni le titre de la conversation. Un clic vous y ramène.",
  statsEyebrow: "Statistiques",
  statsTitle: "Statistiques d'usage anonymes",
  statsHint: "Des compteurs d'usage, jamais vos messages.",
  privacyEyebrow: "Vie privée",
  linkPreviews: "Aperçus de liens",
  linkPreviewsHint: "Une vignette sous les liens. Activer révèle votre adresse IP au site lié.",
  backToChats: "Retour aux conversations",
  advanced: "Avancé",
  advancedShow: "Afficher les réglages moins courants (usage, versions…)",
  advancedHide: "Replier les réglages moins courants",
} satisfies Messages["accountTab"];

export const privacyTab = {
  protectedEyebrow: "Ce qui est masqué",
  perConnectorEyebrow: "Connecteurs avec leur propre niveau",
  perConnectorNote: (n) =>
    n === 1
      ? "Un connecteur a son propre niveau de masquage. Les autres suivent le niveau par défaut."
      : `${n} connecteurs ont leur propre niveau de masquage. Les autres suivent le niveau par défaut.`,
  perCategory: "Régler catégorie par catégorie",
  activeCount: (active, total) => `${active}/${total} actives`,
  managedByOrg: (n) => ` · ${n} gérée(s) par votre organisation`,
  advancedTitle: "Options avancées",
  advancedSub: "Journal technique pour le support, et la forme des valeurs masquées.",
  debugLogTitle: "Journal technique (pour le support)",
  debugLogHint:
    "Garde la trace exacte de ce qui part et revient, pour aider le support à comprendre un problème. Ajoute « Journal technique » au menu ⋯ de chaque conversation. Reste sur cet appareil.",
  tokenDisplayTitle: "Afficher « Personne 1 » au lieu d'un faux nom",
  tokenDisplayHint:
    "Vous voyez un repère, par exemple « [PERSON1] », là où un faux nom aurait été écrit. Ne change que ce que vous voyez : ce que reçoit le modèle dépend du réglage ci-dessous.",
  wireTokensTitle: "Envoyer « Personne 1 » au modèle au lieu d'un faux nom",
  wireTokensHint:
    "Le modèle reçoit un repère, par exemple « [PERSON1] », au lieu d'un faux nom réaliste. Aucun nom n'est inventé, mais le modèle rédige et raisonne moins bien. S'applique aux nouvelles conversations.",
  memoryEyebrow: "Mémoire",
  memoryAutoTitle: "Extraction automatique de la mémoire",
  memoryAutoHint: (brand) =>
    `${brand} enregistre de lui-même les faits durables d'une conversation, dans « À revoir ». Rien de plus n'est envoyé hors de votre appareil. « Retiens que… » fonctionne, que ce réglage soit activé ou non.`,
  memoryExportTitle: "Exporter la mémoire (diagnostic)",
  memoryExportHint:
    "Les fiches et les liens entre elles, en texte, dans un fichier local. Contient des données réelles. Utile pour comprendre un regroupement ou un doublon.",
  reportEyebrow: "Ce qui a été masqué",
  reportEmpty: (brand) =>
    `Rien n'a encore été envoyé. Après votre premier message, vous verrez ici ce que ${brand} a masqué, et de quel type.`,
  reportMessagesSub: (n) => `saisies dans vos messages · ${n} conversation${n === 1 ? "" : "s"}`,
  reportAllSub: "tout ce qui a été masqué · messages, outils et documents",
  reportDetail: "Voir l'historique détaillé",
  reportByType: "Par type",
  reportByTypeTip: "Voir la répartition par type",
  reportMessagesTitle: "Vos messages · par type",
  reportAllTitle: "Tout ce qui a été masqué · par type",
  protectedValues: (n) =>
    `${n.toLocaleString("fr-FR")} valeur${n === 1 ? "" : "s"} masquée${n === 1 ? "" : "s"}`,
  auditAria: "Historique de confidentialité",
  auditRedaction: "Masquage",
  auditNetwork: "Réseau",
  auditCount: (n) =>
    `${n.toLocaleString("fr-FR")} élément${n === 1 ? "" : "s"} masqué${n === 1 ? "" : "s"}`,
  auditSub: "Masqués avant d'atteindre un modèle · le modèle ne voit jamais les valeurs réelles.",
  auditExportTip: "Exporter la sélection en CSV",
  auditExport: "Exporter",
  auditEmpty:
    "Rien n'a encore été masqué. Écrivez un message contenant un nom, un e-mail ou un IBAN : chaque valeur masquée avant l'envoi s'affichera ici.",
  auditSearch: "Rechercher une valeur ou une conversation…",
  auditAll: (total) => `Tout · ${total}`,
  auditOpenConv: (title) => `Ouvrir · ${title}`,
  auditValues: (n) => `${n} valeur${n === 1 ? "" : "s"}`,
  auditColType: "TYPE",
  auditColReal: "VALEUR RÉELLE",
  auditColFake: "REMPLACÉE PAR",
  auditRevealAria: "Révéler la valeur réelle",
  auditRevealTip: "Cliquer pour révéler",
  auditGoToMessage: "Aller au message",
  auditLoading: (shown, total) => `Chargement… (${shown} / ${total})`,
  auditEntries: (n) => `${n} entrées.`,
  revealTitle: "Valeur réelle",
  revealClose: "Fermer",
  revealCopy: "Copier",
  revealCopied: "Copié",
  revealReplacedBy: "Remplacée par",
  revealConversation: "Conversation",
  revealWhen: "Quand",
  revealNote:
    "Le modèle n'a jamais vu cette valeur.",
  timelineTitle: (days) => `Masquages · ${days} derniers jours`,
  timelineMeta: "valeurs masquées / jour, par catégorie",
  timelineEmpty: "Aucun masquage sur la période.",
  timelineAria: "Valeurs masquées par jour et par catégorie",
  timelineBarTip: (n) => `${n} valeur${n > 1 ? "s" : ""} masquée${n > 1 ? "s" : ""}`,
  egressTitle: "Adresses contactées par l'app",
  egressSub:
    "Les adresses que l'app a réellement contactées, et celles qu'elle a refusées. Seul le nom du site est enregistré, jamais la page ni la requête.",
  egressLoading: "Lecture du journal…",
  egressEmpty: "Rien pour l'instant : aucune adresse contactée depuis cet appareil.",
  egressOrigins: (n) => (n === 1 ? "adresse" : "adresses"),
  egressContacts: (n) => (n === 1 ? "connexion" : "connexions"),
  egressRefused: (n) => `${n} refusé${n === 1 ? "" : "s"}`,
  egressRefusedWord: (n) => `refusé${n === 1 ? "" : "s"}`,
  egressRefusedFallback: "refusé",
  egressSearch: "Rechercher une adresse ou une origine…",
  egressInsecure: "non chiffré",
  egressNoMatch: "Aucune adresse ne correspond.",
  relJustNow: "à l'instant",
  relMinutes: (m) => `${m} min`,
  relHours: (h) => `${h} h`,
  relYesterday: "Hier",
  relDays: (d) => `${d} j`,
} satisfies Messages["privacyTab"];

export const browserTab = {
  engineEyebrow: "Moteur de recherche",
  engineHint:
    "Le moteur utilisé quand vous saisissez des mots-clés (et non une adresse) dans la barre d'adresse du navigateur intégré. Vous pouvez aussi le changer depuis le menu à côté des onglets.",
} satisfies Messages["browserTab"];

export const modelsTab = {
  sourcesEyebrow: "D'où viennent vos modèles",
  keysGroupTitle: "Avec votre compte OpenAI, Mistral, Anthropic…",
  keysGroupSub: "Une clé d'accès de ce service ; facturé à l'usage par ce service.",
  agentsGroupTitle: "Avec votre abonnement (application installée)",
  agentsGroupSub: "Votre abonnement existant, aucune clé.",
  recommended: "conseillé",
  agentTip: (a) => `${a} : votre abonnement existant, aucune clé à coller.`,
  agentOn: (a) => `${a} : activé. Chaque message est décompté de votre abonnement personnel.`,
  agentMissing: (a) =>
    `${a} : introuvable sur cette machine. Cliquez pour savoir comment l'installer.`,
  availableEyebrow: (n) => `Modèles disponibles (${n})`,
  noMatch: (q) => `Aucun modèle ne correspond${q ? ` à « ${q} »` : ""}.`,
  advancedTitle: "Avancé",
  advancedSub:
    "Un modèle sur votre ordinateur (Ollama, LM Studio…) et les identifiants de modèles que le serveur ne liste pas.",
  orgProvidesModels: (org) => `${org} fournit les modèles.`,
  yourOrg: "Votre organisation",
  orgKeysBlocked:
    "Les clés d'accès personnelles sont désactivées sur ce compte. Les modèles ouverts par votre organisation fonctionnent sans rien renseigner. Aucun autre n'est utilisable, même avec votre propre clé. Votre administrateur choisit la liste.",
  editKey: (provider) => `Modifier la clé ${provider}`,
  addKeyFor: (provider) => `Renseigner une clé ${provider}`,
  keySaved: "Clé enregistrée",
  included: "Inclus",
  addKey: "Ajouter une clé",
  noKeySubscription: (brand) => `Sans clé, l'abonnement ${brand} donne accès aux modèles inclus.`,
  defaultLead: "Vos nouvelles conversations démarrent sur",
  defaultTip: "Voir la fiche de ce modèle",
  freeBadge: "gratuit",
  freeBadgeTip:
    "Modèle gratuit, inclus avec votre compte, usage limité. Cliquez pour en savoir plus.",
  addFavorite: "Ajouter aux favoris",
  removeFavorite: "Retirer des favoris",
  searchPlaceholder: "Rechercher un modèle (nom, gpt, claude…)",
  searchAria: "Rechercher un modèle",
  clearSearch: "Effacer la recherche",
  all: "Tous",
  priceAria: "Filtrer par prix",
  price: "Prix",
  priceTiers: { free: "Gratuit", eco: "Économique", standard: "Standard", premium: "Haut de gamme" },
  priceTierTips: {
    free: "0 $, gratuit avec votre compte",
    eco: "Moins de 3 $ pour environ 750 000 mots de réponse",
    standard: "De 3 à 20 $ pour environ 750 000 mots de réponse",
    premium: "Plus de 20 $ pour environ 750 000 mots de réponse",
  },
  priceTierFreeUnserved: "0 $ avec une clé OpenRouter",
  defaultFix: (reason) => `${reason} · Ajouter`,
  status: {
    keySaved: "Clé enregistrée",
    keySavedTip: (p) => `Une clé ${p} est enregistrée sur cet appareil.`,
    keyRequired: "Clé requise",
    keyRequiredTip: (p) => `Ajoutez votre clé ${p} pour utiliser ces modèles.`,
    keyOrSubscription: "Clé ou abonnement",
    creditsExhaustedTip: (brand, p) =>
      `Crédits ${brand} épuisés. Ajoutez votre clé ${p} pour les utiliser directement, ou prenez un abonnement.`,
    viaSubscriptionTip: (brand, p) =>
      `Sans clé, ces modèles passent par votre abonnement ${brand} (crédits). Ajoutez votre clé ${p} pour les utiliser directement.`,
    unavailableTip: (brand, p) =>
      `Ces modèles ne sont pas disponibles sur votre compte ${brand} pour le moment. Ajoutez votre clé ${p} pour les utiliser directement.`,
    keyOrAccount: "Clé ou compte",
    viaAccountTip: (brand, p) =>
      `Sans clé, ces modèles passent par votre compte ${brand}. Ajoutez votre clé ${p} pour les utiliser directement.`,
    noKey: "Aucune clé",
    noKeyTip: (p) => `Aucune clé ${p} n'est enregistrée sur cet appareil.`,
  },
  localEyebrow: "Modèle sur votre ordinateur",
  localHint:
    "Si vous faites tourner un modèle d'IA sur votre propre ordinateur (avec Ollama, LM Studio…), indiquez son adresse ici.",
  localAddress: "Adresse du modèle",
  claude: {
    title: "Votre abonnement Claude",
    note: "Si vous avez un abonnement Claude et l'application Claude Code installée sur cet ordinateur, vos conversations peuvent passer par elle, sans clé d'accès. Le masquage s'applique de la même façon.",
    row: "Utiliser mon abonnement Claude (application Claude Code installée)",
    on: "Ajoute « Claude Code » à la liste des modèles. Chaque message est décompté de votre abonnement Claude personnel.",
    missing:
      "Claude Code n'est pas installé sur cet ordinateur. Installez-le et connectez-le à votre compte Claude, puis revenez ici.",
  },
  codex: {
    title: "Votre abonnement ChatGPT",
    note: "Si vous avez un abonnement ChatGPT et l'application Codex installée sur cet ordinateur, vos conversations peuvent passer par elle, sans clé d'accès. Le masquage s'applique de la même façon.",
    row: "Utiliser mon abonnement ChatGPT (application Codex installée)",
    on: "Ajoute « GPT Codex » à la liste des modèles. Chaque message est décompté de votre abonnement ChatGPT personnel.",
    missing:
      "Codex n'est pas installé sur cet ordinateur. Installez-le et connectez-le à votre compte ChatGPT, puis revenez ici.",
  },
  detail: {
    barAria: (label, value) => `${label} ${value}/5`,
    openSource: "Open source",
    hosted: "Hébergé",
    context: (size) => `Contexte ${size}`,
    vision: "Vision",
    priceEyebrow: "Tarif indicatif pour environ 750 000 mots (un million de « tokens »)",
    free: "Gratuit",
    priceIn: "Ce que vous envoyez",
    priceOut: "La réponse du modèle",
    priceUnit: "Prix public du service, en dollars. Ce n'est pas votre facture.",
    profileEyebrow: "Profil (indicatif)",
    reasoning: "Raisonnement",
    coding: "Code",
    speed: "Vitesse",
    cost: "Prix bas",
    images: "Images",
    strengths: "Points forts",
    tradeoffs: "Compromis",
    bestFor: "Idéal pour",
    benchmarks: "Résultats de tests",
  },
} satisfies Messages["modelsTab"];
