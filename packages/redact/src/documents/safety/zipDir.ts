// The ZIP CENTRAL DIRECTORY, read the way the inflater reads it — pure, zero deps.
//
// A size check is only worth what its PARSE is worth: a guard that walks a different
// directory than the decompressor (another entry count, no ZIP64, a silent stop on an odd
// record) certifies an archive nobody will open. So this module reads EXACTLY what fflate's
// `unzipSync` reads — the LAST end-of-central-directory record within 64 KiB of the tail,
// the entry count at EOCD+8, the ZIP64 locator/record when present, the ZIP64 extra field
// for 0xFFFFFFFF sizes, the data offset from the LOCAL header's own lengths — and every
// consumer that inflates goes through it (`unzip.ts`). Anything the two readings could
// disagree on is REFUSED (fail closed): EOCD+8 ≠ EOCD+10, a ZIP64 field that does not
// match its classic twin, a record whose signature is wrong, an entry whose data runs past
// the end of the file, a compression method neither 0 nor 8. A genuine Office file is
// consistent on every one of these, so none of them costs a real document anything.
import type { DocumentFailure } from "../errors";

/** Total UNCOMPRESSED size a ZIP (docx/pptx/xlsx/ods) may declare. */
export const MAX_ZIP_TOTAL_BYTES = 300 * 1024 * 1024; // 300 MiB
/** Overall compression ratio (uncompressed / compressed) above which a ZIP is a bomb. */
export const MAX_ZIP_RATIO = 250;
/** Entry-count cap — a "flat" bomb hides size behind millions of tiny members. */
export const MAX_ZIP_ENTRIES = 10_000;

/** One member as the inflater will see it. `originalSize` is what `unzip.ts` allows it to
 *  inflate to, and the allocation it makes: the declared size IS the cap. */
export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  originalSize: number;
  /** Offset of the member's data (after the local header). */
  dataStart: number;
}

/** `entries` null + `failure` null = no end-of-central-directory at all (not a ZIP we
 *  read; the inflater refuses it by itself). */
export interface ZipDirectory {
  entries: ZipEntry[] | null;
  failure: DocumentFailure | null;
}

const SIG_EOCD = 0x06054b50;
const SIG_Z64_LOC = 0x07064b50;
const SIG_Z64_EOCD = 0x06064b50;
const SIG_CEN = 0x02014b50;
const SIG_LOC = 0x04034b50;
const FFFF = 0xffff;
const FFFFFFFF = 0xffffffff;

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + b[o + 3] * 0x1000000;
const u64 = (b: Uint8Array, o: number) => u32(b, o) + u32(b, o + 4) * 0x100000000;

const inconsistent = (): DocumentFailure => ({
  code: "zip_too_large",
  message: "Inconsistent compressed file structure — refused (zip-bomb protection).",
});
const tooLarge = (): DocumentFailure => ({
  code: "zip_too_large",
  message: "Compressed file too large once decompressed — refused (zip-bomb protection).",
});
const tooMany = (entries: number): DocumentFailure => ({
  code: "zip_entries",
  params: { entries },
  message: `Suspicious compressed file (${entries} entries) — refused.`,
});

/** fflate's scan: from `length - 22` backwards, at most 65 558 bytes from the end. */
function findEocd(b: Uint8Array): number {
  for (let e = b.length - 22; e >= 0 && b.length - e <= 65558; e--) {
    if (u32(b, e) === SIG_EOCD) return e;
  }
  return -1;
}

/** Latin-1 unless the UTF-8 flag (bit 11) is set — the same rule as fflate. */
function decodeName(raw: Uint8Array, utf8: boolean): string {
  if (utf8) return new TextDecoder("utf-8").decode(raw);
  let s = "";
  for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
  return s;
}

/** Count + central-directory offset, ZIP64-aware; `null` = inconsistent. */
function directoryHead(b: Uint8Array, e: number): { count: number; offset: number; z64: boolean } | null {
  const count = u16(b, e + 8);
  if (u16(b, e + 10) !== count || u16(b, e + 4) !== u16(b, e + 6)) return null;
  const offset = u32(b, e + 16);
  if (e < 20 || u32(b, e - 20) !== SIG_Z64_LOC) return { count, offset, z64: false };
  const ze = u64(b, e - 12);
  if (ze + 56 > b.length || u32(b, ze) !== SIG_Z64_EOCD) {
    // fflate falls back to the classic fields here; a locator pointing nowhere is refused.
    return null;
  }
  const total = u64(b, ze + 32);
  const z64Offset = u64(b, ze + 48);
  if (u64(b, ze + 24) !== total) return null;
  if (count !== FFFF && count !== total) return null;
  if (offset !== FFFFFFFF && offset !== z64Offset) return null;
  return { count: total, offset: z64Offset, z64: true };
}

/** fflate's `z64hs`: 0xFFFFFFFF fields read from the ZIP64 extra (id 1), in its order. */
function z64Sizes(
  b: Uint8Array, extra: number, extraLen: number, csz: number, usz: number, off: number,
): [number, number, number] | null {
  const nsc = csz === FFFFFFFF ? 1 : 0;
  const nsu = usz === FFFFFFFF ? 1 : 0;
  const noff = off === FFFFFFFF ? 1 : 0;
  for (let p = extra, end = extra + extraLen; p + 4 < end; p += 4 + u16(b, p + 2)) {
    if (u16(b, p) !== 1) continue;
    if (p + 4 + 8 * (nsc + nsu + noff) > end) return null;
    return [
      nsc ? u64(b, p + 4 + 8 * nsu) : csz,
      nsu ? u64(b, p + 4) : usz,
      noff ? u64(b, p + 4 + 8 * (nsu + nsc)) : off,
    ];
  }
  return null;
}

/**
 * The directory, its members, and the bomb verdict on their DECLARED sizes (entry count,
 * cumulative size, overall ratio), without inflating anything.
 */
export function readZipDirectory(b: Uint8Array): ZipDirectory {
  const e = findEocd(b);
  if (e < 0) return { entries: null, failure: null };
  const head = directoryHead(b, e);
  if (!head) return { entries: null, failure: inconsistent() };
  if (head.count > MAX_ZIP_ENTRIES) return { entries: null, failure: tooMany(head.count) };
  const entries: ZipEntry[] = [];
  let o = head.offset;
  let totalOriginal = 0;
  let totalCompressed = 0;
  for (let n = 0; n < head.count; n++) {
    if (o + 46 > b.length || u32(b, o) !== SIG_CEN) return { entries: null, failure: inconsistent() };
    const flags = u16(b, o + 8);
    const method = u16(b, o + 10);
    const nameLen = u16(b, o + 28);
    const extraLen = u16(b, o + 30);
    const next = o + 46 + nameLen + extraLen + u16(b, o + 32);
    if (next > b.length) return { entries: null, failure: inconsistent() };
    let csz = u32(b, o + 20);
    let usz = u32(b, o + 24);
    let off = u32(b, o + 42);
    if (head.z64 && (csz === FFFFFFFF || usz === FFFFFFFF || off === FFFFFFFF)) {
      const sizes = z64Sizes(b, o + 46 + nameLen, extraLen, csz, usz, off);
      if (!sizes) return { entries: null, failure: inconsistent() };
      [csz, usz, off] = sizes;
    }
    totalOriginal += usz;
    totalCompressed += csz;
    if (totalOriginal > MAX_ZIP_TOTAL_BYTES) return { entries: null, failure: tooLarge() };
    if (method !== 0 && method !== 8) return { entries: null, failure: inconsistent() };
    if (off + 30 > b.length || u32(b, off) !== SIG_LOC) return { entries: null, failure: inconsistent() };
    const dataStart = off + 30 + u16(b, off + 26) + u16(b, off + 28);
    if (dataStart + csz > b.length) return { entries: null, failure: inconsistent() };
    const name = decodeName(b.subarray(o + 46, o + 46 + nameLen), (flags & 0x800) !== 0);
    entries.push({ name, method, compressedSize: csz, originalSize: usz, dataStart });
    o = next;
  }
  if (totalCompressed > 0 && totalOriginal / totalCompressed > MAX_ZIP_RATIO && totalOriginal > 10 * 1024 * 1024) {
    return {
      entries: null,
      failure: { code: "zip_ratio", message: "Abnormal compression ratio — file refused (zip-bomb protection)." },
    };
  }
  return { entries, failure: null };
}
