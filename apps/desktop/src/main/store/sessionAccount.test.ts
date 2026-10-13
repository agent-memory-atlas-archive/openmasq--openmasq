import { describe, it, expect, vi } from "vitest";

// The persisted session lives in auth.enc; here the stored values are handed in directly.
vi.mock("./authStore", () => ({ authStoreValues: () => [] }));

const { jwtSubject, sessionSubject, heldSessionAccounts, assertSessionAccount, AccountScopeError } =
  await import("./sessionAccount");

/** An UNSIGNED JWT with the given claims — main decodes, it does not verify. */
const jwt = (claims: Record<string, unknown>) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

const session = (uid: string, token = jwt({ sub: uid })) =>
  JSON.stringify({ access_token: token, refresh_token: "r", user: { id: uid } });

describe("sessionSubject — the account of the session main holds", () => {
  it("reads the access token's sub", () => {
    expect(jwtSubject(jwt({ sub: "user-a" }))).toBe("user-a");
    expect(sessionSubject(session("user-a"))).toBe("user-a");
  });

  it("prefers the token's sub over the stored user id", () => {
    const raw = JSON.stringify({ access_token: jwt({ sub: "user-a" }), user: { id: "user-b" } });
    expect(sessionSubject(raw)).toBe("user-a");
  });

  it("falls back to the stored user id when the token is not a JWT", () => {
    expect(sessionSubject(session("u1", "opaque-token"))).toBe("u1");
  });

  it("reads the legacy `currentSession` envelope", () => {
    const raw = JSON.stringify({ currentSession: { access_token: jwt({ sub: "user-a" }) } });
    expect(sessionSubject(raw)).toBe("user-a");
  });

  it("holds nothing for an absent or malformed value", () => {
    expect(sessionSubject(null)).toBeNull();
    expect(sessionSubject("not json")).toBeNull();
    expect(sessionSubject(JSON.stringify({ code_verifier: "x" }))).toBeNull();
    expect(jwtSubject("a.%%%.c")).toBeNull();
  });
});

describe("assertSessionAccount — a re-scope follows the held session, never the caller", () => {
  const held = heldSessionAccounts([session("user-a")]);

  it("honours the signed-in account", () => {
    expect(() => assertSessionAccount("keys:set-user", "user-a", held)).not.toThrow();
  });

  it("REFUSES another account's uid (renderer-chosen re-scope)", () => {
    expect(() => assertSessionAccount("keys:set-user", "user-b", held)).toThrow(AccountScopeError);
  });

  it("REFUSES any uid when main holds no session", () => {
    expect(() => assertSessionAccount("db:set-user", "user-a", [])).toThrow(AccountScopeError);
  });

  it("always honours sign-out (null): it only closes scopes", () => {
    expect(() => assertSessionAccount("mcp:set-user", null, [])).not.toThrow();
  });

  it("names the channel, never the uid", () => {
    try {
      assertSessionAccount("sync:set-user", "secret-uid", held);
    } catch (e) {
      expect((e as Error).message).toContain("sync:set-user");
      expect((e as Error).message).not.toContain("secret-uid");
    }
  });
});
