import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A browser navigation REFUSED in main must not name the URL it refused. Main receives the
 * arguments UN-REDACTED (rule 11): echoing them hands the model the real value behind the
 * fake it sent. The refusal keeps its wording class (blocked = operational, DNS outage =
 * transport) without the URL or its host.
 */

const { routes, allowScheme, publicCheck } = vi.hoisted(() => ({
  routes: new Map<string, { realName: string; server: { callTool: (c: unknown) => Promise<unknown> } }>(),
  allowScheme: { value: true },
  publicCheck: { error: null as null | (Error & { code?: string }) },
}));

vi.mock("electron", () => ({ BrowserWindow: class {}, app: {} }));
vi.mock("./server/connect", () => ({
  ensureBrowserConnLive: vi.fn(async () => {}),
  reconnectBrowserConn: vi.fn(async () => {}),
}));
vi.mock("./browserTools", () => ({
  browserMcpOutputDir: () => "/tmp",
  BROWSER_TOOL_ALLOWLIST: new Set(["browser_navigate", "browser_tabs"]),
  isAllowedBrowserUrl: () => allowScheme.value,
  rewriteSearchEngine: (u: string) => u,
}));
vi.mock("./browser/snapshotInline", () => ({
  outputLinkBasenames: () => [],
  inlineOutputLinks: (t: string) => ({ text: t, inlined: [] }),
}));
vi.mock("../net/fetchAllow", () => ({ noteFetchHostsFromText: () => {} }));
vi.mock("../net/net", () => ({
  assertPublicUrl: async () => {
    if (publicCheck.error) throw publicCheck.error;
  },
}));
vi.mock("./server/registry", () => ({ routes, refreshRoutes: vi.fn(async () => {}) }));

import { mcpCallTool } from "./server/callTool";

const REAL_HOST = "intranet.jeanne-real-name.example";
const REAL_URL = `https://${REAL_HOST}/dossier/jeanne.dupont@real.example`;

async function refusal(name: "browser_navigate" | "browser_tabs"): Promise<string> {
  const callTool = vi.fn(async () => ({ content: [] }));
  routes.set(`browser__${name}`, { realName: name, server: { callTool } });
  const args: Record<string, string> = name === "browser_tabs" ? { action: "new", url: REAL_URL } : { url: REAL_URL };
  const err = await mcpCallTool({ id: "1", name: `browser__${name}`, arguments: args }).catch((e) => e);
  expect(err).toBeInstanceOf(Error);
  expect(callTool).not.toHaveBeenCalled();
  return (err as Error).message;
}

beforeEach(() => {
  routes.clear();
  allowScheme.value = true;
  publicCheck.error = null;
});

describe("browser navigation refusal never echoes the real URL", () => {
  it("scheme refusal", async () => {
    allowScheme.value = false;
    for (const tool of ["browser_navigate", "browser_tabs"] as const) {
      const msg = await refusal(tool);
      expect(msg).toMatch(/Navigation bloquée/);
      expect(msg).not.toContain(REAL_HOST);
      expect(msg).not.toContain("jeanne");
    }
  });

  it("internal/private address refusal", async () => {
    publicCheck.error = new Error(`blocked ${REAL_URL}`);
    const msg = await refusal("browser_navigate");
    expect(msg).toMatch(/Navigation bloquée \(adresse interne\/privée\)/);
    expect(msg).not.toContain(REAL_HOST);
    expect(msg).not.toContain("jeanne");
  });

  it("DNS outage keeps its retryable wording without the host", async () => {
    publicCheck.error = Object.assign(new Error("dns"), { code: "EDNS_UNRESOLVED" });
    const msg = await refusal("browser_navigate");
    expect(msg).toMatch(/réseau ou DNS injoignable/);
    expect(msg).not.toContain(REAL_HOST);
  });
});
