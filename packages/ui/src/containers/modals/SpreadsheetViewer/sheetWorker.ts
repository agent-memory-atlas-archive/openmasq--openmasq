import { parseWorkbook } from "./workbook";

/**
 * The sheet worker: a workbook or a CSV a user previews is read by SheetJS HERE, in a Web
 * Worker, never in the page. The page holds the app's whole API (`window.openmasq`); a worker
 * has none of it, so a file crafted to take over the parser takes over a thread that can reach
 * nothing but this reply. One file per worker: the page terminates it after the answer.
 */
type Request = { bytes: Uint8Array; csv: boolean };

const scope = self as unknown as { onmessage: ((e: MessageEvent<Request>) => void) | null; postMessage(m: unknown): void };

scope.onmessage = (e) => {
  parseWorkbook(e.data.bytes, e.data.csv).then(
    (sheets) => scope.postMessage({ ok: true, sheets }),
    () => scope.postMessage({ ok: false }),
  );
};
