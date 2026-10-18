import { escapeRegExp } from "@openmasq/redact";
import type { PdfReplacement } from "../viewers/pdf/pdfReplacements";

// Preview caps: a spreadsheet preview is a SAMPLE, not the whole workbook — parse at
// most this many rows/cols so a multi-million-cell sheet can't blow up memory. The
// grid on top VIRTUALISES rows, so rendering stays cheap regardless of this cap.
export const MAX_ROWS = 2000;
export const MAX_COLS = 60;

export type Cell = { text: string; numeric: boolean; rowSpan?: number; colSpan?: number };
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
