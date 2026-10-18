// The entry of the extraction worker's self-contained bundle (`scripts/build-extract-sandbox.mjs`),
// the one the Node shipped beside the app runs inside a jail (`extractSandbox.ts`). The network
// and child processes are cut first (`OPENMASQ_OFFLINE=1`, which the jail always sets), then
// pdf.js gets its worker module from the bundle itself: pdf.js uses `globalThis.pdfjsWorker` when it is set,
// so no file of pdf.js is read from disk outside the bundle main has checked.
import "../security/offline";
// @ts-ignore — legacy build subpath ships no bundled types
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
void import("./extractWorker");
