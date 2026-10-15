/**
 * The FR catalogue's « versionsTab » slice — the SOURCE language: Versions — updates, build history, environment.
 */
import type { Messages } from "../messages";

export const versionsTab = {
  switchConfirm: (version, env) =>
    `Installer la version ${version} (${env}) ? L'app va l'installer à la place de la version actuelle, puis redémarrer.`,
  current: "Actuelle",
  noRelease: "Aucune version publiée.",
  switchTo: "Installer celle-ci",
  switchToVersion: (v) => `Installer la version ${v} à la place de l'actuelle`,
  revert: "Revenir",
  revertTo: (v) => `Revenir à ${v}`,
  install: "Installer",
  installVersion: (v) => `Installer ${v}`,
  updatesEyebrow: "MISES À JOUR",
  upToDate: (brand) => `${brand} est à jour.`,
  revertConfirm: (version) => `Revenir à la version ${version} ? L'app redémarrera pour l'appliquer.`,
  autoUpdateLead: (brand) => `${brand} se met à jour automatiquement. Vous pouvez vérifier maintenant`,
  installedEyebrow: "VERSION INSTALLÉE",
  orSwitchEnv: " ou passer d'une version de test à la version normale, et inversement.",
  orRevert: " ou revenir à une version précédente.",
  historyEyebrow: "HISTORIQUE DES VERSIONS",
  locked:
    "Le changement de version est verrouillé sur cet appareil. Pour le débloquer, communiquez l'identifiant ci-dessus à l'équipe d'assistance.",
  revealLogTip: "Ouvre le dossier où se trouve le journal des mises à jour",
  revealLog: "Afficher le journal de mise à jour",
  stagingWarning:
    "Les versions de test sont préliminaires et peuvent être instables. Réservez-les aux essais.",
  stateCurrent: "Installée",
  stateAvailable: "Disponible",
  statePast: "Précédente",
  toggleNotes: (expanded, v) => `${expanded ? "Replier" : "Déplier"} les notes de la version ${v}`,
  channel: "Canal",
  upToDateSuffix: " · à jour",
  copyIdTip: "Copier l'identifiant de cet appareil (pour que l'équipe d'assistance accorde l'accès)",
  idCopied: "Identifiant copié",
  installRestart: "Installer et redémarrer",
  checkUpdates: "Rechercher les mises à jour",
  publishedEyebrow: "CE QUI A CHANGÉ",
  noPublished: "Aucune note de version publiée pour le moment.",
  envEyebrow: "VERSION DE TEST",
  envStagingDesc: "Version de test : données et services d'essai, séparés des vôtres.",
  envProductionDesc: "La version normale de l'app, avec vos données.",
  envSwitchConfirm: (env) =>
    `Passer à la version « ${env} » ? L'app redémarre, avec les données de cette version.`,
  envSwitchTo: (env) => `Passer à la version « ${env} »`,
  envProduction: "Normale",
  envStaging: "Test",
  envCustom: "Personnalisé",
  status: {
    checking: "Recherche de mises à jour…",
    available: (v) => `Mise à jour ${v} trouvée. Téléchargement…`,
    downloading: (p) => `Téléchargement… ${p}%`,
    downloaded: (v) => `Version ${v} prête à installer.`,
    notAvailable: "Vous êtes à jour.",
    unknownError: "Erreur inconnue.",
    withSize: (text, size) => `${text} (${size})`,
    errors: {
      noSpace: "Espace disque insuffisant pour installer la mise à jour. Libérez de l'espace, puis réessayez.",
      readOnlyVolume: (brand) =>
        `Pour se mettre à jour, ${brand} doit être dans le dossier Applications. Déplacez l'app depuis le disque d'installation (ou Téléchargements) vers Applications, puis relancez-la.`,
      appRunning: (brand) => `Une partie de l'app tournait encore. Quittez complètement ${brand}, puis relancez la mise à jour.`,
      signature: "La mise à jour téléchargée n'a pas passé le contrôle d'intégrité. Réessayez.",
      server: "Le serveur de mise à jour est momentanément indisponible. L'app réessaiera automatiquement.",
      download: "Téléchargement de la mise à jour impossible. Vérifiez votre connexion, puis réessayez.",
      network: "Connexion au serveur de mise à jour impossible. Vérifiez votre réseau, puis réessayez.",
      generic: "La mise à jour a échoué. Réessayez plus tard.",
    },
  },
  refusal: {
    notPrivileged: (brand) =>
      `Changement refusé : ce compte n'est pas autorisé sur la version de test. L'accès s'accorde par l'équipe ${brand}.`,
    writeFailed: "Le changement n'a pas pu être enregistré. Rien n'a changé. Réessayez.",
    generic: "Le changement a échoué. Réessayez.",
  },
} satisfies Messages["versionsTab"];
