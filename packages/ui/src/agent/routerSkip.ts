/**
 * Is the routing MODEL CALL worth its latency for this request?
 *
 * The router is a full model round-trip (3–10 s through a subscription CLI) made before
 * the answer starts, and on conversation it comes back EMPTY — measured: 54 empty picks
 * out of ~70 routed turns. An empty pick is a supported state, not a failure: the loop
 * still offers the whole catalog + `load_tools`, and the deterministic rescues that follow
 * routing (`entryTools.ts` web intent, `connectorRescue.ts` named / scoped connectors) put
 * back what a request names. So skipping the call on a request with no sign of needing a
 * tool loses no capability: it lands in the state the router would have produced.
 *
 * The signal errs toward ROUTING: any action or data word, a possessive, a URL or a path
 * keeps the call, and so does a compétence that declares its connectors. A miss here costs
 * one `load_tools` step, a false alarm costs today's latency.
 */
const TOOL_SIGNAL_RE = new RegExp(
  [
    // something to fetch or open
    "https?://", "\\bwww\\.", "\\b[a-z0-9-]+\\.(com|fr|org|net|io|dev|app|co)\\b", "[~/\\\\][\\w.-]+/",
    // data the user owns: « mes pages », « my tickets »
    "\\b(mes|mon|ma|nos|notre|my|our)\\b",
    "fichier", "dossier", "document", "\\bpdf\\b", "excel", "tableur", "\\bcsv\\b", "pi[eè]ce jointe",
    "\\be-?mails?\\b", "courriel", "messagerie", "bo[iî]te de r[ée]ception", "agenda", "calendrier",
    "r[ée]union", "rendez-vous", "\\btickets?\\b", "\\bcanal\\b", "\\bpage notion\\b",
    // things to do (FR)
    "cherche", "trouve", "\\bliste", "ouvre", "\\blis\\b", "lire", "t[ée]l[ée]charge", "envoie", "envoyer",
    "programme", "planifie", "r[ée]serve", "\\bcr[ée]e", "ajoute", "mets? [àa] jour", "supprime",
    "exporte", "importe", "graphique", "\\bcalcule", "ex[ée]cute", "python", "\\bscript", "navigue",
    "consulte", "v[ée]rifie (sur|dans)", "r[ée]cup[eè]re", "partage",
    // data and actions (EN)
    "\\bfiles?\\b", "\\bfolders?\\b", "\\bdocs?\\b", "spreadsheet", "attachment", "\\binbox\\b",
    "calendar", "meeting", "\\bsearch", "\\bfind\\b", "\\blist\\b", "\\bopen\\b", "\\bread\\b",
    "download", "\\bsend\\b", "schedule", "\\bbook\\b", "\\bcreate\\b", "\\badd\\b", "\\bupdate\\b",
    "\\bdelete\\b", "\\bexport", "\\bimport", "\\bchart\\b", "\\bplot\\b", "\\brun\\b", "\\bfetch\\b",
    "\\bcheck\\b", "\\bshare\\b",
  ].join("|"),
  "i",
);

/** True when the request carries any sign of needing a tool — then the router runs. */
export function routerWorthCalling(userText: string, scopedConnectors: readonly string[] = []): boolean {
  return scopedConnectors.length > 0 || TOOL_SIGNAL_RE.test(userText);
}
