import SheetWorker from "./sheetWorker?worker";
import type { Sheet } from "./parse";

/** A preview that takes longer is abandoned: its worker is stopped, the viewer shows its error. */
const TIMEOUT_MS = 30_000;

/**
 * The sheets of a workbook (or a CSV), read in a worker of their own (`sheetWorker.ts`) and
 * handed back as plain data. The page never runs SheetJS: no worker, no preview (fail closed),
 * never a read on the page's own thread.
 */
export function parseOffThread(bytes: Uint8Array, csv: boolean): Promise<Sheet[]> {
  return new Promise((resolve, reject) => {
    const worker = new SheetWorker();
    const done = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error("sheet preview timed out"));
    }, TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; sheets?: Sheet[] }>) => {
      done();
      if (e.data.ok && e.data.sheets) resolve(e.data.sheets);
      else reject(new Error("sheet preview failed"));
    };
    worker.onerror = () => {
      done();
      reject(new Error("sheet preview failed"));
    };
    // a copy, handed over: the caller keeps its bytes for the next preview
    const copy = bytes.slice();
    worker.postMessage({ bytes: copy, csv }, [copy.buffer]);
  });
}
