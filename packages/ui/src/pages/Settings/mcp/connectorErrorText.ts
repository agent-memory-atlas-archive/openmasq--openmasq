import type { Messages } from "@openmasq/i18n";
/**
 * What the USER reads when a connector has failed — the readable counterpart to
 * `connectorErrorReason` (which itself only renders an enum for measurement).
 *
 * Before, the provider's RAW message displayed as-is, in two places: in the
 * modal, and in the grid where it REPLACES the description (the Vercel card stopped saying
 * what Vercel is to show "Refresh token is invalid."). Technical English,
 * with nothing telling you what to do, on the one screen where the fix takes one click.
 *
 * Rule: we DISGUISE nothing — a failure stays announced — but we say it in the
 * user's language and we name the action. The raw text isn't lost: it stays in the
 * debug journal, where it serves whoever is diagnosing.
 *
 * An UNKNOWN failure is still SAID — « La connexion n'a pas abouti. Réessayez ; si ça
 * continue, signalez-le. » — never dressed up as a success, and its raw text stays one click
 * away (`detail`, behind « Détail technique »): that is what a support conversation needs. A
 * sentence the desktop main already wrote for the user (`connectorOwnSentence.ts`) is shown
 * as it is. Only an EMPTY message returns `null`.
 */
import { isOwnSentence, stripIpcEnvelope } from "./connectorOwnSentence";

/** Dead authorization: the one case the user fixes themselves, in one click. */
const EXPIRED_RE =
  /invalid[_ ]grant|refresh token|expired or revoked|token (?:has )?(?:is )?(?:been )?(?:expired|revoked|invalid)|\b401\b|unauthorized|authorization (?:required|failed)|invalid[_ ]client/i;
/** The service is reachable but refuses us: nothing to re-click, it's on the service's side. */
const FORBIDDEN_RE = /\b403\b|forbidden|access denied|insufficient (?:scope|permission)/i;
/** Network: it'll work again on its own. */
const NETWORK_RE =
  /fetch failed|network|econnrefused|econnreset|enotfound|etimedout|timeout|socket|dns|\b5\d\d\b|bad gateway|service unavailable/i;
/** The server can't do the flow — neither the user nor a retry can do anything about it. */
const UNSUPPORTED_RE = /dynamic client registration|unknown server|no url|url refusée|url refused/i;
/** API key refused: the action is to replace it, not to reconnect. */
const APIKEY_RE = /clé api refusée|invalid[_ ]?api[_ ]?key|api key/i;
/** The service throttles us: waiting IS the fix, reconnecting would only add requests. */
const RATE_LIMIT_RE = /rate[ -]?limit|too many requests|\b429\b|quota exceeded/i;
/** The person closed the sign-in before the end — ours in every shipped language. */
const CANCELLED_RE = /connexion annulée|sign-in canceled|connection cancelled|user cancel/i;
/** Credentials the connector needs were never entered (`missing: client_id, …`). */
const MISSING_RE = /^missing: /i;

/**
 * The ONE classification of a connector failure (rule 9): the sentence below and the
 * analytics reason (`connectorErrorReason.ts`) both read it. `null` = not understood.
 * The ORDER carries the rule: a refused key and a 403 look like an expiration, but the
 * action differs — so the most specific family is tested first.
 */
export type ConnectorErrorFamily =
  | "apikey"
  | "unsupported"
  | "missing"
  | "cancelled"
  | "rate_limit"
  | "forbidden"
  | "expired"
  | "network";

const FAMILIES: [ConnectorErrorFamily, RegExp][] = [
  ["apikey", APIKEY_RE],
  ["unsupported", UNSUPPORTED_RE],
  ["missing", MISSING_RE],
  ["cancelled", CANCELLED_RE],
  ["rate_limit", RATE_LIMIT_RE],
  ["forbidden", FORBIDDEN_RE],
  ["expired", EXPIRED_RE],
  ["network", NETWORK_RE],
];

export function connectorErrorFamily(raw: string | undefined | null): ConnectorErrorFamily | null {
  const m = (raw ?? "").trim();
  if (!m) return null;
  return FAMILIES.find(([, re]) => re.test(m))?.[0] ?? null;
}

/** Reconnecting IS the gesture for these; for the others it changes nothing. */
const RECONNECTS = new Set<ConnectorErrorFamily>(["forbidden", "expired", "cancelled"]);

export interface ConnectorErrorText {
  /** The sentence shown in place of the raw message. */
  text: string;
  /** `true` when reconnecting IS the action — the UI then emphasizes it. */
  reconnect: boolean;
  /** The raw message, for « Détail technique » — absent when `text` already IS it. */
  detail?: string;
}

/** Microsoft's refusals (`AADSTS…`, or main's `microsoftRefused` around one): not a family
 *  of their own for measurement — the user still reads ONE plain sentence. */
const MICROSOFT_RE = /AADSTS\d+|connexion microsoft refusée|microsoft sign-in refused/i;

/** Renders the user-facing text, or `null` for an empty message. */
export function connectorErrorText(
  raw: string | undefined | null,
  t: Messages,
): ConnectorErrorText | null {
  const clean = stripIpcEnvelope(raw ?? "");
  if (!clean) return null;
  const e = t.mcpTab.errors;
  const family = connectorErrorFamily(clean);
  if (family) {
    const text: Record<ConnectorErrorFamily, string> = {
      apikey: e.apikey,
      unsupported: e.unsupported,
      missing: e.missing,
      cancelled: e.cancelled,
      rate_limit: e.rateLimit,
      forbidden: e.forbidden,
      expired: e.expired,
      network: e.network,
    };
    return { text: text[family], reconnect: RECONNECTS.has(family), detail: clean };
  }
  if (isOwnSentence(clean)) return { text: clean, reconnect: false };
  if (MICROSOFT_RE.test(clean)) return { text: t.mcpTab.errorMicrosoft, reconnect: false, detail: clean };
  return { text: t.mcpTab.errorGeneric, reconnect: false, detail: clean };
}
