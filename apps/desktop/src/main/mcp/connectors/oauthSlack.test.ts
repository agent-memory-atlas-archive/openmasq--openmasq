// Slack login property: the token the app installs is the one consented to in THIS
// machine's browser, for THIS attempt. The handle must come back through our loopback
// carrying the per-attempt `state`, and redeeming it needs the verifier — knowing the
// authorize URL (and the challenge in it) settles nothing.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";

vi.mock("../server/connectCancel", () => ({ connectSignal: () => undefined }));
vi.mock("../focusApp", () => ({ focusMainWindow: () => {} }));
let opened: (url: string) => void = () => {};
vi.mock("./authOpen", () => ({ openAuthExternal: async (url: string) => opened(url) }));

import { slackLogin } from "./oauthSlack";

const AUTH = "https://auth.example";
const realFetch = globalThis.fetch;
let redeemed: { handle?: string; verifier?: string }[] = [];
let relayAnswer: () => Response = () => new Response(JSON.stringify({ token: "xoxp-real" }));

const b64u = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hit = async (url: string) => (await realFetch(url)).status;

beforeEach(() => {
  process.env.OPENMASQ_AUTH_URL = AUTH;
  redeemed = [];
  relayAnswer = () => new Response(JSON.stringify({ token: "xoxp-real" }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(AUTH)) {
        redeemed.push(JSON.parse(String(init?.body)));
        return relayAnswer();
      }
      return realFetch(input, init);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

/** Parse what the app put in Slack's authorize URL. */
function parseState(authorize: string) {
  const state = new URL(authorize).searchParams.get("state")!;
  const [tag, port, loopState, challenge] = state.split(".");
  return { tag, port: Number(port), loopState: loopState!, challenge: challenge! };
}

describe("slackLogin — the handoff comes back through the loopback", () => {
  it("redeems the handle the loopback received, with the verifier behind the challenge", async () => {
    let challenge = "";
    opened = (url) => {
      const s = parseState(url);
      expect(s.tag).toBe("l1");
      expect(new URL(url).searchParams.get("redirect_uri")).toBe(`${AUTH}/slack/callback`);
      challenge = s.challenge;
      void hit(`http://127.0.0.1:${s.port}/callback?code=handle-1&state=${s.loopState}`);
    };
    await expect(slackLogin({ clientId: "c", scopes: ["chat:write"], serverName: "slack" })).resolves.toBe("xoxp-real");
    expect(redeemed).toHaveLength(1);
    expect(redeemed[0]!.handle).toBe("handle-1");
    expect(b64u(createHash("sha256").update(redeemed[0]!.verifier!).digest())).toBe(challenge);
  });

  it("ignores a callback that knows the challenge but not the loopback's state", async () => {
    opened = (url) => {
      const s = parseState(url);
      void (async () => {
        // Forged from what the authorize URL shows: refused, settles nothing.
        expect(await hit(`http://127.0.0.1:${s.port}/callback?code=attacker&state=${s.challenge}`)).toBe(404);
        expect(await hit(`http://127.0.0.1:${s.port}/callback?code=attacker`)).toBe(404);
        await hit(`http://127.0.0.1:${s.port}/callback?code=handle-real&state=${s.loopState}`);
      })();
    };
    await expect(slackLogin({ clientId: "c", scopes: ["chat:write"], serverName: "slack" })).resolves.toBe("xoxp-real");
    expect(redeemed.map((r) => r.handle)).toEqual(["handle-real"]);
  });

  it("fails closed when the relay will not redeem the handle", async () => {
    relayAnswer = () => new Response(JSON.stringify({ error: "unknown" }), { status: 404 });
    opened = (url) => {
      const s = parseState(url);
      void hit(`http://127.0.0.1:${s.port}/callback?code=h&state=${s.loopState}`);
    };
    await expect(slackLogin({ clientId: "c", scopes: [], serverName: "slack" })).rejects.toThrow(/404/);
  });

  it("a refusal on Slack's page ends the attempt at once", async () => {
    opened = (url) => {
      const s = parseState(url);
      void hit(`http://127.0.0.1:${s.port}/callback?error=access_denied&state=${s.loopState}`);
    };
    await expect(slackLogin({ clientId: "c", scopes: [], serverName: "slack" })).rejects.toThrow(/access_denied/);
    expect(redeemed).toHaveLength(0);
  });
});
