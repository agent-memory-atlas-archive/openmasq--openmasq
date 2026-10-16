import { newVerifier, challengeOf } from "./pkce";
import { openAuthExternal } from "./authOpen";
import { startLoopback } from "../oauthLoopback";
import { focusMainWindow } from "../focusApp";
import { mainMessages } from "../../i18n";

/**
 * Slack OAuth — desktop-direct, but Slack can't do PKCE and needs an HTTPS
 * redirect, so the single, environment-independent AUTH-ONLY relay
 * holds the app's own Slack secret and provides the callback. The Slack DATA never
 * transits the relay — only the token exchange. The contract (token never in a URL):
 *   1. start a 127.0.0.1 loopback; generate a `verifier`;
 *      `state = l1.<port>.<loopState>.<SHA256(verifier)>`;
 *   2. open Slack authorize (redirect → `<auth>/slack/callback`);
 *   3. the relay sends the browser back to our loopback with an opaque one-shot
 *      `code=<handle>` and `state=<loopState>`;
 *   4. the loopback settles ONLY on its own `loopState`, then we redeem the handle
 *      WITH the `verifier` at `<auth>/slack/token`.
 *
 * The property held: the token the app installs is the one consented to in THIS
 * machine's browser, for THIS attempt. Knowing the authorize URL is not enough — the
 * handle must come back through our loopback, and redeeming it needs the verifier,
 * which never leaves main (`oauthSlack.test.ts`).
 */
// Slack's AUTHORIZE endpoint has NO `/api/` prefix (that's only for API methods
// like `oauth.v2.access`). Using `/api/oauth/v2/authorize` yields Slack's generic
// "something went wrong" page.
const AUTHORIZE = "https://slack.com/oauth/v2/authorize";
const TIMEOUT_MS = 5 * 60 * 1000;

/** The single, environment-independent auth-only relay that serves /slack/*. */
function authBase(): string {
  const u = process.env.OPENMASQ_AUTH_URL;
  // A build without the relay: say it in the user's words (the env name means nothing to them).
  if (!u) throw new Error(mainMessages().desktopMain.mcp.oneClickNotConfigured);
  return u.replace(/\/$/, "");
}

/** Redeem the handle the loopback received — one shot, the relay deletes it. */
async function redeem(base: string, handle: string, verifier: string): Promise<string> {
  const res = await fetch(`${base}/slack/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, verifier }),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  if (!res.ok || !data.token) {
    throw new Error(mainMessages().desktopMain.oauth.tokenExchangeFailed("Slack", res.status));
  }
  return data.token;
}

/** Run the interactive Slack login and resolve the user access token. */
export async function slackLogin(opts: {
  clientId: string;
  scopes: string[];
  serverName: string;
}): Promise<string> {
  const base = authBase();
  const loop = await startLoopback(undefined, focusMainWindow);
  try {
    const verifier = newVerifier();
    const url = new URL(AUTHORIZE);
    url.searchParams.set("client_id", opts.clientId);
    // USER scopes (comma-separated) — the token lands under `authed_user`.
    url.searchParams.set("user_scope", opts.scopes.join(","));
    url.searchParams.set("redirect_uri", `${base}/slack/callback`);
    url.searchParams.set("state", `l1.${loop.port}.${loop.state}.${challengeOf(verifier)}`);

    // Open Slack authorize in the SYSTEM BROWSER, not an embedded window: a Slack
    // workspace using Google SSO would hit Google's `disallowed_useragent` webview
    // block. The relay then sends that same browser to our loopback.
    await openAuthExternal(url.toString());
    // A refusal on Slack's page comes back as the loopback's own error (`access_denied`);
    // only the timeout reads as "expired".
    const handle = await loop.waitForCode(TIMEOUT_MS).catch((e: unknown) => {
      if (e instanceof Error && /not completed in time/.test(e.message)) {
        throw new Error(mainMessages().desktopMain.oauth.slackExpired);
      }
      throw e;
    });
    return await redeem(base, handle, verifier);
  } finally {
    loop.close();
  }
}
