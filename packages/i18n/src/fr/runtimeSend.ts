/**
 * The FR « runtime » slice, second half — the SOURCE language: send blockers, attachment,
 * import and drop messages, and the small run-time labels. Assembled by `./runtime.ts`.
 *
 * ⚠️ « Rien n'a été envoyé » is said where the send is blocked BEFORE any call, and nowhere else.
 */
import type { Messages } from "../messages";

const NOT_MASKED = "Rien n'a été envoyé : les noms n'ont pas pu être masqués.";

export const runtimeSend = {
  maskingBlocked: (cause) =>
    `Envoi bloqué : ${cause}. Rien n'a été envoyé, pour protéger vos données. Réessayez.`,
  maskingCause: {
    network: "le masquage, qui fonctionne sur votre ordinateur, n'a pas répondu",
    auth: "le masquage n'a pas pu démarrer",
    unknown: "le masquage n'a pas pu fonctionner sur votre ordinateur",
    engine: "le masquage n'a pas pu vérifier qu'il avait tout masqué",
  },
  maskingTimeout:
    "Envoi bloqué : le masquage a pris trop de temps. Rien n'a été envoyé, pour protéger vos données. Réessayez. Si le texte est long, envoyez-le en plusieurs messages.",
  modelBlockedByOrg: (model) => `Votre organisation a désactivé le modèle « ${model} ». Choisissez-en un autre.`,
  creditsSold:
    "Crédits épuisés. Passez à un abonnement supérieur, utilisez votre propre clé, ou attendez le renouvellement.",
  creditsUnsold:
    "Ce modèle n'est pas disponible sur votre compte pour le moment. Utilisez votre propre clé, ou choisissez un autre modèle.",
  creditsOrg:
    "Crédits épuisés : le budget de votre organisation est atteint. Utilisez votre propre clé, ou attendez le renouvellement.",
  suspended: "Votre organisation a suspendu votre accès. L'envoi est bloqué.",
  paidUnavailable: "Ce modèle est indisponible pour le moment. Réessayez plus tard.",
  genericError: "Une erreur est survenue.",
  fileStillMasking: "Masquage du fichier en cours. Attendez la fin avant d'envoyer.",
  fileStillReading: "Lecture des fichiers en cours. Attendez la fin avant d'envoyer.",
  fileReadInPart: (name, read, total) =>
    `« ${name} » n'a été lu que sur ${read} pages sur ${total}. Relisez-le en entier (« Lire les ${total} pages » sur sa pièce jointe) avant d'envoyer : un document n'est jamais envoyé en partie.`,
  contextTooLarge: (model, pages, limitPages, hasFiles) =>
    `Trop long pour ${model} : environ ${pages} pages, alors qu'il en lit au plus ${limitPages} environ, réponse comprise. Rien n'a été envoyé. ${hasFiles ? "Joignez moins de fichiers" : "Raccourcissez le texte"}, ou choisissez un modèle qui accepte des textes plus longs.`,
  unreadTitle: (n) => (n > 1 ? "Fichiers illisibles" : "Fichier illisible"),
  unreadBody: (n, names) =>
    n > 1
      ? `${n} fichiers n'ont pas pu être lus et ne seront pas envoyés : ${names}`
      : `1 fichier n'a pas pu être lu et ne sera pas envoyé : ${names}`,
  unreadSendWithout: (n) => (n > 1 ? "Envoyer sans eux" : "Envoyer sans lui"),
  unreadNothingLeft: (n, names) =>
    n > 1
      ? `Ces fichiers n'ont pas pu être lus : ${names}. Rien n'a été envoyé. Retirez-les ou relancez leur lecture.`
      : `Ce fichier n'a pas pu être lu : ${names}. Rien n'a été envoyé. Retirez-le ou relancez sa lecture.`,
  retryMissingFiles: (n, names) =>
    `Réessai impossible sans perdre de document. Introuvable dans la bibliothèque : ${names}. Rien n'a été envoyé. Joignez ${n > 1 ? "ces fichiers" : "ce fichier"} à nouveau, puis renvoyez le message.`,
  maskFail: {
    remoteAuth: `Masquage en ligne indisponible : erreur de notre côté. ${NOT_MASKED} Réessayez plus tard, ou contactez le support.`,
    remoteNetwork: `Masquage en ligne injoignable. ${NOT_MASKED} Vérifiez votre connexion, puis réessayez.`,
    remoteUnknown: `Masquage en ligne indisponible. ${NOT_MASKED} Réessayez plus tard.`,
    local: `Masquage hors ligne indisponible : le modèle de détection n'a pas pu se charger. ${NOT_MASKED} Réessayez, puis réinstallez l'app si le problème persiste.`,
    modelAuth: `Masquage indisponible : clé d'accès manquante ou refusée. ${NOT_MASKED} Renseignez-la dans Réglages → Confidentialité.`,
    modelNetwork: `Masquage indisponible : le programme de détection choisi dans Réglages → Confidentialité ne répond pas. Vérifiez qu'il est lancé sur votre ordinateur. ${NOT_MASKED}`,
    modelUnknown: `Masquage indisponible. ${NOT_MASKED}`,
    timeout: `Le masquage a pris trop de temps. ${NOT_MASKED} Réessayez. Si le document est long, enregistrez-le en plusieurs fichiers plus petits et joignez-les un par un.`,
    engine: `Le masquage n'a pas pu se terminer de façon sûre. ${NOT_MASKED} Réessayez ; si cela se reproduit, signalez-le depuis « Envoyer un avis ».`,
  },
  token: {
    outage: (brand) =>
      `Le serveur de connexion ${brand} ne répond pas. Rien n'a été envoyé. Vérifiez votre connexion, puis réessayez.`,
    freeModel: (brand) => `Reconnectez-vous pour continuer. Ce modèle gratuit ne demande que votre compte ${brand}.`,
    unknownTier: (brand) =>
      `Ce modèle passe par votre compte ${brand}. Votre session n'est plus connectée. Reconnectez-vous.`,
    paidTier: (brand) =>
      `Votre abonnement ${brand} couvre ce modèle. Votre session n'est plus connectée. Reconnectez-vous.`,
    freeTier: (brand) =>
      `Ce modèle est inclus dans l'abonnement ${brand}. Prenez un abonnement pour l'utiliser, ou renseignez votre propre clé.`,
  },
} satisfies Messages["runtime"]["send"];

export const runtimeFiles = {
  notMaskedHere: (categories) => `Catégories désactivées, non masquées ici : ${categories}`,
  notMaskedMore: (more) => ` et ${more} autres`,
  docMaskFailed:
    "Le masquage de ce document a échoué. Rien n'est masqué dans ces vues, et l'envoi reste bloqué tant qu'il n'a pas réussi.",
  retryMasking: "Relancer le masquage",
  maskSelection: (value) => `Masquer « ${value} »`,
  imageOnlyZone:
    "Zone d'image (logo, scan) absente du texte envoyé. La masquer ne sert que si le document est envoyé en images.",
  sheetHasMasked: (name) => `${name} : contient des données masquées`,
  sheetCutRows: (row) =>
    `Envoi tronqué : seules les lignes 1 à ${row} sont envoyées au modèle. Les lignes grisées ne sont pas envoyées, elles n'ont donc pas besoin d'être masquées.`,
  sheetCutAll: "Envoi tronqué : ce fichier dépasse la limite d'envoi, aucune ligne n'est envoyée au modèle.",
  sheetPreviewCut: (rows, cols) => `Aperçu tronqué (${rows} lignes × ${cols} colonnes max).`,
  skillsNothing: (brand) =>
    `Rien de reconnaissable ici. ${brand} cherche des dossiers contenant un « SKILL.md », ou des fichiers .md déposés directement.`,
  skillsDropUnreadable: "Impossible de lire ce dépôt.",
  skillsDropSub: [
    "Le dossier ", { code: ".claude/skills" }, ", une compétence seule, un fichier ", { code: ".md" },
    ", ou le ", { code: ".zip" }, " téléversé sur claude.ai.",
  ],
  skillsNeedsFiles: (n) =>
    `S'appuie sur ${n} fichier${n > 1 ? "s" : ""} de son dossier : seules les instructions seront importées.`,
  skillsAsWorkflowTip: "Rangé dans les routines. Cliquez pour en faire une compétence.",
  skillsAsSkillTip: "Rangé dans les compétences. Cliquez pour en faire une routine.",
  skillsWorkflow: "Workflow",
  skillsSkill: "Compétence",
  skillsNote:
    "Un nom déjà pris n'écrase rien : l'import ajoute « (2) ». Vous pouvez relancer l'import sans risque, ou déposer un autre dossier ici pour changer de source.",
  folderFallbackName: "dossier",
  folderOfferOne: (brand, name) => `Donner à ${brand} l'accès au dossier « ${name} » ?`,
  folderOfferMany: (brand, n) => `Donner à ${brand} l'accès à ces ${n} dossiers ?`,
  folderOfferNote: (brand) =>
    `Une fenêtre du système s'ouvrira sur ce dossier pour que vous confirmiez. ${brand} ne peut pas s'accorder un dossier tout seul.`,
  folderGranted: (path) => `Dossier autorisé : ${path}`,
  folderAlready: (path) => `Ce dossier est déjà autorisé : ${path}`,
  folderUnavailable: "Les dossiers locaux ne sont pas disponibles sur cette plateforme.",
  folderRefused: (message) => `Autorisation refusée : ${message}`,
  importWrongProvider: (p) => `Ce fichier ressemble à un export ${p}. Sélectionnez « ${p} », puis réessayez.`,
  importNothing: (p) =>
    `Aucune conversation trouvée. Choisissez le fichier .zip reçu par e-mail lors de votre export ${p}.`,
  importNotJson: "Ce fichier n'est pas un export de conversations. Choisissez le fichier .zip reçu par e-mail lors de l'export.",
  importZipUnreadable: "Impossible de lire l'archive. Réessayez avec le zip d'export d'origine.",
  importNoJsonInZip: "Cette archive ne contient pas vos conversations. Choisissez le fichier .zip reçu par e-mail lors de l'export, sans le modifier.",
} satisfies Messages["runtime"]["files"];

export const runtimeMisc = {
  egressSources: {
    browser: "Navigateur intégré",
    "browser-favicon": "Navigateur intégré",
    connector: "Connecteur",
    "mcp-connect": "Connexion d'un connecteur",
    "tool-result-fetch": "Téléchargement depuis un outil",
    "fetch-url": "Téléchargement depuis un outil",
    "link-preview": "Aperçu de lien",
    "web-fetch-many": "Lecture de pages web",
    "model-catalogue": "Catalogue de modèles",
    embeddings: "Index sémantique",
    "safe-fetch": "Téléchargement",
    unknown: "Non attribué",
  },
  dropRegions: {
    center: "Déplacer ici",
    left: "Diviser à gauche",
    right: "Diviser à droite",
    top: "Diviser en haut",
    bottom: "Diviser en bas",
  },
  login: {
    generic: "Impossible pour le moment. Vérifiez votre connexion et réessayez.",
    rateLimit: "Trop de tentatives. Patientez un instant, puis réessayez.",
    network: "Réseau indisponible. Vérifiez votre connexion et réessayez.",
    signupsClosed:
      "Aucun compte pour cette adresse, et les inscriptions sont fermées pour le moment. Vérifiez l'orthographe. Si elle est bonne, l'accès doit encore être ouvert de notre côté.",
  },
  megabytes: (n) => `${n} Mo`,
  gigabytes: (n) => `${n} Go`,
  billingNetwork: "Connexion au service de paiement impossible. Vérifiez votre réseau.",
  feedback: {
    signedOut: "Connectez-vous pour envoyer un avis.",
    unavailable: "L'envoi a échoué de notre côté. Réessayez dans un moment. Votre message est toujours là.",
    network: "Envoi impossible. Vérifiez votre connexion. Votre message est toujours là.",
  },
  mail: {
    truncated: "\n[… journal tronqué pour tenir dans un e-mail]",
    field: (label, value) => `${label} : ${value}`,
    mood: "Humeur",
    context: "— Contexte technique —",
    version: "Version",
    channel: "Canal",
    screen: "Écran",
    model: "Modèle",
    level: "Niveau",
    install: "Installation",
    journal: "— Journal (déjà masqué) —",
    subject: (category, product) => `[${category}] Avis ${product}`,
  },
} satisfies Messages["runtime"]["misc"];
