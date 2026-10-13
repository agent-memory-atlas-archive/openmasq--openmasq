import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { readWorkbook, MAX_SHEET_CELLS } from "./sheet";
import { DocumentError } from "../errors";
import { sheetText } from "../formats";
import { extractFromBytes } from "../core";

/**
 * SheetJS sizes its work from what the file DECLARES. `readWorkbook` bounds the two
 * declarations that cost the most: `<dimension>` (walked by every consumer) and
 * `<hyperlink ref>` (expanded at read time into one object per address). Fixtures are a
 * real SheetJS workbook whose sheet XML is patched in the test.
 */

function workbook(rows: unknown[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Feuille");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

function patchSheet(bytes: Uint8Array, edit: (xml: string) => string): Uint8Array {
  const zip = unzipSync(bytes);
  const part = Object.keys(zip).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))!;
  zip[part] = strToU8(edit(strFromU8(zip[part])));
  return zipSync(zip);
}

const WHOLE_SHEET = "A1:XFD1048576"; // 16 384 × 1 048 576 = 1.7e10 addresses

describe("a declared dimension past the cap is narrowed to the real cells", () => {
  it("whole-sheet <dimension> with two cells: read, serialised and bounded at once", async () => {
    const bomb = patchSheet(workbook([["nom", "email"], ["Jean", "j@x.fr"]]), (x) =>
      x.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${WHOLE_SHEET}"/>`),
    );
    const wb = readWorkbook(XLSX, bomb);
    expect(wb.Sheets.Feuille["!ref"]).toBe("A1:B2");
    const started = Date.now();
    expect(await sheetText(bomb)).toContain("j@x.fr");
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("two cells at opposite corners are refused (the real span is the whole sheet)", () => {
    const corner = patchSheet(workbook([["a"]]), (x) =>
      x
        .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${WHOLE_SHEET}"/>`)
        .replace("</sheetData>", '<row r="1048576"><c r="XFD1048576" t="str"><v>z</v></c></row></sheetData>'),
    );
    expect(() => readWorkbook(XLSX, corner)).toThrow(DocumentError);
  });

  it("a real sheet keeps its declared range untouched (formatted-empty span included)", () => {
    const real = patchSheet(workbook([["h1", "h2"], ["v1", "v2"]]), (x) =>
      x.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:H40"/>'),
    );
    expect(readWorkbook(XLSX, real).Sheets.Feuille["!ref"]).toBe("A1:H40");
    expect(XLSX.read(real, { type: "array" }).Sheets.Feuille["!ref"]).toBe("A1:H40");
    expect(MAX_SHEET_CELLS).toBeGreaterThan(1_000_000);
  });
});

describe("a hyperlink range is measured BEFORE SheetJS expands it", () => {
  const linked = (ref: string) =>
    patchSheet(workbook([["site"]]), (x) =>
      x.replace("</sheetData>", `</sheetData><hyperlinks><hyperlink ref="${ref}" location="Feuille!A1"/></hyperlinks>`),
    );

  it("a whole-sheet link range is refused, and extraction reports a blocked refusal", async () => {
    const bomb = linked(WHOLE_SHEET);
    expect(() => readWorkbook(XLSX, bomb)).toThrow(/too long/i);
    const out = await extractFromBytes(bomb, { name: "liens.xlsx" }, {} as never);
    expect(out.blocked).toBe(true);
    expect(out.errorCode).toBe("too_long_to_mask");
  });

  it("an ordinary single-cell link still reads", () => {
    const wb = readWorkbook(XLSX, linked("A1"));
    expect(wb.Sheets.Feuille.A1.l?.Target).toBe("#Feuille!A1");
  });
});
