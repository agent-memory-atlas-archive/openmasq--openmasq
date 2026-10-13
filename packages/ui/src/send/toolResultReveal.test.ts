import { describe, expect, it } from "vitest";
import type { Vault } from "@openmasq/redact";
import { makeRedactToolResult, type RedactToolResultDeps } from "./toolResult";
import { isRevealScopedTool } from "./toolMasking";
import type { Host } from "../host";
import type { Settings } from "../types";

/**
 * A pre-search reveal (« Ce message seulement », for THIS search) un-masks a category for
 * WEB tool results only: the categories every other connector's result is masked under
 * are a separate array the reveal never writes.
 */
function deps(webDisabledKinds: string[]): RedactToolResultDeps {
  return {
    engine: { disabledKinds: [], keep: [], avoid: undefined, kinds: {}, salt: 0, mode: "fake", commercialNotoriety: false, peopleNotoriety: true },
    webDisabledKinds,
    useRemote: false,
    useAiDetect: false,
    useModel: false,
    useLocal: false,
    settings: { redactEngine: "patterns", redactNumbers: false, redactCategories: {} } as unknown as Settings,
    host: {} as Host,
    extraSecrets: [],
    forced: [],
    completeFn: undefined,
    detectLocalFn: undefined,
    toolKinds: {},
  };
}

describe("reveal scope — web tools only", () => {
  const TEXT = "écrire à jean@example.com";

  it("a revealed category stays in clear in a WEB result", async () => {
    const redact = makeRedactToolResult(deps(["email"]));
    expect(await redact(TEXT, {} as Vault, "browser__browser_snapshot")).toContain("jean@example.com");
    expect(await redact(TEXT, {} as Vault, "web_fetch_many")).toContain("jean@example.com");
  });

  it("the same category stays MASKED in any other connector's result", async () => {
    const redact = makeRedactToolResult(deps(["email"]));
    expect(await redact(TEXT, {} as Vault, "gmail__search")).not.toContain("jean@example.com");
  });

  it("isRevealScopedTool names the web tools, not the others", () => {
    expect(isRevealScopedTool("browser__browser_navigate")).toBe(true);
    expect(isRevealScopedTool("web_fetch_many")).toBe(true);
    expect(isRevealScopedTool("gmail__search")).toBe(false);
    expect(isRevealScopedTool(undefined)).toBe(false);
  });
});
