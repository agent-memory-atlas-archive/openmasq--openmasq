// ── Value SHAPES the exfil scans read (pure) ─────────────────────────────────
// Split from `exfil.ts` so the scan reads as policy and these as the shape vocabulary.
// Keyed on a VALUE's shape, never a param NAME (naming must never confer capability).

const B64ISH = /^[A-Za-z0-9+/=_-]{24,}$/;

/** An absolute path (POSIX `/a/b`, Windows `C:\a\b`) → its segments; anything else stays
 *  ONE segment (compared whole). ⚠️ Keyed on the value's SHAPE, never the param NAME: a
 *  `key === "path"` test would let a hostile server exempt any arg by naming it `path`.
 *  `browserPolicy.test.ts` pins why the split exists and what it must still catch. */
export function pathSegments(v: string): string[] {
  const isAbsPath = /^\/[^/]/.test(v) || /^[A-Za-z]:[\\/]/.test(v);
  return isAbsPath ? v.split(/[\\/]+/).filter(Boolean) : [v];
}

/**
 * A human-readable SLUG, not a blob: `brazil-markets-ibovespa-friday-july-17-2026`,
 * `en/news/2026/07/17/market-report`. Base64 spends `-`/`_`/`/` as DATA (~1 char in 32),
 * never as a separator, so a value that decomposes into WORDS is prose with dashes in it —
 * which is what most of the web's article URLs are.
 *
 * ⚠️ Requiring EVERY chunk to be a plain word or a plain number was too strict, and the
 * failing case is the norm, not the exception: news sites append an opaque article id
 * (`…-en-gironde-20250723_ZFHK4XMBRZDRPD3ZQZ2GQ7VXUE`). ONE alphanumeric chunk then sank
 * the whole slug, the path read as base64, and « Quelle actualité en France ? » opened a
 * confirmation about a Libération link. So the test is now POSITIVE — enough real words —
 * instead of demanding that nothing look like an id. A blob has no words to find: split
 * `/collect/eyJhbGciOiJIUzI1NiJ9…` and you get one, so it is still flagged.
 */
function looksLikeSlug(v: string): boolean {
  const chunks = v.split(/[-_/]+/).filter(Boolean);
  if (chunks.length < 3) return false;
  return chunks.filter((c) => /^[A-Za-z]{3,}$/.test(c)).length >= 3;
}

/**
 * A genuine data-SMUGGLING signal in a query value, independent of the param name:
 * an encoded blob (base64, or a doubly URL-encoded payload). Plain human text —
 * however long — is deliberately NOT one of these.
 *
 * ⚠️ `B64ISH` accepts `-`/`_` because base64URL uses them, which makes it match every
 * kebab-case article slug on the web. Two conditions keep those out, and neither costs
 * real detection: base64 over 24+ chars of arbitrary bytes contains BOTH cases with
 * probability ~1 (a miss needs 24 straight chars from one case's half of the alphabet),
 * and it does not decompose into words. A slug has neither property.
 *
 * This matters beyond tidiness: since rule 11 removed the un-redaction gate, this scan IS
 * the line. A warning that fires on ordinary news links is one the user learns to click
 * through, which costs more than the marginal blob it catches. What it must never miss —
 * a value carrying CONVERSATION data — is `analyzeNavExfil`'s vault check, which runs
 * first, is independent of this, and keys on the value, not its shape.
 */
export function looksEncoded(v: string): string | null {
  const mixedCase = /[a-z]/.test(v) && /[A-Z]/.test(v);
  if (B64ISH.test(v) && /[0-9]/.test(v) && mixedCase && !looksLikeSlug(v))
    return "chaîne encodée (base64 ?)";
  if ((v.match(/%[0-9A-Fa-f]{2}/g) || []).length >= 6) return "blob URL-encodé";
  return null;
}
