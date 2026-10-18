import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Run in a child of its own: the cut is for the life of the process, and must not reach the
 * test runner. The child loads `offline.ts` the way the extraction worker does (first), then
 * tries what a parser taken over by a crafted file would try.
 */
const OFFLINE = fileURLToPath(new URL("./offline.ts", import.meta.url));
const PROBE = `
  await import(${JSON.stringify(OFFLINE)});
  const tryIt = async (f) => { try { await f(); return "ALLOWED"; } catch { return "denied"; } };
  const out = {
    fetch: await tryIt(() => fetch("https://example.com")),
    connect: await tryIt(() => require("node:net").connect(443, "1.1.1.1")),
    https: await tryIt(() => require("node:https").get("https://example.com")),
    dns: await tryIt(() => require("node:dns").lookup("example.com", () => {})),
    spawn: await tryIt(() => require("node:child_process").execSync("echo hi")),
  };
  console.log(JSON.stringify(out));
`;

function probe(env: Record<string, string>): Record<string, string> {
  const r = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `import { createRequire } from "node:module"; const require = createRequire(import.meta.url); ${PROBE}`], {
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 20_000,
  });
  const line = r.stdout.trim().split("\n").pop() ?? "";
  return JSON.parse(line || "{}");
}

describe("a parsing worker started offline", () => {
  it("can open no connection and start no program", () => {
    expect(probe({ OPENMASQ_OFFLINE: "1" })).toEqual({ fetch: "denied", connect: "denied", https: "denied", dns: "denied", spawn: "denied" });
  });

  it("is untouched when its parent did not ask (development, where OCR assets may come from the network)", () => {
    expect(probe({ OPENMASQ_OFFLINE: "" }).spawn).toBe("ALLOWED");
  });
});
