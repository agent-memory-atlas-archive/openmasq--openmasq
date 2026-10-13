import { redactFileInPlace } from "@openmasq/redact/inplace";
import { makeDocumentScrub } from "../ipc/documentScrub";

/**
 * The format-preserving scrub of `files:redact-and-save`, as ONE function of plain data so it
 * runs in the extraction WORKER (`extractWorker.ts`): it hands the file's bytes to SheetJS,
 * fflate and the XML rewriting, and whatever a hostile file makes them cost is spent out of
 * main. Main runs it in process only when that worker cannot be born (`extractClient.ts`).
 *
 * Fail closed: any throw (a blocked format, a refusal of the bounded readers, a parser
 * error) yields `scrubbed: null` — the original alone is stored, never a half-scrubbed copy.
 */
export interface InplaceRequest {
  name: string;
  bytes: Uint8Array;
  mime: string;
  vault: Record<string, string>;
  disabledKinds?: string[];
  /** Real value → category, untrusted and display-only (`documentScrub.ts`). */
  kinds: Record<string, string>;
}

export interface InplaceResult {
  scrubbed: Uint8Array | null;
  /** The vault AFTER the scrub: it mints a fake for each new value it masks. */
  vault: Record<string, string>;
  kinds: Record<string, string>;
  spans: { value: string; kind: string }[];
}

export function scrubInPlace(req: InplaceRequest): InplaceResult {
  const vault = { ...req.vault };
  const { scrub, kinds, spans } = makeDocumentScrub(vault, req.disabledKinds, req.kinds);
  let scrubbed: Uint8Array | null = null;
  try {
    scrubbed = redactFileInPlace(req.name, req.bytes, req.mime, scrub).bytes;
  } catch {
    scrubbed = null;
  }
  return { scrubbed, vault, kinds, spans };
}
