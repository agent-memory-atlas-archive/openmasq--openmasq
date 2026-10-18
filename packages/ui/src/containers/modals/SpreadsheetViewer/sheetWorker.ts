import { freezePrototypes } from "./freezePrototypes";
import { parseWorkbook } from "./workbook";

/**
 * The sheet worker: a workbook or a CSV a user previews is read by SheetJS HERE, in a Web
 * Worker, never in the page. The page holds the app's whole API (`window.openmasq`); a worker
 * has none of it, so a file crafted to take over the parser takes over a thread that can reach
 * nothing but this reply. One file per worker: the page terminates it after the answer.
 */
type Request = { bytes: Uint8Array; csv: boolean };

// before a byte of the file is read: a parser led by a crafted workbook to write a property named
// `__proto__` or `constructor` finds every shared prototype frozen
freezePrototypes();

const scope = self as unknown as { onmessage: ((e: MessageEvent<Request>) => void) | null; postMessage(m: unknown): void };

scope.onmessage = (e) => {
  parseWorkbook(e.data.bytes, e.data.csv).then(
    (sheets) => scope.postMessage({ ok: true, sheets }),
    () => scope.postMessage({ ok: false }),
  );
};
