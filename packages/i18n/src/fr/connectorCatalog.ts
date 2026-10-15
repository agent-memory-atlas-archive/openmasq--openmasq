/**
 * The FR catalogue's « connectorCatalog » slice — the SOURCE language. Generated from
 * `@openmasq/catalog`: the `desc` stays there (the model reads it), this one is what people READ.
 * `satisfies` per entry.
 */
import type { Messages } from "../messages";

export const connectorCatalog = {
  connectors: {
    demo: { desc: "Démonstration avec des données d'exemple, sans compte" },
    gmail: { desc: "Lire, rechercher et envoyer vos e-mails" },
    slack: { desc: "Parcourir vos canaux et lire les messages récents" },
    github: { desc: "Vos projets de code et leurs tickets" },
    "google-calendar": { name: "Google Agenda", desc: "Vos événements et rendez-vous" },
    "google-drive": { desc: "Rechercher, lire et déposer des fichiers dans Drive" },
    "google-docs": { desc: "Créer, lire et modifier vos documents Google Docs" },
    "google-sheets": { desc: "Lire et compléter vos tableaux, ou en créer" },
    "google-tasks": { desc: "Lister, créer et terminer vos tâches" },
    "google-analytics": { desc: "Consulter la fréquentation de vos sites (lecture seule)" },
    "microsoft-outlook": { desc: "Rechercher, lire et envoyer vos e-mails Outlook" },
    "microsoft-onedrive": { desc: "Rechercher et lire vos fichiers OneDrive" },
    "microsoft-sharepoint": { desc: "Rechercher et lire les documents de vos sites SharePoint" },
    "microsoft-teams": { desc: "Vos équipes, canaux et messages Teams" },
    exa: { desc: "Rechercher sur le web et lire des pages" },
    tavily: { desc: "Rechercher sur le web en temps réel et lire des pages" },
    firecrawl: { desc: "Lire le contenu de sites web entiers" },
    notion: { desc: "Rechercher, lire et créer vos pages et bases Notion" },
    superhuman: { desc: "Rechercher, lire et envoyer des e-mails, gérer l'agenda" },
    linear: { desc: "Créer et suivre les tâches et projets de votre équipe" },
    atlassian: { desc: "Rechercher et gérer vos tickets Jira et pages Confluence" },
    asana: { desc: "Gérer vos tâches et vos projets" },
    fireflies: { desc: "Comptes rendus, résumés et actions de vos réunions" },
    monday: { desc: "Lire et mettre à jour vos tableaux de suivi" },
    sentry: { desc: "Suivre les erreurs de vos applications" },
    vercel: { desc: "Suivre la mise en ligne de vos sites et leurs journaux" },
    neon: { desc: "Interroger vos bases de données Neon" },
    supabase: { desc: "Votre base de données Supabase et ses journaux" },
    semgrep: { desc: "Analyser la sécurité de votre code" },
    stripe: { desc: "Consulter paiements, clients et factures" },
    paypal: { desc: "Consulter paiements, factures et commandes" },
    square: { desc: "Consulter paiements, produits et commandes" },
    close: { desc: "Suivre vos prospects, contacts et ventes en cours" },
    intercom: { desc: "Consulter les conversations et demandes de vos clients" },
    attio: { desc: "Vos contacts, sociétés, ventes en cours et notes" },
    zapier: { desc: "Lancer des automatisations dans plus de 8 000 applications" },
    canva: { desc: "Créer et exporter vos visuels Canva" },
    wix: { desc: "Gérer vos sites, boutiques et réservations Wix" },
    webflow: { desc: "Gérer vos sites Webflow et leurs contenus" },
    dropbox: { desc: "Rechercher et lire vos fichiers Dropbox" },
    huggingface: { desc: "Explorer des modèles d'IA et des jeux de données" },
    amplitude: { desc: "Statistiques d'usage de votre produit et tableaux de bord" },
    posthog: { desc: "Statistiques d'usage de votre produit et tableaux de bord" },
    apify: { desc: "Récupérer des données de sites web avec des outils prêts à l'emploi" },
    brightdata: { desc: "Récupérer en temps réel des données publiques du web" },
    cloudflare: { desc: "Gérer vos services hébergés chez Cloudflare" },
    netlify: { desc: "Mettre en ligne et gérer vos sites Netlify" },
    "prisma-postgres": { desc: "Interroger et gérer votre base de données Prisma" },
    cloudinary: { desc: "Gérer et retoucher vos images et vidéos" },
    jotform: { desc: "Créer des formulaires et analyser les réponses" },
    websitepublisher: { desc: "Créer et publier un site en discutant" },
    morningstar: { desc: "Données sur les placements et les marchés financiers" },
    vantage: { desc: "Analyser ce que vous coûtent vos services en ligne" },
    synapse: { desc: "Rechercher des données de recherche scientifique" },
    airtable: { desc: "Lire, créer et modifier les fiches de vos bases Airtable" },
    filesystem: {
      name: "Vos dossiers",
      desc: "Lire et modifier les fichiers des dossiers que vous autorisez",
    },
    browser: {
      name: "Navigateur",
      desc: "Laisser l'assistant agir dans un navigateur (remplir des formulaires, cliquer) sur vos sites connectés.",
    },
  },
  categories: {
    search: "Recherche & web",
    dev: "Pour les développeurs",
    data: "Fichiers & données",
    productivity: "Productivité",
    crm: "Clients & support",
    finance: "Finance & paiements",
    design: "Design & sites",
    automation: "Automatisation",
    ai: "IA & modèles",
    other: "Autres",
  },
  auth: {
    builtin: {
      label: "Intégré",
      title:
        "Inclus dans l'application. Aucun compte nécessaire. Activez-le pour l'utiliser.",
    },
    directFull:
      "Connectez-vous sur la page du service et autorisez l'accès. Aucune clé nécessaire.",
    comingSoon: {
      label: "Option avancée",
      title: (brand) =>
        `La connexion en un clic arrive : Google vérifie encore ${brand}. En attendant, une option avancée permet de le connecter avec vos propres clés Google. Elle demande un compte Google Cloud.`,
    },
    byoOnly: {
      label: "Vos clés",
      title: (what, reason) => `Pour ${what}, vos propres clés sont nécessaires : ${reason}.`,
    },
    byoLimited: {
      label: "1 clic (partiel)",
      title: (what, reason) =>
        `Connexion en un clic. Pour ${what}, vos propres clés sont nécessaires : ${reason}.`,
    },
    device: {
      label: "Code à coller",
      title:
        "Un code s'affiche et se copie tout seul : collez-le sur le site du service, puis autorisez l'accès. Aucune clé à créer.",
    },
    oneClick: "1-clic",
    local: {
      label: "Sur cet ordinateur",
      title:
        "Cet outil tourne sur votre ordinateur, sans compte en ligne. Ce qu'il lit dans vos dossiers est masqué avant d'être envoyé au modèle, comme vos messages.",
    },
    broker: {
      label: (brand) => `Via ${brand}`,
      title: (brand) =>
        `Connectez-vous à votre compte et ${brand} s'occupe du reste. Aucune clé ni code nécessaire.`,
    },
    apikey: {
      label: "Clé requise",
      title:
        "Ce service demande une clé d'accès. Récupérez-la sur son site, puis collez-la ici.",
    },
    oneClickRemote: {
      label: "1-clic",
      title:
        "Connectez-vous sur la page du service dans votre navigateur et autorisez l'accès. Aucune clé nécessaire.",
    },
    byoSafe: (brand) =>
      `Vos identifiants restent chiffrés sur votre appareil et ne passent jamais par les serveurs ${brand}.`,
    reasonAdminConsent: "seul un administrateur de votre organisation peut l'autoriser",
    reasonGoogleReview: (brand) =>
      `Google vérifie encore ${brand} pour l'accès en un clic`,
    thisAccess: "cette fonctionnalité",
  },
} satisfies Messages["connectorCatalog"];
