import { MAX_COLS, MAX_ROWS, type Cell, type Sheet } from "./parse";

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

/**
 * The workbook's sheets, read by SheetJS. Runs in the sheet worker ONLY (`sheetWorker.ts`):
 * the page that holds the app's API never parses a workbook (`parseOffThread.ts`).
 */
export async function parseWorkbook(bytes: Uint8Array, csv: boolean): Promise<Sheet[]> {
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
