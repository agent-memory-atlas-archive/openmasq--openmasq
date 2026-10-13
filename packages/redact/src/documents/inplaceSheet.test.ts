import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { deflateSync, strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { redactFileInPlace, type Scrub } from "./inplace";
import { DocumentError } from "./errors";
import { scrubFormula } from "./inplaceSheet";

/**
 * The in-place copy holds no real value SheetJS round-trips — formulas and hyperlinks
 * included — and it only ever parses bytes the bounded readers accept.
 */

const NAME = "Jean Dupont";
const scrub: Scrub = (t) =>
  t.includes(NAME) || t.includes("jean.dupont")
    ? {
        text: t.split(NAME).join("Paul Martin").split("jean.dupont").join("paul.martin"),
        pairs: [{ from: NAME, to: "Paul Martin" }],
      }
    : { text: t, pairs: [] };

/** Every XML part of the saved workbook, inflated — what Excel will read back. */
const allXml = (bytes: Uint8Array) =>
  Object.entries(unzipSync(bytes))
    .filter(([k]) => /\.(xml|rels)$/.test(k))
    .map(([, v]) => strFromU8(v))
    .join("\n");

describe("XLSX in place: formulas and hyperlinks are scrubbed with the same vault", () => {
  it("a string literal in a formula and a hyperlink target/tooltip leave no real value", () => {
    const ws = XLSX.utils.aoa_to_sheet([["contact", "lien"]]);
    ws.A2 = { t: "s", v: NAME, f: `CONCATENATE("${NAME}","")` };
    ws.B2 = { t: "s", v: "écrire", l: { Target: "mailto:jean.dupont@exemple.fr", Tooltip: `Écrire à ${NAME}` } };
    ws["!ref"] = "A1:B2";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    expect(allXml(bytes)).toContain(NAME); // the fixture really carries it

    const out = redactFileInPlace("c.xlsx", bytes, "", scrub);
    const xml = allXml(out.bytes);
    expect(xml).not.toContain(NAME);
    expect(xml).not.toContain("jean.dupont");
    const back = XLSX.read(out.bytes, { type: "array" }).Sheets.S;
    expect(back.A2.f).toBe('CONCATENATE("Paul Martin","")');
    expect(back.B2.l.Target).toBe("mailto:paul.martin@exemple.fr");
  });

  it("references, sheet names and untouched literals keep their exact text", () => {
    expect(scrubFormula(scrub, `IF('Feuille 1'!A1="Oui","x",B2)`)).toBe(`IF('Feuille 1'!A1="Oui","x",B2)`);
    expect(scrubFormula(scrub, `"dit ""${NAME}"""`)).toBe(`"dit ""Paul Martin"""`);
  });
});

describe("XLSX / DOCX in place: only bounded bytes reach the parser", () => {
  it("a whole-sheet <dimension> is written back in a moment, not walked cell by cell", () => {
    const ws = XLSX.utils.aoa_to_sheet([["nom"], [NAME]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const zip = unzipSync(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })));
    const part = "xl/worksheets/sheet1.xml";
    zip[part] = strToU8(strFromU8(zip[part]).replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:XFD1048576"/>'));
    const started = Date.now();
    const out = redactFileInPlace("c.xlsx", zipSync(zip), "", scrub);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(allXml(out.bytes)).toContain("Paul Martin");
  });

  it("a docx whose member inflates past its declared size is refused before re-zipping", () => {
    const real = deflateSync(new Uint8Array(8 * 1024 * 1024));
    // One member: a deflated 8 MB stream whose headers DECLARE 1 byte.
    const name = strToU8("word/document.xml");
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(18, real.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, real.length, true);
    cv.setUint32(24, 1, true);
    cv.setUint16(28, name.length, true);
    cen.set(name, 46);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, cen.length, true);
    ev.setUint32(16, local.length + real.length, true);
    const bomb = new Uint8Array([...local, ...real, ...cen, ...eocd]);
    expect(() => redactFileInPlace("c.docx", bomb, "", scrub)).toThrow(DocumentError);
  });
});
