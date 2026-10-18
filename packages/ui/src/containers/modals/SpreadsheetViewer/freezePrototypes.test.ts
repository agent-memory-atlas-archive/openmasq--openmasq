import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * In a process of its own: the freeze is for the life of the realm and must not reach the test
 * runner. The child freezes the prototypes as the sheet worker does, then reads a CSV and a
 * workbook whose sheet is named `__proto__`, and tries the pollution a crafted file would.
 */
const here = (f: string) => JSON.stringify(fileURLToPath(new URL(f, import.meta.url)));
const PROBE = `
  const { freezePrototypes } = await import(${here("./freezePrototypes.ts")});
  const { parseWorkbook } = await import(${here("./workbook.ts")});
  const XLSX = await import("xlsx");
  freezePrototypes();
  const csv = await parseWorkbook(new TextEncoder().encode("a,b\\n1,2\\n"), true);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x", "y"], [1, 2]]), "__proto__");
  const xlsx = await parseWorkbook(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })), false);
  let polluted = false;
  try { ({}).__proto__.polluted = true; polluted = ({}).polluted === true; } catch { polluted = false; }
  console.log(JSON.stringify({ csv: csv[0].rows.length, xlsx: xlsx.length, sheet: xlsx[0]?.name, polluted }));
`;

describe("the sheet worker reads with every shared prototype frozen", () => {
  it("still reads a CSV and a workbook, and a write to a prototype goes nowhere", () => {
    const r = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", PROBE], { encoding: "utf8", timeout: 60_000, cwd: fileURLToPath(new URL("../../../../", import.meta.url)) });
    const out = JSON.parse(r.stdout.trim().split("\n").pop() || "{}");
    expect(out).toEqual({ csv: 2, xlsx: 1, sheet: "__proto__", polluted: false });
  });
});
