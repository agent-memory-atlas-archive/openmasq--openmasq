// The ONE door our parsers take into a ZIP (docx, pptx, xlsx, ods).
//
// Two properties, both checked on the bytes the inflater actually produces:
//   1. The directory is the one `zipDir.ts` validated — same entries, same sizes — so the
//      bomb verdict and the decompression can never be about two different archives.
//   2. A member inflates to AT MOST its declared size: the stream is fed in small slices
//      and stopped the moment it outgrows that size, so a member that lies about its
//      size costs one slice of work, never the gigabytes it really expands to. The
//      declared sizes are capped as a whole (`MAX_ZIP_TOTAL_BYTES`), hence so is the output.
//
// Parsers with their OWN inflater (SheetJS's, JSZip under mammoth) do not honour a declared
// size: they grow their buffer as long as the stream runs. They are handed
// `canonicalZip(bytes)` instead — the same members, already inflated by this module and
// re-stored uncompressed — so the only decompression they ever perform is ours.
import { Inflate, zipSync, type Zippable } from "fflate";
import { DocumentError } from "../errors";
import { readZipDirectory, type ZipEntry } from "./zipDir";

/** Input slice fed to the inflater between two size checks. DEFLATE expands at most
 *  ~1032:1, so one slice can overshoot the cap by ~16 MiB before the check stops it. */
const SLICE = 16 * 1024;

/** What a `keep` filter is told about a member, before anything is inflated. */
export interface ZipMemberInfo {
  name: string;
  /** The declared uncompressed size — also the most it will be allowed to inflate to. */
  originalSize: number;
}

function refused(message: string): DocumentError {
  return new DocumentError("zip_too_large", message);
}

function inflateCapped(data: Uint8Array, cap: number): Uint8Array {
  const out = new Uint8Array(cap);
  let n = 0;
  const inflater = new Inflate((chunk) => {
    if (n + chunk.length > cap) {
      throw refused("Compressed member larger than declared — refused (zip-bomb protection).");
    }
    out.set(chunk, n);
    n += chunk.length;
  });
  if (data.length === 0) inflater.push(new Uint8Array(0), true);
  for (let i = 0; i < data.length; i += SLICE) {
    inflater.push(data.subarray(i, i + SLICE), i + SLICE >= data.length);
  }
  return n === cap ? out : out.slice(0, n);
}

function member(bytes: Uint8Array, e: ZipEntry): Uint8Array {
  const raw = bytes.subarray(e.dataStart, e.dataStart + e.compressedSize);
  if (e.method === 0) {
    if (raw.length > e.originalSize) throw refused("Stored member larger than declared — refused (zip-bomb protection).");
    return raw.slice();
  }
  return inflateCapped(raw, e.originalSize);
}

/**
 * The members of a ZIP, by name (a later duplicate wins, as with fflate's `unzipSync`).
 * `keep` selects which to inflate (default: all); it may THROW to refuse the archive on a
 * member's declared size. Throws `DocumentError` (`zip_too_large` / `zip_entries` /
 * `zip_ratio`) on a bomb or an inconsistent directory, and a plain error on bytes with no
 * end-of-central-directory.
 */
export function safeUnzip(
  bytes: Uint8Array,
  keep?: (info: ZipMemberInfo) => boolean,
): Record<string, Uint8Array> {
  const { entries, failure } = readZipDirectory(bytes);
  if (failure) throw new DocumentError(failure.code, failure.message, failure.params);
  if (!entries) throw new Error("invalid zip data");
  const files: Record<string, Uint8Array> = {};
  for (const e of entries) {
    if (keep && !keep({ name: e.name, originalSize: e.originalSize })) continue;
    files[e.name] = member(bytes, e);
  }
  return files;
}

/**
 * The same archive with every member re-stored UNCOMPRESSED, after {@link safeUnzip}: what a
 * parser with its own unbounded inflater is handed, so it only ever copies bytes.
 */
export function canonicalZip(bytes: Uint8Array): Uint8Array {
  return storedZip(safeUnzip(bytes));
}

/** Members already inflated by {@link safeUnzip}, zipped back UNCOMPRESSED. */
export function storedZip(files: Record<string, Uint8Array>): Uint8Array {
  const stored: Zippable = {};
  for (const [name, data] of Object.entries(files)) stored[name] = [data, { level: 0 }];
  return zipSync(stored);
}
