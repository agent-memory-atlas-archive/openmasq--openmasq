import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { deflateSync, strToU8, strFromU8, unzipSync, zipSync } from "fflate";
import { guardUpload, MAX_ZIP_ENTRIES } from "./guard";
import { readZipDirectory } from "./zipDir";
import { canonicalZip, safeUnzip } from "./unzip";

/**
 * The bomb verdict and the decompression read ONE directory (`zipDir.ts`), the one fflate
 * reads, and a member never inflates past its declared size (`unzip.ts`). Every hostile
 * archive here is a few hundred bytes built in the test.
 */

const fx = (name: string) =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`../../__fixtures__/${name}`, import.meta.url))));

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const eocdOf = (b: Uint8Array) => {
  for (let i = b.length - 22; i >= 0; i--) if (dv(b).getUint32(i, true) === 0x06054b50) return i;
  throw new Error("no eocd");
};

/** One deflated member whose local + central headers DECLARE `declared` bytes. */
function lyingMember(real: Uint8Array, declared: number): Uint8Array {
  const name = strToU8("word/document.xml");
  const data = deflateSync(real);
  const local = new Uint8Array(30 + name.length);
  const lv = dv(local);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, declared, true);
  lv.setUint16(26, name.length, true);
  local.set(name, 30);
  const cen = new Uint8Array(46 + name.length);
  const cv = dv(cen);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, declared, true);
  cv.setUint16(28, name.length, true);
  cv.setUint32(42, 0, true);
  cen.set(name, 46);
  const eocd = new Uint8Array(22);
  const ev = dv(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, cen.length, true);
  ev.setUint32(16, local.length + data.length, true);
  const out = new Uint8Array(local.length + data.length + cen.length + eocd.length);
  out.set(local, 0);
  out.set(data, local.length);
  out.set(cen, local.length + data.length);
  out.set(eocd, local.length + data.length + cen.length);
  return out;
}

describe("real Office archives pass, read exactly as fflate reads them", () => {
  it("a docx fixture, a SheetJS xlsx, a deflated fflate zip", () => {
    const ws = XLSX.utils.aoa_to_sheet([["nom", "email"], ["Amélie", "a@b.fr"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feuille");
    const xlsx = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }));
    const plain = zipSync({ "a.xml": strToU8("<a>" + "é".repeat(5000) + "</a>"), "b/c.bin": new Uint8Array([1, 2, 3]) });
    for (const [bytes, ext] of [[fx("sample.docx"), ".docx"], [xlsx, ".xlsx"], [plain, ".docx"]] as const) {
      expect(guardUpload(bytes, ext)).toBeNull();
      const ours = safeUnzip(bytes);
      const theirs = unzipSync(bytes);
      expect(Object.keys(ours).sort()).toEqual(Object.keys(theirs).sort());
      for (const k of Object.keys(theirs)) expect(ours[k]).toEqual(theirs[k]);
      // The canonical copy holds the same members, stored.
      expect(unzipSync(canonicalZip(bytes))).toEqual(theirs);
    }
  });
});

describe("a directory the two readings could disagree on is refused", () => {
  const legit = () => zipSync({ "a.xml": strToU8("<a/>"), "b.xml": strToU8("<b/>") });

  it("entry count at EOCD+8 differs from EOCD+10 (fflate reads +8)", () => {
    const b = legit();
    dv(b).setUint16(eocdOf(b) + 8, 60_000, true);
    expect(guardUpload(b, ".docx")).toMatch(/zip-bomb/i);
    expect(() => safeUnzip(b)).toThrow(/zip-bomb/i);
  });

  it("a central record with a wrong signature is a refusal, not a silent stop", () => {
    const b = legit();
    const cd = dv(b).getUint32(eocdOf(b) + 16, true);
    dv(b).setUint32(cd, 0xdeadbeef, true);
    expect(guardUpload(b, ".docx")).toMatch(/zip-bomb/i);
  });

  it("a ZIP64 record is honoured: its entry count is the one checked", () => {
    const b = legit();
    const e = eocdOf(b);
    // Insert a ZIP64 EOCD record + locator before the classic EOCD, declaring 60 000 entries.
    const z64 = new Uint8Array(56 + 20);
    const zv = dv(z64);
    const recordAt = e;
    zv.setUint32(0, 0x06064b50, true);
    zv.setUint32(24, MAX_ZIP_ENTRIES + 50_000, true);
    zv.setUint32(32, MAX_ZIP_ENTRIES + 50_000, true);
    zv.setUint32(48, dv(b).getUint32(e + 16, true), true);
    zv.setUint32(56, 0x07064b50, true);
    zv.setUint32(56 + 8, recordAt, true);
    const out = new Uint8Array(b.length + z64.length);
    out.set(b.subarray(0, e), 0);
    out.set(z64, e);
    out.set(b.subarray(e), e + z64.length);
    const ne = e + z64.length;
    dv(out).setUint16(ne + 8, 0xffff, true);
    dv(out).setUint16(ne + 10, 0xffff, true);
    expect(readZipDirectory(out).failure?.code).toBe("zip_entries");
    expect(guardUpload(out, ".docx")).toMatch(/entries/i);
  });

  it("a member whose data runs past the end of the file", () => {
    const b = legit();
    const cd = dv(b).getUint32(eocdOf(b) + 16, true);
    dv(b).setUint32(cd + 20, b.length * 4, true);
    expect(guardUpload(b, ".docx")).toMatch(/zip-bomb/i);
  });
});

describe("a member never inflates past its declared size", () => {
  it("10 MB of zeros declared as 1 KB: refused after one slice, nothing allocated", () => {
    const bomb = lyingMember(new Uint8Array(10 * 1024 * 1024), 1024);
    expect(guardUpload(bomb, ".docx")).toBeNull(); // the declared sizes are innocent…
    expect(() => safeUnzip(bomb)).toThrow(/larger than declared/i); // …the real stream is not
    expect(() => canonicalZip(bomb)).toThrow(/larger than declared/i);
  });

  it("an honest member inflates whole", () => {
    const body = strToU8("<w:document>" + "ab".repeat(40_000) + "</w:document>");
    const ok = lyingMember(body, body.length);
    expect(strFromU8(safeUnzip(ok)["word/document.xml"])).toBe(strFromU8(body));
  });

  it("`keep` inflates only the members asked for", () => {
    const b = zipSync({ "keep.xml": strToU8("<k/>"), "skip.xml": strToU8("<s/>") });
    expect(Object.keys(safeUnzip(b, (m) => m.name === "keep.xml"))).toEqual(["keep.xml"]);
  });
});
