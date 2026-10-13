// The in-place scrub of a WORKBOOK (`inplace.ts` dispatches here). Every place SheetJS
// round-trips text into the saved bytes is scrubbed with the SAME vault-bound `scrub`:
// cell values, the number/date display a model reads, comments + their authors, document
// Props, defined-name comments, string literals inside FORMULAS (Excel recomputes a cell
// from its formula on open: a scrubbed value beside `="Jean Dupont"` shows the real name
// again) and HYPERLINK target/tooltip/display (a `mailto:` or a URL carrying a name).
import * as XLSX from "xlsx";
import { readWorkbook } from "./safety/sheet";
import type { RedactedFile, Scrub } from "./inplace";

/** Scrub a free-text string field, passing anything else through untouched. */
function scrubStr(scrub: Scrub, v: unknown): unknown {
  return typeof v === "string" && v ? scrub(v).text : v;
}

/** The string LITERALS of a formula (`"…"`, `""` = an escaped quote) scrubbed one by one;
 *  references, sheet names ('…') and functions are left as they are. */
export function scrubFormula(scrub: Scrub, f: string): string {
  return f.replace(/"((?:[^"]|"")*)"/g, (whole, inner: string) => {
    const real = inner.replace(/""/g, '"');
    const out = scrub(real).text;
    return out === real ? whole : `"${out.replace(/"/g, '""')}"`;
  });
}

/** A hyperlink object is SHARED by every cell of its range: scrubbed once (a second pass
 *  would re-mask the fake it already holds). */
function scrubLink(scrub: Scrub, l: Record<string, unknown>, done: Set<object>): void {
  if (done.has(l)) return;
  done.add(l);
  for (const k of ["Target", "Tooltip", "display"]) l[k] = scrubStr(scrub, l[k]);
  const rel = l.Rel as Record<string, unknown> | undefined;
  if (rel && typeof rel === "object") rel.Target = scrubStr(scrub, rel.Target);
}

function scrubCell(scrub: Scrub, cell: any, links: Set<object>): void {
  // Cell COMMENTS (threaded/legacy) carry free text + an author name — on empty cells too.
  if (Array.isArray(cell.c)) {
    for (const cm of cell.c) {
      if (typeof cm.t === "string") cm.t = scrub(cm.t).text;
      if (typeof cm.a === "string") cm.a = scrub(cm.a).text;
    }
  }
  if (cell.l && typeof cell.l === "object") scrubLink(scrub, cell.l, links);
  if (typeof cell.f === "string" && cell.f) cell.f = scrubFormula(scrub, cell.f);
  if (cell.v == null) return;
  if (typeof cell.v === "string" && cell.v) {
    cell.v = scrub(cell.v).text;
    if (typeof cell.w === "string") delete cell.w; // drop cached display text
  } else if (cell.t === "n" || cell.t === "d") {
    // The model reads the FORMATTED string (`cell.w`), so a phone/ID stored as a number or a
    // date is masked on the wire: its display is scrubbed here too, and a masked one becomes
    // a text cell so the underlying number/date is not kept.
    const disp = typeof cell.w === "string" ? cell.w : String(cell.v);
    const scrubbed = scrub(disp).text;
    if (scrubbed !== disp) {
      cell.t = "s";
      cell.v = scrubbed;
      delete cell.w;
      delete cell.z;
    }
  }
}

export function redactSheet(name: string, bytes: Uint8Array, type: string, scrub: Scrub): RedactedFile {
  // `readWorkbook` bounds every `!ref` the write below walks, and refuses what it cannot.
  const wb = readWorkbook(XLSX, bytes);
  // Metadata OUTSIDE the cells: document Props (Author / LastAuthor / Company / Manager…)
  // and defined-name comments. A defined name's NAME is left as is (renaming breaks every
  // formula referencing it) — an accepted, documented residual.
  if (wb.Props) {
    const props = wb.Props as Record<string, unknown>;
    for (const k of Object.keys(props)) props[k] = scrubStr(scrub, props[k]);
  }
  for (const n of wb.Workbook?.Names ?? []) {
    if (typeof n.Comment === "string") n.Comment = scrub(n.Comment).text;
  }
  const links = new Set<object>();
  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet];
    for (const addr of Object.keys(ws)) {
      if (addr[0] === "!") continue; // !ref / !merges metadata
      const cell = ws[addr];
      if (cell) scrubCell(scrub, cell, links);
    }
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return {
    name,
    type: type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes: out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer),
  };
}
