// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The page holds the app's whole API: a workbook is never parsed there. The viewer reaches
 * SheetJS only through a worker of its own, stopped after each answer, and a preview the worker
 * cannot give is an error, never a read on the page's thread.
 */

type Reply = { ok: boolean; sheets?: unknown[] };
const workers: FakeWorker[] = [];
let reply: (w: FakeWorker, msg: { bytes: Uint8Array; csv: boolean }) => void = () => {};

class FakeWorker {
  onmessage: ((e: { data: Reply }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminated = false;
  posted: { bytes: Uint8Array; csv: boolean }[] = [];
  constructor() {
    workers.push(this);
  }
  postMessage(msg: { bytes: Uint8Array; csv: boolean }) {
    this.posted.push(msg);
    queueMicrotask(() => reply(this, msg));
  }
  terminate() {
    this.terminated = true;
  }
}

vi.mock("./sheetWorker?worker", () => ({ default: FakeWorker }));

afterEach(() => {
  workers.length = 0;
  vi.useRealTimers();
});

describe("a spreadsheet preview is parsed off the page", () => {
  it("hands a copy of the bytes to a worker, takes its sheets, and stops it", async () => {
    const { parseOffThread } = await import("./parseOffThread");
    reply = (w) => w.onmessage?.({ data: { ok: true, sheets: [{ name: "A" }] } });
    const bytes = new TextEncoder().encode("a,b\n1,2\n");
    await expect(parseOffThread(bytes, true)).resolves.toEqual([{ name: "A" }]);
    expect(workers).toHaveLength(1);
    expect(workers[0]!.terminated).toBe(true);
    expect(workers[0]!.posted[0]!.csv).toBe(true);
    // the caller's bytes stay usable: the worker got a copy
    expect(bytes.byteLength).toBe(8);
  });

  it("a worker that fails or dies is the preview's error, and is stopped", async () => {
    const { parseOffThread } = await import("./parseOffThread");
    reply = (w) => w.onmessage?.({ data: { ok: false } });
    await expect(parseOffThread(new Uint8Array([1]), false)).rejects.toThrow();
    reply = (w) => w.onerror?.(new Error("crashed"));
    await expect(parseOffThread(new Uint8Array([1]), false)).rejects.toThrow();
    expect(workers.every((w) => w.terminated)).toBe(true);
  });

  it("a worker that never answers is stopped at the deadline", async () => {
    vi.useFakeTimers();
    const { parseOffThread } = await import("./parseOffThread");
    reply = () => {};
    const pending = parseOffThread(new Uint8Array([1]), false);
    const settled = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(60_000);
    await settled;
    expect(workers[0]!.terminated).toBe(true);
  });

  it("the page side never imports the workbook reader nor SheetJS", () => {
    for (const file of ["./SpreadsheetViewer.tsx", "./parseOffThread.ts", "./parse.ts"]) {
      const src = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(src, file).not.toMatch(/from\s+["']\.\/workbook["']|import\(\s*["']\.\/workbook["']\s*\)/);
      expect(src, file).not.toMatch(/["']xlsx["']/);
    }
  });
});
