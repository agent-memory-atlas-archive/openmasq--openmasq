/**
 * The CONNECTORS tab, second half of the contract: the confirmations before a destructive
 * gesture, the manual connection fold, the plain-language failures and the tool list's
 * technical names. Extended by `McpTabMessages` (`./mcpTab.ts`), so the namespace stays
 * ONE (`t.mcpTab`) while each file stays under the size cap.
 */
export interface McpTabMoreMessages {
  /** « Déconnecter » and « Supprimer ce connecteur » ask first (`ConfirmDialog`). */
  confirmDisconnect: { title: (name: string) => string; body: string; cta: string };
  confirmForget: { title: (name: string) => string; body: string; cta: string };
  /** The visible explanation under « Connecter (accès partiel) ». */
  connectLimitedNote: (brand: string, adds: string) => string;
  /** The BYO button of a Google connector whose one-click is pending: an ADVANCED option. */
  myKeysGoogle: string;
  /** A plan the SERVICE requires (`McpConnector.paidPlan`). */
  paidPlan: (plan: string) => string;
  /** The fold at the bottom of the grid that holds the manual (custom) connection. */
  manualFold: string;
  manualFoldBody: (brand: string) => string;
  /** Under « Adresse du service » in the manual form. */
  customUrlHint: string;
  customUrlPlaceholder: string;
  /** « … reconnectez-le depuis sa fiche », after the list of peers. */
  sharedAuthTail: string;
  /** What a host without the capability answers. */
  desktopOnly: string;
  addFailed: string;
  setDirsFailed: string;
  /** The tool list: where the description comes from, and the technical name. */
  toolDescBy: (service: string) => string;
  toolTechName: string;
  /** A failure we do not recognise: a plain sentence, the raw text behind « Détail technique ». */
  errorGeneric: string;
  errorMicrosoft: string;
  technicalDetail: string;
}
