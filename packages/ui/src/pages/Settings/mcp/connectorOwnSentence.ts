import { MESSAGES, type Messages } from "@openmasq/i18n";

/**
 * Is a connector failure one of OUR sentences — already written for the user by the
 * desktop main (`desktopMain.mcp`, `desktopMain.oauth`, in any shipped language)? Then
 * the card shows it as it is: « Votre organisation bloque ce service. » says exactly what
 * happened, and replacing it with the generic « La connexion n'a pas abouti » would hide
 * the one fact the user needs.
 *
 * ⚠️ Only the PLAIN ones are listed. A sentence that wraps a provider's raw text
 * (`microsoftRefused`, `tokenExchangeFailed`, `urlRefused`) or a technical id
 * (`unknownConnector`) is not: it is shown as a plain sentence, the raw part behind
 * « Détail technique ». Matching is exact (a template's parameters match any text), so a
 * provider message can never pass for ours.
 */
const MARK = "\u0001";

type Copy = string | ((...args: string[]) => string);

function plainSentences(m: Messages): Copy[] {
  const mcp = m.desktopMain.mcp;
  const oauth = m.desktopMain.oauth;
  return [
    mcp.folderNotAllowed,
    mcp.folderRequired,
    mcp.blockedByOrg,
    mcp.hostNotFound,
    mcp.privateAddress,
    mcp.noDynamicRegistration,
    mcp.accountAlreadyConnected,
    mcp.missingClientId,
    mcp.builtinKeysMissing,
    mcp.oneClickNotConfigured,
    mcp.missingGoogleSecret,
    mcp.byoRequired,
    oauth.microsoftAdminConsent,
    oauth.githubDenied,
    oauth.githubExpired,
    oauth.slackExpired,
    m.desktopMain.byoKeysBlocked,
  ];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toPattern(copy: Copy): RegExp {
  const text = typeof copy === "string" ? copy : copy(MARK, MARK, MARK);
  return new RegExp(`^${text.split(MARK).map(escape).join(".+")}$`);
}

const PATTERNS: RegExp[] = Object.values(MESSAGES).flatMap((m) => plainSentences(m).map(toPattern));

/** An error thrown in main reaches the renderer wrapped by Electron's IPC; the user reads
 *  what main said, not the envelope. */
export function stripIpcEnvelope(raw: string): string {
  return raw.replace(/^Error invoking remote method '[^']*':\s*(?:[A-Za-z]*Error:\s*)?/, "").trim();
}

export function isOwnSentence(text: string): boolean {
  return PATTERNS.some((re) => re.test(text));
}
