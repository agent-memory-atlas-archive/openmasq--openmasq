import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The code that parses what a user attaches (PDFs, office files, images) and the runtime it
 * parses in are installed at ONE exact version each, in every workspace that installs them: a
 * range lets a lockfile refresh bring in a parser nobody looked at. Peer ranges are a published
 * library's contract with its host and stay ranges.
 */
const READERS = ["pdfjs-dist", "mammoth", "@napi-rs/canvas", "onnxruntime-node", "fflate", "xlsx", "electron"];
const WORKSPACES = ["apps/desktop", "packages/redact", "packages/ui"];
const EXACT = /^(\d+\.\d+\.\d+(-[\w.]+)?|workspace:\*|link:.+)$/;

describe("readers of attached files are pinned", () => {
  for (const ws of WORKSPACES) {
    it(`${ws}: one exact version each`, () => {
      const pkg = JSON.parse(readFileSync(new URL(`../../../../../${ws}/package.json`, import.meta.url), "utf8"));
      const installed: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
      for (const name of READERS) {
        const spec = installed[name];
        if (spec !== undefined) expect(spec, `${ws} ${name}`).toMatch(EXACT);
      }
    });
  }
});
