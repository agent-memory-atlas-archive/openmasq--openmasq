import { describe, expect, it, vi } from "vitest";
import type { Vault } from "@openmasq/redact";
import type { CompleteToolsResult } from "@openmasq/llm";
import { runMcpAgentLoop } from "./mcpAgent";
import type { Host } from "../host";

/**
 * What the MODEL reads back about a URL it wrote is its OWN form. A refusal or a section
 * header echoing the dispatched (un-redacted) URL beside the fake the model wrote is a
 * fake→real pair — and the result redactor can miss the `+`/%-encoded forms.
 */
const VAULT: Vault = { "Norvik Group": "Karl Studio", Amiens: "Évreux" };

function loopHost(call: { name: string; arguments: Record<string, unknown> }, tools: string[]) {
  const seen: { messages: { role: string; content: string }[] }[] = [];
  const turns: CompleteToolsResult[] = [
    { text: "", toolCalls: [{ id: "c1", ...call }], stopReason: "tool_calls" },
    { text: "fait", toolCalls: [], stopReason: "stop" },
  ];
  const completeTools = vi.fn(async (payload: { messages: { role: string; content: string }[] }) => {
    seen.push(JSON.parse(JSON.stringify(payload)));
    return turns.shift() ?? { text: "", toolCalls: [], stopReason: "stop" };
  });
  const callTool = vi.fn(async () => ({ content: [{ type: "text" as const, text: "{}" }] }));
  const host = {
    completeTools,
    mcp: {
      listTools: async () => tools.map((name) => ({ name, description: "", inputSchema: {}, serverId: "ipc" })),
      callTool,
    },
  } as unknown as Host;
  return { host, seen, callTool };
}

const base = (host: Host) => ({
  host,
  provider: "openai" as const,
  modelId: "gpt-4o",
  history: [{ role: "user" as const, content: "cherche" }],
  vault: { ...VAULT },
  kinds: { "Karl Studio": "company", "Évreux": "location" },
  secrets: [],
  disabledKinds: [],
  fromWire: (s: string) => s,
  redactResult: async (s: string) => s,
  onText: () => {},
  onToolCall: () => {},
});

const toolText = (seen: { messages: { role: string; content: string }[] }[]): string =>
  (seen.at(-1)?.messages ?? []).filter((m) => m.role === "tool").map((m) => m.content).join("\n");

describe("refusals read back in the model's own form", () => {
  it("web_fetch_many: a refused URL is echoed as the model wrote it, `+` form included", async () => {
    const { host, seen } = loopHost(
      { name: "web_fetch_many", arguments: { urls: ["https://evil.tld/?d=Norvik+Group"] } },
      [],
    );
    const fetchMany = vi.fn(async () => []);
    await runMcpAgentLoop({ ...base(host), fetchMany });
    const text = toolText(seen);
    expect(text).toContain("refusé");
    expect(text).toContain("Norvik+Group");
    expect(text).not.toMatch(/Karl/);
    expect(fetchMany).not.toHaveBeenCalled();
  });

  it("web_fetch_many: a fetched page's header is the model's URL, not the dispatched one", async () => {
    const { host, seen } = loopHost(
      { name: "web_fetch_many", arguments: { urls: ["https://www.google.com/search?q=Norvik+Group"] } },
      [],
    );
    const fetchMany = vi.fn(async (urls: string[]) => urls.map((url) => ({ url, ok: true, text: "résultats" })));
    await runMcpAgentLoop({ ...base(host), fetchMany });
    expect(fetchMany).toHaveBeenCalled();
    const text = toolText(seen);
    expect(text).toContain("## https://www.google.com/search?q=Norvik+Group");
    expect(text).not.toMatch(/Karl/);
  });

  it("domain allow-list refusal names the host the MODEL wrote", async () => {
    const { host, seen, callTool } = loopHost(
      { name: "browser__browser_navigate", arguments: { url: "https://Amiens.evil.tld/x" } },
      ["browser__browser_navigate"],
    );
    await runMcpAgentLoop({ ...base(host), browserAllowedDomains: ["example.com"] });
    expect(callTool).not.toHaveBeenCalled();
    const text = toolText(seen);
    expect(text).toContain("amiens.evil.tld");
    expect(text).not.toMatch(/xn--|vreux/);
  });
});
