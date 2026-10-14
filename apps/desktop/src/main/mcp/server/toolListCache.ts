import type { McpConnection, McpTool } from "@openmasq/mcp";

/**
 * The last tool list each connection ANSWERED, bound to the connection object itself: a
 * reconnect under the same id is a new object, so a stale entry can never be served for it.
 *
 * Two uses, both in `refreshRoutes`:
 * - a list younger than the caller's `maxAgeMs` is reused without a round-trip. The agent
 *   loop re-lists every connected server on EVERY send, and services rate-limit `tools/list`
 *   (observed: 15 « Rate limit exceeded » in one session). Only the renderer's listing asks
 *   for this; a connect or an unknown-tool lookup always re-lists.
 * - a listing that FAILS without the transport being dead (rate limit, a 5xx) falls back to
 *   the last answer, so the connector's tools stay offered instead of vanishing for the turn.
 *   A call still goes to the live server: a tool it no longer has fails there, as it would.
 */
const lists = new Map<string, { conn: McpConnection; tools: McpTool[]; at: number }>();

/** The cached list when it belongs to THIS connection and is young enough, else `null`. */
export function freshTools(id: string, conn: McpConnection, maxAgeMs: number, now = Date.now()): McpTool[] | null {
  const e = lists.get(id);
  return e && e.conn === conn && maxAgeMs > 0 && now - e.at < maxAgeMs ? e.tools : null;
}

/** The last list THIS connection answered, whatever its age, else `null`. */
export function lastKnownTools(id: string, conn: McpConnection): McpTool[] | null {
  const e = lists.get(id);
  return e && e.conn === conn ? e.tools : null;
}

export function rememberTools(id: string, conn: McpConnection, tools: McpTool[], now = Date.now()): void {
  lists.set(id, { conn, tools, at: now });
}

export function forgetTools(id?: string): void {
  if (id === undefined) lists.clear();
  else lists.delete(id);
}
