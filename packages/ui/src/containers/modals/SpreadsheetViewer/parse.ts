import { escapeRegExp } from "@openmasq/redact";
import type { PdfReplacement } from "../viewers/pdf/pdfReplacements";

// Preview caps: a spreadsheet preview is a SAMPLE, not the whole workbook — parse at
// most this many rows/cols so a multi-million-cell sheet can't blow up memory. The
// grid on top VIRTUALISES rows, so rendering stays cheap regardless of this cap.
export const MAX_ROWS = 2000;
export const MAX_COLS = 60;

type Cell = { text: string; numeric: boolean; rowSpan?: number; colSpan?: number };
export type Sheet = {
  name: string;
  header: string[];
  rows: { num: number; cells: (Cell | null)[] }[];
  truncated: boolean;
  /** Merged cells (rowSpan/colSpan) break fixed-height row virtualisation → the
   *  grid renders such a sheet in full instead. Rare + usually small sheets. */
  hasMerges: boolean;
  /** Per-column widest content length (chars), so the grid can size columns once
   *  and use `table-layout: fixed` — the key to jitter-free row virtualisation. */
  colChars: number[];
};
export type Seg = { text: string; tone?: string; real?: string; fake?: string; kind?: string };

/** A matcher over both the real AND fake values (so it highlights whichever the
 *  shown bytes contain — original or redacted), mapping each to its colour tone, its
 *  REAL value (the reveal key) AND its FAKE (what a redacted preview displays). */
export function makeMatcher(replacements?: PdfReplacement[]) {
  const meta = new Map<string, { tone: string; real: string; fake: string; kind?: string }>();
  for (const r of replacements ?? [])
    for (const v of [r.real, r.fake])
      if (v && v.length >= 2) meta.set(v, { tone: r.tone, real: r.real, fake: r.fake, kind: r.kind });
  if (!meta.size) return null;
  const values = [...meta.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(values.map(escapeRegExp).join("|"), "g");
  return { re, metaOf: (v: string) => meta.get(v) };
}
export type Matcher = ReturnType<typeof makeMatcher>;

/** Split a cell's text into plain + highlighted segments. */
export function segmentsOf(text: string, matcher: Matcher): Seg[] {
  if (!matcher || !text) return [{ text }];
  const segs: Seg[] = [];
  let last = 0;
  matcher.re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = matcher.re.exec(text))) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) });
    const meta = matcher.metaOf(m[0]);
    segs.push({ text: m[0], tone: meta?.tone, real: meta?.real, fake: meta?.fake, kind: meta?.kind });
    last = m.index + m[0].length;
    if (m[0].length === 0) matcher.re.lastIndex++;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs.length ? segs : [{ text }];
}

type Merge = { s: { r: number; c: number }; e: { r: number; c: number } };

/**
 * Merged cells, CLIPPED to the rendered window (`lastRow`/`lastCol`): a merge declared over
 * a whole sheet (`A1:XFD1048576`) is 17 billion addresses, of which only the window is ever
 * drawn. Real merges never overlap, so the cells they cover add up to at most the window;
 * past that budget the remaining merges are drawn as plain cells.
 */
export function mergeLayout(merges: Merge[], lastRow: number, lastCol: number) {
  const covered = new Set<string>();
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  let budget = (lastRow + 1) * (lastCol + 1);
  for (const mg of merges) {
    const outside = mg.s.r > lastRow || mg.s.c > lastCol;
    const inverted = mg.e.r < mg.s.r || mg.e.c < mg.s.c;
    if (outside || inverted) continue;
    const er = Math.min(mg.e.r, lastRow);
    const ec = Math.min(mg.e.c, lastCol);
    budget -= (er - mg.s.r + 1) * (ec - mg.s.c + 1);
    if (budget < 0) break;
    spans.set(`${mg.s.r}:${mg.s.c}`, { rowSpan: er - mg.s.r + 1, colSpan: ec - mg.s.c + 1 });
    for (let r = mg.s.r; r <= er; r++)
      for (let c = mg.s.c; c <= ec; c++) if (r !== mg.s.r || c !== mg.s.c) covered.add(`${r}:${c}`);
  }
  return { covered, spans };
}

export async function parse(bytes: Uint8Array, csv: boolean): Promise<Sheet[]> {
  const XLSX = await import("xlsx");
  // A workbook is opened through the bounded reader extraction uses (zip caps, hyperlink
  // ranges, `!ref`); its refusal is the preview's error.
  const { readWorkbook } = await import("@openmasq/redact/documents.browser");
  const wb: import("xlsx").WorkBook = csv
    ? XLSX.read(new TextDecoder().decode(bytes), { type: "string" })
    : readWorkbook(XLSX, bytes);

  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const ref = ws?.["!ref"];
    if (!ref)
      return { name, header: [], rows: [], truncated: false, hasMerges: false, colChars: [] };
    const range = XLSX.utils.decode_range(ref);
    const lastCol = Math.min(range.e.c, range.s.c + MAX_COLS - 1);
    const lastRow = Math.min(range.e.r, range.s.r + MAX_ROWS - 1);

    const merges = ws["!merges"] ?? [];
    const { covered, spans } = mergeLayout(merges, lastRow, lastCol);

    const header: string[] = [];
    const colChars: number[] = [];
    for (let c = range.s.c; c <= lastCol; c++) {
      header.push(XLSX.utils.encode_col(c));
      colChars.push(1);
    }

    const rows: Sheet["rows"] = [];
    for (let r = range.s.r; r <= lastRow; r++) {
      const cells: (Cell | null)[] = [];
      for (let c = range.s.c; c <= lastCol; c++) {
        if (covered.has(`${r}:${c}`)) {
          cells.push(null);
          continue;
        }
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        const span = spans.get(`${r}:${c}`);
        const text = cell ? String(cell.w ?? cell.v ?? "") : "";
        const ci = c - range.s.c;
        if (text.length > colChars[ci]!) colChars[ci] = Math.min(text.length, 64);
        cells.push({ text, numeric: cell?.t === "n", rowSpan: span?.rowSpan, colSpan: span?.colSpan });
      }
      rows.push({ num: r + 1, cells });
    }
    return {
      name,
      header,
      rows,
      truncated: range.e.c > lastCol || range.e.r > lastRow,
      hasMerges: merges.length > 0,
      colChars,
    };
  });
}
