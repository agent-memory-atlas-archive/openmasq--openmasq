import {
  isDbConfigured,
  setDbUser,
  dbLoad,
  dbSaveConversation,
  dbDeleteConversation,
  dbSaveSettings,
  dbSaveDebugLog,
  dbLoadDebugLog,
  dbSaveEgressLog,
  dbLoadEgressLog,
} from "../db";
import { attachEgressSink, listEgress, type EgressRecord } from "../net/egressLog";
import { probeEndpoint } from "../net/localEndpoint";
import { memoryIndexSync, memoryIndexEdges, memoryIndexQuery, type MemoryIndexCard } from "../embed";
import { handle, str, obj, arr, optional, num, nullable } from "./handle";
import { assertSessionAccount } from "../store/sessionAccount";

/**
 * Register the persistence IPC — the local Turso/libSQL DB CRUD and the on-device memory
 * index. Pure data plane: no read-gate / secret / spawn boundary (those stay in index.ts),
 * just thin wrappers over `../db` + `../embed`.
 * (`mcp:set-user` is deliberately NOT here — it re-scopes MCP, not the DB.)
 *
 * Arguments are shape-checked at the boundary (`./handle`) — the annotations below are
 * erased at runtime, and the renderer is untrusted.
 */
export function registerDataIpc(): void {
  // Turso/libSQL persistence (no-ops when TURSO_DATABASE_URL isn't set).
  handle("db:configured", [], () => isDbConfigured());
  // Point the local DB at the signed-in account's file (per-account isolation). The
  // renderer calls this before `db:load` on sign-in / account switch. E2E disables it.
  // `null` is meaningful (signed out), so nullable rather than optional. A non-null uid
  // must be the account of the session main holds (`../store/sessionAccount.ts`).
  handle("db:set-user", [nullable(str)], async (_e, userId) => {
    assertSessionAccount("db:set-user", userId);
    if (process.env.OPENMASQ_DISABLE_DB) return;
    await setDbUser(userId);
    // The egress journal is per-account for the same reason the DB is: it describes which
    // services this person talks to. Re-point it in the SAME operation, AFTER the DB handle
    // has moved — attaching first would flush the outgoing account's ring into the incoming
    // account's file. `null` (signed out) detaches, so nothing is recorded until sign-in.
    await attachEgressSink(
      userId
        ? {
            load: async () => {
              const raw = await dbLoadEgressLog();
              if (!raw) return [];
              const parsed: unknown = JSON.parse(raw);
              return Array.isArray(parsed) ? (parsed as EgressRecord[]) : [];
            },
            save: (records) => dbSaveEgressLog(JSON.stringify(records)),
          }
        : null,
    ).catch(() => {});
  });
  handle("db:load", [], () => dbLoad());
  handle("db:save-conversation", [obj], (_e, conv) => dbSaveConversation(conv as never));
  handle("db:delete-conversation", [str], (_e, id) => dbDeleteConversation(id));
  handle("db:save-settings", [obj], (_e, settings) => dbSaveSettings(settings as never));
  // The renderer's DEBUG JOURNAL ring (wire text + vault values = real PII): its only
  // at-rest home is this per-account encrypted DB — same rule as the vault. Whole-ring
  // replace on save; content is the renderer's own data, so no gate beyond the shape.
  handle("db:save-debug-journal", [str], (_e, json) => dbSaveDebugLog(json));
  handle("db:load-debug-journal", [], () => dbLoadDebugLog());

  // The EGRESS journal — read-only from the renderer. Main is the sole writer (the record
  // would be worthless if the untrusted side could author or erase rows), so there is no
  // `egress:record` and deliberately no `egress:clear`.
  handle("egress:list", [optional(num)], (_e, limit) => listEgress({ limit: limit ?? 500 }));

  // Reachability probe of a self-hosted (openai-compat / Ollama) endpoint — SSRF-gated
  // (`../net/localEndpoint.ts`), best-effort, for the model picker's joignable/injoignable
  // status. Never throws (returns false on any failure).
  handle("chat:probe-endpoint", [str], (_e, baseUrl) => probeEndpoint(baseUrl));

  // MÉMOIRE semantic index — ON-DEVICE embeddings only (`../embed`, bundled e5-small in
  // a utilityProcess), never a network embeddings API: a memory card is real PII.
  handle("memory:index-sync", [arr], (_e, cards) => memoryIndexSync(cards as MemoryIndexCard[]));
  handle("memory:index-edges", [optional(num)], (_e, k) => memoryIndexEdges(k));
  // The semantic recall of `memory_search`: the query is real text — embedded
  // on-device, never routed to a network embeddings API, never logged.
  handle("memory:index-query", [str, optional(num)], (_e, text, k) => memoryIndexQuery(text, k));
}
