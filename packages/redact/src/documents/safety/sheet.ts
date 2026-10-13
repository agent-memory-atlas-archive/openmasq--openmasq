// The ONE way our code opens a workbook with SheetJS — extraction, the in-place scrub and
// the renderer's preview alike.
//
// SheetJS sizes its work from what the file DECLARES, not from what it contains:
//   - `<hyperlink ref="A1:XFD1048576">` is expanded at READ time into one cell object per
//     address of the range (17 billion for a whole sheet) — before any caller sees a cell.
//     So the hyperlink ranges are measured in the XML, BEFORE `XLSX.read`, and a workbook
//     whose links cover more than `MAX_SHEET_LINK_CELLS` addresses is refused.
//   - `<dimension ref>` becomes `!ref` verbatim, and every consumer walks `!ref` row by
//     column (`sheet_to_json` with `defval`, `XLSX.write`, the preview grid). A declared
//     range wider than `MAX_SHEET_CELLS` is narrowed to the cells that EXIST; still wider ⇒
//     refused. Below the cap the declared range is kept untouched, so a real sheet reads
//     exactly as SheetJS has always read it (its formatted-but-empty columns included).
// The ZIP is opened through `unzip.ts` and SheetJS is handed the canonical, uncompressed
// copy: its own inflater never runs on the file's bytes.
import { DocumentError } from "../errors";
import { CHARS_PER_PAGE } from "./maskBudget";
import { sniff } from "./sniff";
import { safeUnzip, storedZip } from "./unzip";
import { strFromU8 } from "fflate";

/** Cells a sheet's range may span once narrowed to its real cells. Five times what the
 *  masking budget accepts in characters (`MAX_MASK_CHARS`): a sheet past it could never
 *  have been masked anyway, while its walk would cost minutes of CPU. */
export const MAX_SHEET_CELLS = 5_000_000;
/** Addresses all hyperlink ranges of a workbook may cover together. A real link sits on a
 *  cell or a short run of cells. */
const MAX_SHEET_LINK_CELLS = 1_000_000;

interface Range {
  s: { r: number; c: number };
  e: { r: number; c: number };
}
const area = (d: Range) => Math.max(0, d.e.r - d.s.r + 1) * Math.max(0, d.e.c - d.s.c + 1);

/** SheetJS's own `safe_decode_range` (letters then digits, `:`, letters then digits), so
 *  the range measured is the range it will expand. */
function decodeLikeSheetJs(ref: string): Range {
  let i = 0;
  const letters = () => {
    let v = 0;
    for (; i < ref.length; i++) {
      const cc = ref.charCodeAt(i) - 64;
      if (cc < 1 || cc > 26) break;
      v = 26 * v + cc;
    }
    return v - 1;
  };
  const digits = () => {
    let v = 0;
    for (; i < ref.length; i++) {
      const cc = ref.charCodeAt(i) - 48;
      if (cc < 0 || cc > 9) break;
      v = 10 * v + cc;
    }
    return v - 1;
  };
  const s = { c: letters(), r: digits() };
  if (i >= ref.length || ref[i] !== ":") return { s, e: { ...s } };
  i++;
  return { s, e: { c: letters(), r: digits() } };
}

const LINK_TAG = /<(?:\w+:)?hyperlink [^<>]*>/gm;
const REF_ATTR = /\bref\s*=\s*(["'])([^"']*)\1/;

/** Addresses covered by every `<hyperlink ref>` of every XML part. ALL parts, not only
 *  `xl/worksheets/`: SheetJS finds a sheet through the relationships, whatever its name. */
function linkCells(files: Record<string, Uint8Array>): number {
  let total = 0;
  for (const [name, data] of Object.entries(files)) {
    if (!/\.xml$/i.test(name)) continue;
    for (const tag of strFromU8(data).match(LINK_TAG) ?? []) {
      const ref = REF_ATTR.exec(tag)?.[2];
      if (ref) total += area(decodeLikeSheetJs(ref));
      if (total > MAX_SHEET_LINK_CELLS) return total;
    }
  }
  return total;
}

function tooBig(cells: number): DocumentError {
  const pages = Math.max(1, Math.round(cells / CHARS_PER_PAGE));
  return new DocumentError(
    "too_long_to_mask",
    `Document too long to be masked in full (≈ ${pages} pages). Split it into several parts.`,
    { pages },
  );
}

/** Narrow a sheet's `!ref` to its real cells when the declared range is past the cap. */
function boundSheet(XLSX: any, ws: Record<string, any> | undefined): void {
  const ref = ws?.["!ref"];
  if (!ws || typeof ref !== "string") return;
  const declared: Range = XLSX.utils.decode_range(ref);
  if (area(declared) <= MAX_SHEET_CELLS) return;
  const real: Range = { s: { r: Infinity, c: Infinity }, e: { r: -1, c: -1 } };
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const { r, c } = XLSX.utils.decode_cell(addr);
    real.s.r = Math.min(real.s.r, r);
    real.s.c = Math.min(real.s.c, c);
    real.e.r = Math.max(real.e.r, r);
    real.e.c = Math.max(real.e.c, c);
  }
  const bound: Range = {
    s: { r: Math.max(declared.s.r, real.s.r), c: Math.max(declared.s.c, real.s.c) },
    e: { r: Math.min(declared.e.r, real.e.r), c: Math.min(declared.e.c, real.e.c) },
  };
  if (bound.e.r < bound.s.r || bound.e.c < bound.s.c) {
    delete ws["!ref"];
    return;
  }
  if (area(bound) > MAX_SHEET_CELLS) throw tooBig(area(bound));
  ws["!ref"] = XLSX.utils.encode_range(bound);
}

/**
 * `XLSX.read` behind the checks above. `XLSX` is the caller's SheetJS module (each caller
 * imports it lazily); `opts` are passed through (`type` is set here). Throws
 * `DocumentError` on a refusal.
 */
export function readWorkbook(XLSX: any, bytes: Uint8Array, opts: Record<string, unknown> = {}): any {
  let input = bytes;
  if (sniff(bytes).family === "zip") {
    const files = safeUnzip(bytes);
    const links = linkCells(files);
    if (links > MAX_SHEET_LINK_CELLS) throw tooBig(links);
    input = storedZip(files);
  }
  const wb = XLSX.read(input, { ...opts, type: "array" });
  for (const name of wb.SheetNames ?? []) boundSheet(XLSX, wb.Sheets?.[name]);
  return wb;
}
