import { authStoreValues } from "./authStore";

/**
 * WHICH account main holds a session for — the identity every per-account re-scope
 * (`keys:set-user`, `db:set-user`, `mcp:set-user`, `sync:set-user`) is checked against.
 *
 * The uid in those calls comes from the renderer, which is untrusted (root rule 7): an XSS
 * naming another local account's uid would re-point the keys, the DB, the connectors and the
 * sync passphrase at that account's files. Main holds the session itself (`authStore.ts`,
 * written by the auth client BEFORE it notifies its listeners, hence before any set-user), so
 * a re-scope is honoured only toward the account of a session main holds. `null` (signed
 * out) is always honoured: it can only close scopes.
 *
 * The account is the access token's `sub` when the token is a JWT, else the stored
 * `user.id` (the shape the auth client persists). ⚠️ RESIDUAL: main cannot verify the JWT
 * signature offline and `authstore:set` is itself renderer-callable, so this binds the
 * re-scope to the session main holds — it does not authenticate that session.
 * Pinned by `sessionAccount.test.ts`.
 */

/** The auth client's session key: `sb-<ref>-auth-token` (not `…-code-verifier`). */
const SESSION_KEY = /-auth-token$/;

/** The `sub` claim of a JWT, decoded WITHOUT verification; null if it is not one. */
export function jwtSubject(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { sub?: unknown };
    return typeof claims.sub === "string" && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

/** The account a persisted session value belongs to, or null if it holds none. */
export function sessionSubject(raw: string | null): string | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  type S = { access_token?: unknown; user?: { id?: unknown } };
  const p = parsed as (S & { currentSession?: S }) | null;
  const s = p && typeof p === "object" ? (p.access_token ? p : p.currentSession) : undefined;
  if (!s || typeof s !== "object") return null;
  const sub = jwtSubject(s.access_token);
  if (sub) return sub;
  const id = s.user?.id;
  return typeof id === "string" && id ? id : null;
}

/** The accounts main currently holds a session for (normally zero or one). */
export function heldSessionAccounts(values: string[] = authStoreValues((k) => SESSION_KEY.test(k))): string[] {
  return values.map(sessionSubject).filter((x): x is string => !!x);
}

export class AccountScopeError extends Error {
  constructor(channel: string) {
    super(`IPC ${channel}: account is not the signed-in session`);
    this.name = "AccountScopeError";
  }
}

/** Throw unless `uid` is null (signed out) or the account of a session main holds. */
export function assertSessionAccount(channel: string, uid: string | null, held = heldSessionAccounts()): void {
  if (uid === null) return;
  if (!held.includes(uid)) {
    console.warn(`[ipc] refused: ${channel} toward an account with no held session`);
    throw new AccountScopeError(channel);
  }
}
