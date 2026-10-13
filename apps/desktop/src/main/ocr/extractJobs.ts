import {
  extractText as extractTextInProcess,
  extractBytes as extractBytesInProcess,
  type ExtractedFile,
  type ExtractStreamEvent,
} from "@openmasq/redact/documents";
import { mainLocale, mainMessages } from "../i18n";
import { runInWorker, runJob, workerOrInProcess } from "./extractClient";
import { scrubInPlace, type InplaceRequest, type InplaceResult } from "./inplaceScrub";
import { createExtractQueue } from "./extractQueue";
import { localizeExtracted } from "./localizeExtracted";

/**
 * The extraction ENTRY POINTS: one queue (`extractQueue.ts`) in front of the worker client
 * (`extractClient.ts`) and its in-process fallback. Both paths come back with their failure
 * worded in the user's language (`localizeExtracted.ts`).
 *
 * `signal` = the user removed the file (`extractCancel.ts`): a waiting job leaves the line, a
 * running worker job is killed. The in-process fallback cannot be interrupted — its caller is
 * answered at once and the result is dropped, the queue slot frees when it really ends.
 */

/** Optional per-call hooks, the same for both routes. */
export interface ExtractCallbacks {
  onOcrProgress?: (done: number, pages: number) => void;
  /** While queued: how many files are ahead (re-told as the line moves). */
  onWaiting?: (ahead: number) => void;
  /** The preview stream (pages, thumbnails) — worker path only: the in-process fallback
   *  streams nothing, and the preview then keeps its plain loader. */
  onStream?: (ev: ExtractStreamEvent) => void;
  signal?: AbortSignal;
}

/** ONE document at a time, worker and in-process fallback alike (why: `extractQueue.ts`).
 *  The worker timeout is armed inside `runInWorker`, so it counts from the job's START. */
const queue = createExtractQueue(1);

async function withFallback(
  viaWorker: () => Promise<ExtractedFile>,
  inProcess: () => Promise<ExtractedFile>,
  signal?: AbortSignal,
): Promise<ExtractedFile> {
  const file = await workerOrInProcess(viaWorker, inProcess, signal);
  return localizeExtracted(file, mainMessages().documents);
}

/** Extraction of a file on disk — worker first, in-process as session fallback. */
export function extractTextInWorker(filePath: string, cb: ExtractCallbacks = {}): Promise<ExtractedFile> {
  // The markers OCR writes into the text speak the user's language: the worker gets the
  // locale (it rebuilds them from the catalogue), the in-process path the markers.
  const locale = mainLocale();
  const markers = mainMessages().documents.markers;
  return queue.run(
    (signal) =>
      withFallback(
        () => runInWorker({ kind: "path", path: filePath, locale }, cb.onOcrProgress, cb.onStream, signal),
        () => extractTextInProcess(filePath, cb.onOcrProgress, markers),
        signal,
      ),
    cb.onWaiting,
    cb.signal,
  );
}

/** Extraction of in-memory bytes (base64 on the IPC caller side) — same contract. */
export function extractBytesInWorker(
  bytes: Uint8Array,
  name: string,
  mime: string | undefined,
  cb: ExtractCallbacks = {},
): Promise<ExtractedFile> {
  const locale = mainLocale();
  const markers = mainMessages().documents.markers;
  return queue.run(
    (signal) => {
      const data = Buffer.from(bytes).toString("base64");
      return withFallback(
        () => runInWorker({ kind: "bytes", data, name, mime, locale }, cb.onOcrProgress, cb.onStream, signal),
        () => extractBytesInProcess(bytes, name, mime, cb.onOcrProgress, markers),
        signal,
      );
    },
    cb.onWaiting,
    cb.signal,
  );
}

/**
 * The format-preserving scrub of `files:redact-and-save` (`inplaceScrub.ts`) — on the worker,
 * NOT in the queue: it is a parse and a rewrite, never minutes of OCR, and a saved copy must
 * not wait behind the files still being read. In main only when the worker cannot be born.
 * A failed job (timeout, crash) stores the original alone: `scrubbed: null`, fail closed.
 */
export async function scrubInPlaceInWorker(req: InplaceRequest): Promise<InplaceResult> {
  const viaWorker = async (): Promise<InplaceResult> => {
    const { bytes, ...rest } = req;
    const r = await runJob<Omit<InplaceResult, "scrubbed"> & { scrubbed: string | null }>({
      kind: "inplace",
      ...rest,
      data: Buffer.from(bytes).toString("base64"),
    });
    return { ...r, scrubbed: r.scrubbed == null ? null : new Uint8Array(Buffer.from(r.scrubbed, "base64")) };
  };
  try {
    return await workerOrInProcess(viaWorker, async () => scrubInPlace(req));
  } catch {
    return { scrubbed: null, vault: { ...req.vault }, kinds: {}, spans: [] };
  }
}
