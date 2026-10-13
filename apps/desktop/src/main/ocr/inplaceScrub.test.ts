import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { scrubInPlace } from "./inplaceScrub";

/**
 * `files:redact-and-save` parses the attachment (SheetJS, fflate) — in the extraction
 * WORKER through `scrubInPlace`, never in main. A file the bounded readers refuse is stored
 * as its original alone (`scrubbed: null`), never as a half-scrubbed copy.
 */

const EMAIL = "jean.dupont@exemple.fr";

function sheet(dimension?: string): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet([["email"], [EMAIL]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "S");
  const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
  if (!dimension) return bytes;
  const zip = unzipSync(bytes);
  const part = "xl/worksheets/sheet1.xml";
  zip[part] = strToU8(strFromU8(zip[part]).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${dimension}"/>`));
  return zipSync(zip);
}

describe("scrubInPlace — the worker's half of files:redact-and-save", () => {
  it("scrubs a workbook and hands back the vault it extended", () => {
    const r = scrubInPlace({ name: "a.xlsx", bytes: sheet(), mime: "", vault: {}, kinds: {} });
    expect(r.scrubbed).not.toBeNull();
    const xml = Object.values(unzipSync(r.scrubbed!)).map((v) => strFromU8(v)).join("");
    expect(xml).not.toContain(EMAIL);
    expect(Object.values(r.vault)).toContain(EMAIL);
  });

  it("a whole-sheet <dimension> is scrubbed in a moment", () => {
    const started = Date.now();
    const r = scrubInPlace({ name: "a.xlsx", bytes: sheet("A1:XFD1048576"), mime: "", vault: {}, kinds: {} });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(r.scrubbed).not.toBeNull();
  });

  it("a refused archive stores the original alone", () => {
    const bytes = sheet();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let e = bytes.length - 22;
    while (view.getUint32(e, true) !== 0x06054b50) e--;
    view.setUint16(e + 8, 9_999, true); // entry count the inflater and the guard would read differently
    const r = scrubInPlace({ name: "a.xlsx", bytes, mime: "", vault: {}, kinds: {} });
    expect(r.scrubbed).toBeNull();
  });

  it("main no longer parses the attachment itself", () => {
    const ipc = readFileSync(new URL("../ipc/registerFilesIpc.ts", import.meta.url), "utf8");
    expect(ipc).not.toMatch(/redactFileInPlace|@openmasq\/redact\/inplace/);
    expect(ipc).toContain("scrubInPlaceInWorker");
  });
});
