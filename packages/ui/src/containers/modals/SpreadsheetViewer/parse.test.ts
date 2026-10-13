import { describe, it, expect } from "vitest";
import { makeMatcher, mergeLayout, parse, segmentsOf } from "./parse";

const reps = [{ real: "Julien Sabourdin", fake: "Jade Savel", tone: "coral" }];

describe("SpreadsheetViewer segmentsOf — carries the FAKE for the redacted grid", () => {
  it("splits a cell and attaches tone + real + fake to the matched span", () => {
    const m = makeMatcher(reps);
    const segs = segmentsOf("Client: Julien Sabourdin (VIP)", m);
    const hit = segs.find((s) => s.real);
    expect(hit).toMatchObject({
      text: "Julien Sabourdin",
      real: "Julien Sabourdin",
      fake: "Jade Savel", // ← what the redacted cell DISPLAYS (was missing → showed the real)
      tone: "coral",
    });
    // the surrounding text stays plain (no real/fake)
    expect(segs.filter((s) => !s.real).map((s) => s.text).join("")).toBe("Client:  (VIP)");
  });

  it("also matches the FAKE (post-send scrubbed bytes) → same real/fake meta", () => {
    const m = makeMatcher(reps);
    const hit = segmentsOf("cc Jade Savel", m).find((s) => s.real);
    expect(hit).toMatchObject({ text: "Jade Savel", real: "Julien Sabourdin", fake: "Jade Savel" });
  });

  it("no replacements → a single plain segment (no matcher)", () => {
    expect(segmentsOf("nothing here", makeMatcher([]))).toEqual([{ text: "nothing here" }]);
  });
});

describe("SpreadsheetViewer parse — a declared merge or range costs only the drawn window", () => {
  it("a whole-sheet merge is clipped to the window, in a moment", async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([["titre", ""], ["a", "b"]]);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1_048_575, c: 16_383 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const started = Date.now();
    const [sheet] = await parse(bytes, false);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(sheet!.rows[0]!.cells[0]).toMatchObject({ rowSpan: 2, colSpan: 2 });
  });

  it("an ordinary merge keeps its exact span", () => {
    const { spans, covered } = mergeLayout([{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }], 10, 10);
    expect(spans.get("0:0")).toEqual({ rowSpan: 1, colSpan: 3 });
    expect([...covered]).toEqual(["0:1", "0:2"]);
  });

  it("overlapping merges stop once they cover more than the window", () => {
    const whole = { s: { r: 0, c: 0 }, e: { r: 99, c: 9 } };
    const { covered } = mergeLayout(Array.from({ length: 10_000 }, () => whole), 99, 9);
    expect(covered.size).toBeLessThanOrEqual(1_000);
  });
});
