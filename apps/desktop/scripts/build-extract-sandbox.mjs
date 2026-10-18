/**
 * The extraction worker as ONE self-contained file, for the jail (`src/main/ocr/extractSandbox.ts`):
 * `out/sandboxed/extractWorker.mjs`, every JavaScript parser inside it (pdf.js and its worker,
 * SheetJS, mammoth, fflate, the redaction engine). Only what loads natives or WASM by path stays
 * outside, already unpacked from the asar: tesseract, onnxruntime, the canvas.
 *
 * Beside it, a `package.json` of its own: Node looks for the package scope of a module it resolves
 * by walking up from it, and inside the jail every folder above the bundle is unreadable (a
 * read refused there is an error, not a miss); this one ends the walk at once.
 *
 * The Node beside the app cannot read inside `app.asar`, so both files are unpacked
 * (`asarUnpack`), out of the asar's integrity seal. Their SHA-256 go INTO the seal instead:
 * `out/main/extractSandbox.sha256`, one line per file, read by main, which refuses to run a
 * bundle that does not match (`extractSandbox.ts`).
 *
 * Run after `electron-vite build` (`pnpm build`): it writes beside `out/main`, never into it but
 * that one digest.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(APP, "out", "sandboxed", "extractWorker.mjs");

await build({
  entryPoints: [join(APP, "src", "main", "ocr", "extractSandboxEntry.ts")],
  outfile: OUT,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  minify: true,
  legalComments: "eof",
  // natives and WASM loaded by path, from the unpacked node_modules
  external: ["tesseract2.js", "tesseract.js-core", "onnxruntime-node", "@napi-rs/canvas", "canvas"],
  // a CommonJS dependency bundled into ESM still calls require(), __filename and __dirname
  banner: {
    js: [
      'import { createRequire as __omqCreateRequire } from "node:module";',
      'import { fileURLToPath as __omqFileURLToPath } from "node:url";',
      'import { dirname as __omqDirname } from "node:path";',
      "const require = __omqCreateRequire(import.meta.url);",
      "const __filename = __omqFileURLToPath(import.meta.url);",
      "const __dirname = __omqDirname(__filename);",
    ].join(" "),
  },
  logLevel: "warning",
});

const MANIFEST = join(dirname(OUT), "package.json");
writeFileSync(MANIFEST, `${JSON.stringify({ private: true, type: "module" })}\n`);
const lines = [OUT, MANIFEST].map((f) => `${createHash("sha256").update(readFileSync(f)).digest("hex")}  ${f.split(/[\\/]/).pop()}`);
writeFileSync(join(APP, "out", "main", "extractSandbox.sha256"), `${lines.join("\n")}\n`);
for (const l of lines) console.log(`[build:extract-sandbox] out/sandboxed/${l.split("  ")[1]} ${l.split("  ")[0]}`);
