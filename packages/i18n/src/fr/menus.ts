/**
 * The FR catalogue's « menus » slice — the SOURCE language.
 *
 * `satisfies` per entry: the compiler demands EXACTLY the contract's keys
 * (`../messages/menus.ts`), no more and no less, slice by slice — so a forgotten
 * key names ITS slice rather than the whole catalogue.
 */
import type { Messages } from "../messages";

export const menus = {
  selection: {
    ariaLabel: "Actions sur la sélection",
    redact: "Masquer",
    redactTip: "Masquer la sélection",
    clarify: "Préciser",
    clarifyTip: "Demander des précisions",
    remember: "Retenir",
    rememberTip: (brand) =>
      `Retenir dans la Mémoire. ${brand} s'en souviendra dans vos prochaines conversations`,
    rememberAria: "Retenir dans la Mémoire",
    scopeAria: "Portée du masquage",
    scopeConversation: "Cette conversation",
    scopeVault: "Toutes les conversations (Coffre)",
    typeEyebrow: "Type de donnée",
  },
  link: {
    ariaLabel: "Ouvrir le lien",
    integratedBrowser: "Navigateur intégré",
    externalBrowser: "Navigateur externe",
  },
  skills: {
    actions: "Actions",
    heading: "Compétences",
    empty: "Aucune compétence. Enregistrez vos consignes réutilisables et insérez-les en un clic.",
    create: "Créer une compétence",
  },
  docView: {
    changeAria: "Changer de vue",
    listAria: "Vue du document",
    currentTip: (view) => `Vue : ${view}`,
  },
  download: {
    ariaLabel: "Formats de téléchargement",
  },
  markKeep: {
    uncertain: (brand) => `Détection à faible confiance par ${brand}. À vérifier.`,
  },
  composerHints: {
    placeholder: (brand) => `Écrivez à ${brand}, déposez un fichier, ou tapez « / » pour vos compétences…`,
    countTip:
      "Ces valeurs seront remplacées par des faux avant l'envoi. Cliquez pour les voir et choisir lesquelles envoyer en clair. Pour masquer un autre mot, sélectionnez-le dans votre texte.",
    skillShortcut: "Astuce : tapez « / » dans la zone de saisie pour ouvrir vos compétences.",
    sendQueued: "Envoi dès que la recherche des données à masquer est terminée…",
  },
  page: {
    moreActions: "Plus d'actions",
    exportMemory: "Exporter (diagnostic)",
    exportMemoryTip: "Exporter la mémoire et ses liens en fichier texte. Le fichier contient les valeurs réelles, non masquées.",
  },
} satisfies Messages["menus"];

export const downloads = {
  pdf: { label: "PDF", hint: "Mise en page conservée, prêt à imprimer" },
  docx: { label: "Word", hint: "Document .docx, modifiable" },
  md: { label: ".md", hint: "Source Markdown du document" },
  txt: { label: ".txt", hint: "Texte brut, sans mise en forme" },
} satisfies Messages["downloads"];

export const docViews = {
  image: "Image",
  pdfRedacted: "Pages masquées",
  pdfRedactedHint: "Les pages, avec des valeurs de substitution à la place des vraies",
  sheet: "Feuille",
  presentation: "Présentation",
  document: "Document",
  rendered: "Rendu",
  original: "Original",
  originalHint: "Le fichier tel quel, avant masquage",
  redacted: "Masqué",
  redactedHint: "Ce que reçoit le modèle",
  ocr: "Texte de l'image",
  ocrHint: "Texte reconnu dans l'image de la page",
} satisfies Messages["docViews"];
