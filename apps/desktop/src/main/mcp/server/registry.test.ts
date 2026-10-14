import { describe, expect, it, beforeEach, vi } from "vitest";
import type { McpConnection } from "@openmasq/mcp";
import { connected, routes, refreshRoutes, mcpListToolsAll, toolCounts } from "./registry";
import { forgetTools } from "./toolListCache";

vi.mock("../persist", () => ({ getServer: () => undefined }));
vi.mock("../../runtime/errorReport", () => ({ reportMainError: () => {} }));

/**
 * THE ROUTING TABLE IS NEVER EMPTY (15/08 log entry).
 *
 * `refreshRoutes` cleared the table UP FRONT then refilled it behind an
 * `await listTools()` per server. Any tool call landing in this window —
 * a network round-trip — found no route and died with « Unknown MCP tool »
 * even though the tool existed: three parallel calls to the same tool, two got through, one
 * killed. The refresh now builds off to the side and swaps over in one shot.
 */

/** A stub connection whose `listTools` opens whenever we decide to. */
function fakeConn(toolNames: string[], gate?: Promise<void>): McpConnection {
  return {
    listTools: async () => {
      if (gate) await gate;
      return toolNames.map((name) => ({ name, description: "", inputSchema: {} }));
    },
    callTool: async () => ({ content: [] }),
    close: async () => {},
  } as unknown as McpConnection;
}

beforeEach(() => {
  connected.clear();
  routes.clear();
  forgetTools();
});

describe("refreshRoutes — la table reste lisible PENDANT le rafraîchissement", () => {
  it("une route connue survit à un rafraîchissement lent (le bug « Unknown MCP tool »)", async () => {
    connected.set("posthog", fakeConn(["exec", "execute-sql"]));
    await refreshRoutes();
    expect(routes.has("posthog__exec")).toBe(true);

    // Next refresh, blocked halfway through — this is the fatal window from before.
    let ouvre!: () => void;
    const porte = new Promise<void>((r) => (ouvre = r));
    connected.set("posthog", fakeConn(["exec", "execute-sql"], porte));
    const enCours = refreshRoutes();

    await Promise.resolve(); // we are indeed INSIDE the window: listTools has not returned
    expect(routes.has("posthog__exec"), "route perdue pendant le refresh").toBe(true);

    ouvre();
    await enCours;
    expect(routes.has("posthog__exec")).toBe(true);
  });

  it("deux rafraîchissements concurrents ne se vident pas mutuellement la table", async () => {
    connected.set("posthog", fakeConn(["exec"]));
    await refreshRoutes();

    let ouvre!: () => void;
    const porte = new Promise<void>((r) => (ouvre = r));
    connected.set("posthog", fakeConn(["exec"], porte));
    const a = refreshRoutes();
    const b = refreshRoutes();
    await Promise.resolve();
    expect(routes.has("posthog__exec")).toBe(true);
    ouvre();
    await Promise.all([a, b]);
    expect(routes.has("posthog__exec")).toBe(true);
  });

  it("un outil RETIRÉ côté serveur disparaît bien après la bascule", async () => {
    connected.set("posthog", fakeConn(["exec", "vieux-outil"]));
    await refreshRoutes();
    expect(routes.has("posthog__vieux-outil")).toBe(true);

    connected.set("posthog", fakeConn(["exec"]));
    await refreshRoutes();
    expect(routes.has("posthog__vieux-outil")).toBe(false);
    expect(routes.has("posthog__exec")).toBe(true);
  });
});

/** A connection whose `listTools` is a spy we can make fail. */
function spyConn(toolNames: string[]) {
  const listTools = vi.fn(async () => toolNames.map((name) => ({ name, description: "", inputSchema: {} })));
  const conn = { listTools, callTool: async () => ({ content: [] }), close: async () => {} } as unknown as McpConnection;
  return { conn, listTools };
}

describe("refreshRoutes — a connector's tools survive a refused listing", () => {
  it("a rate-limited listing on a LIVE transport keeps the last answer instead of dropping the tools", async () => {
    const { conn, listTools } = spyConn(["exec"]);
    connected.set("posthog", conn);
    await refreshRoutes();
    listTools.mockRejectedValueOnce(new Error("Streamable HTTP error: Rate limit exceeded. Please wait before trying again."));
    await refreshRoutes();
    expect(routes.has("posthog__exec")).toBe(true);
    expect(toolCounts.get("posthog")).toBe(1);
  });

  it("with no earlier answer, a refused listing offers nothing (never a guess)", async () => {
    const { conn, listTools } = spyConn(["exec"]);
    listTools.mockRejectedValueOnce(new Error("Rate limit exceeded"));
    connected.set("posthog", conn);
    await refreshRoutes();
    expect(routes.has("posthog__exec")).toBe(false);
    expect(toolCounts.get("posthog")).toBe(0);
  });

  it("the per-send listing reuses a recent answer; a connect-time refresh re-lists", async () => {
    const { conn, listTools } = spyConn(["exec"]);
    connected.set("posthog", conn);
    await mcpListToolsAll();
    await mcpListToolsAll();
    expect(listTools).toHaveBeenCalledTimes(1);
    await refreshRoutes();
    expect(listTools).toHaveBeenCalledTimes(2);
  });

  it("a reconnect under the same id is a new connection: its list is never served from the old one", async () => {
    const first = spyConn(["exec"]);
    connected.set("posthog", first.conn);
    await mcpListToolsAll();
    const second = spyConn(["exec", "query"]);
    connected.set("posthog", second.conn);
    await mcpListToolsAll();
    expect(second.listTools).toHaveBeenCalledTimes(1);
    expect(routes.has("posthog__query")).toBe(true);
  });
});
