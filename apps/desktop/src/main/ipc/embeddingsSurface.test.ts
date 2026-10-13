import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * No IPC embeds renderer-supplied text through a network endpoint. Such a channel takes the
 * TEXT and the ENDPOINT from the renderer and POSTs one to the other from main: a renderer
 * XSS would get an arbitrary-public-host exfiltration primitive. The only embedder reachable
 * over IPC is the on-device one (`memory:index-*`, `../embed`).
 */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : sources(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("embeddings IPC surface", () => {
  it("neither main nor the preload declares an `embeddings:*` channel", () => {
    const root = join(__dirname, "..", "..");
    const offenders = [...sources(join(root, "main")), ...sources(join(root, "preload"))].filter((f) =>
      /\b(?:handle|on|once|invoke|send|sendSync)\(\s*["'`]embeddings:/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
