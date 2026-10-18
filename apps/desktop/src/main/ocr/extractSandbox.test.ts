import { mkdtempSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { isPackaged: false, getAppPath: () => "/nowhere", getPath: () => "/nowhere" } }));

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** A bundle folder and the digest file main keeps sealed in its asar. */
function setUp(bundle: string, manifest: string, sealed: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "omq-sandbox-"));
  writeFileSync(join(dir, "extractWorker.mjs"), bundle);
  writeFileSync(join(dir, "package.json"), manifest);
  writeFileSync(join(dir, "extractSandbox.sha256"), `${sealed.join("\n")}\n`);
  return { bundle: join(dir, "extractWorker.mjs"), sealed: join(dir, "extractSandbox.sha256") };
}

describe("the jailed worker's bundle runs only as built", () => {
  it("runs when every listed file matches the sealed digest", async () => {
    const { bundleIntact } = await import("./extractSandbox");
    const f = setUp("code", "{}", [`${sha("code")}  extractWorker.mjs`, `${sha("{}")}  package.json`]);
    expect(bundleIntact(f.bundle, f.sealed)).toBe(true);
  });

  it("never runs a bundle, or its package.json, changed after the build", async () => {
    const { bundleIntact } = await import("./extractSandbox");
    expect(bundleIntact(setUp("tampered", "{}", [`${sha("code")}  extractWorker.mjs`, `${sha("{}")}  package.json`]).bundle, setUp("tampered", "{}", [`${sha("code")}  extractWorker.mjs`]).sealed)).toBe(false);
    const f = setUp("code", '{"imports":{}}', [`${sha("code")}  extractWorker.mjs`, `${sha("{}")}  package.json`]);
    expect(bundleIntact(f.bundle, f.sealed)).toBe(false);
  });

  it("never runs without a digest naming the bundle", async () => {
    const { bundleIntact } = await import("./extractSandbox");
    const f = setUp("code", "{}", [`${sha("{}")}  package.json`]);
    expect(bundleIntact(f.bundle, f.sealed)).toBe(false);
    expect(bundleIntact(f.bundle, join(tmpdir(), "no-such-digest"))).toBe(false);
  });
});
