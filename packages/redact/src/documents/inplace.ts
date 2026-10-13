// In-place document redaction — KEEP the file format, scrub the text inside.
// Browser-safe (xlsx + fflate work in both Node and the browser), so the keyless
// webview injector can redact an upload before it leaves while the model still
// receives a real .csv/.xlsx/.docx. Separate entry (@openmasq/redact/inplace)
// so its heavy deps never reach the renderer bundle.
//
// Supported in place: text formats (csv/tsv/txt/json/md/…), XLSX (cell values),
// DOCX (best-effort: replaces values in word/document.xml — misses text split
// across runs), PPTX (same best-effort across every slide/notes part). PDF /
// images / unknown binaries are BLOCKED (can't be redacted faithfully in the
// browser) — callers should refuse the upload.
import { zipSync, strToU8, strFromU8 } from "fflate";
import { DocumentError } from "./errors";
import { guardUploadRefusal } from "./safety/guard";
import { safeUnzip } from "./safety/unzip";
import { redactSheet } from "./inplaceSheet";

/** Scrub plain text → redacted text + the value→placeholder pairs applied (the
 *  pairs let us replace values inside structured XML like DOCX). Injected so the
 *  caller's conversation vault stays the single source of truth. */
export type Scrub = (text: string) => { text: string; pairs: { from: string; to: string }[] };

export interface RedactedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

/** Thrown for formats we can't redact in place (PDF, images, unknown binary). */
export class BlockedUploadError extends Error {
  constructor(public readonly ext: string) {
    super(`Cannot redact a .${ext} in place — blocked.`);
    this.name = "BlockedUploadError";
  }
}

const TEXT_EXT = new Set([
  ".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".log", ".xml",
  ".yaml", ".yml", ".html", ".htm", ".css", ".js", ".ts", ".tsx", ".jsx",
  ".py", ".java", ".c", ".h", ".cpp", ".rb", ".go", ".rs", ".sh", ".sql",
  ".ini", ".toml", ".env",
]);
const SHEET_EXT = new Set([".xlsx", ".xlsm", ".xls", ".ods"]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

/**
 * Redact a file's text content while keeping its format. Returns the rewritten
 * bytes. Throws {@link BlockedUploadError} for formats that can't be redacted in
 * place (PDF/images/unknown) so the caller can refuse the upload, and `DocumentError` for
 * bytes the pre-parse gate or the bounded readers refuse.
 */
export function redactFileInPlace(
  name: string,
  bytes: Uint8Array,
  type: string,
  scrub: Scrub,
): RedactedFile {
  const ext = extOf(name);
  // The same pre-parse gate as extraction (size, type contradiction, zip bomb): what was
  // refused there is never handed to a parser here either.
  const unsafe = guardUploadRefusal(bytes, ext);
  if (unsafe) throw new DocumentError(unsafe.code, unsafe.message, unsafe.params);
  if (TEXT_EXT.has(ext) || ext === "") {
    const { text } = scrub(strFromU8(bytes));
    return { name, type: type || "text/plain", bytes: strToU8(text) };
  }
  if (SHEET_EXT.has(ext)) return redactSheet(name, bytes, type, scrub);
  if (ext === ".docx") return redactDocx(name, bytes, type, scrub);
  if (ext === ".pptx") return redactPptx(name, bytes, type, scrub);
  throw new BlockedUploadError(ext.slice(1) || "file");
}

// docProps/core.xml (author = `dc:creator`/`cp:lastModifiedBy`) + app.xml (company/manager)
// hold PII in METADATA, and DOCX headers/footers/foot-endnotes/comments hold it OUTSIDE the
// main body — all of which the old "word/document.xml only" scrub LEAKED into the saved
// "redacted" file (audit). These are the text-bearing parts we scrub for each format.
const DOCX_TEXT_PART =
  /^(word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml|docProps\/(core|app)\.xml)$/;
const PPTX_TEXT_PART =
  /^(ppt\/(slides|notesSlides)\/[^/]+\.xml|docProps\/(core|app)\.xml)$/;

/**
 * Scrub EVERY text-bearing XML part of an OOXML (docx/pptx) zip. Learns value→placeholder
 * pairs from the COMBINED visible text of ALL parts — so a value shared across parts gets ONE
 * stable placeholder, and PII living ONLY in metadata (docProps author) or a header/footer/
 * note is detected + scrubbed too. Then replaces each real value literally in each part's XML.
 * Best-effort (unchanged): a value split across runs (`<w:t>a</w:t><w:t>b</w:t>`) isn't a
 * single literal — the model-facing wire is redacted separately; this scrubs the FILE bytes.
 */
function redactOoxml(
  name: string,
  bytes: Uint8Array,
  type: string,
  defaultType: string,
  isTextPart: (name: string) => boolean,
  scrub: Scrub,
): RedactedFile {
  // Every member is re-zipped, so every member is inflated — each one capped at its
  // declared size, the whole at `MAX_ZIP_TOTAL_BYTES` (`safety/unzip.ts`).
  const zip = safeUnzip(bytes);
  const parts = Object.keys(zip).filter(isTextPart);
  if (parts.length) {
    const visible = parts.map((p) => strFromU8(zip[p]).replace(/<[^>]+>/g, " ")).join(" ");
    const pairs = scrub(visible).pairs.filter((p) => p.from);
    if (pairs.length) {
      for (const part of parts) {
        let xml = strFromU8(zip[part]);
        for (const { from, to } of pairs) xml = xml.split(from).join(to);
        zip[part] = strToU8(xml);
      }
    }
  }
  return { name, type: type || defaultType, bytes: zipSync(zip) };
}

function redactDocx(name: string, bytes: Uint8Array, type: string, scrub: Scrub): RedactedFile {
  return redactOoxml(
    name,
    bytes,
    type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    (k) => DOCX_TEXT_PART.test(k),
    scrub,
  );
}

function redactPptx(name: string, bytes: Uint8Array, type: string, scrub: Scrub): RedactedFile {
  return redactOoxml(
    name,
    bytes,
    type,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    (k) => PPTX_TEXT_PART.test(k),
    scrub,
  );
}
