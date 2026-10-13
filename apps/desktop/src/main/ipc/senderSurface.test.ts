import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Every IPC listener in main sits behind the sender gate (`./senderGate.ts`). The only
 * files that may touch `ipcMain`'s listener API directly are the two that APPLY the gate:
 * `handle.ts` (`handle()`) and `senderGate.ts` (`trustedHandle`/`trustedOn`/`trustedOnce`).
 * A per-webContents `.ipc` listener would bypass it the same way, so it is refused too.
 */
const GATE_FILES = new Set(["ipc/handle.ts", "ipc/senderGate.ts"]);
const RAW = /\bipcMain\s*\.\s*(?:handle|handleOnce|on|once|addListener|prependListener|prependOnceListener)\s*\(/;
const PER_CONTENTS = /\.ipc\s*\.\s*(?:handle|handleOnce|on|once|addListener|prependListener|prependOnceListener)\s*\(/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : sources(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("main IPC surface — no listener outside the sender gate", () => {
  const root = join(__dirname, "..");
  const files = sources(root).map((f) => ({ rel: relative(root, f).split(sep).join("/"), src: readFileSync(f, "utf8") }));

  it("the scan sees the gate itself (the pattern is not dead)", () => {
    expect(files.filter((f) => RAW.test(f.src)).map((f) => f.rel).sort()).toEqual([...GATE_FILES].sort());
  });

  it("no raw `ipcMain` listener outside handle.ts / senderGate.ts", () => {
    const offenders = files.filter((f) => !GATE_FILES.has(f.rel) && RAW.test(f.src)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("no per-webContents `.ipc` listener anywhere", () => {
    expect(files.filter((f) => PER_CONTENTS.test(f.src)).map((f) => f.rel)).toEqual([]);
  });
});
