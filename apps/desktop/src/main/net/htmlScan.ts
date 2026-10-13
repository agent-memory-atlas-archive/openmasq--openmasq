/**
 * Linear-time HTML tag scanning for `htmlText.ts`. Each function is the exact equivalent of
 * a regex over the same input, written with `indexOf` so that its cost is O(n) whatever the
 * page holds.
 *
 * ⚠️ The regex forms (`<x\b[^>]*>[\s\S]*?<\/x>`, `<!--[\s\S]*?-->`, `<[^>]+>`) are QUADRATIC on
 * an unclosed construct: the engine retries the lazy scan to the end of the input from every
 * opening, and a fetched page of a few hundred kB of `<main>` without `</main>` holds the main
 * process for minutes. Equivalence holds because a failed scan from one opening (no `>`, no
 * closing tag after it) also fails from every later opening, so the scan stops there.
 *
 * Case-insensitivity folds ASCII only, which is what a non-unicode `/i` regex does for these
 * ASCII names, and keeps indices aligned with the original string (`toLowerCase` may not).
 */

const lowerAscii = (s: string): string => s.replace(/[A-Z]+/g, (m) => m.toLowerCase());

const isWordChar = (c: number): boolean =>
  (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;

/** End (exclusive) of the word run starting at `i`. */
function wordEnd(s: string, i: number): number {
  let k = i;
  while (k < s.length && isWordChar(s.charCodeAt(k))) k++;
  return k;
}

/** `<name\b[^>]*>` opening at `i` (lowered input): index of its `>`, -1 when `>` is absent
 *  (no later opening can match either), -2 when the name does not match here. */
function openTagEnd(lower: string, i: number, name: string): number {
  if (!lower.startsWith(name, i + 1)) return -2;
  const after = i + 1 + name.length;
  if (after < lower.length && isWordChar(lower.charCodeAt(after))) return -2;
  return lower.indexOf(">", after);
}

/** First `<name\b[^>]*>…</name>` element: the open tag's start, inner bounds and end. */
export function findElement(
  s: string,
  name: string,
  from = 0,
  lower = lowerAscii(s),
): { start: number; innerStart: number; innerEnd: number; end: number } | null {
  const close = `</${name}>`;
  for (let i = lower.indexOf("<" + name, from); i !== -1; i = lower.indexOf("<" + name, i + 1)) {
    const gt = openTagEnd(lower, i, name);
    if (gt === -2) continue;
    if (gt === -1) return null;
    const c = lower.indexOf(close, gt + 1);
    if (c === -1) return null;
    return { start: i, innerStart: gt + 1, innerEnd: c, end: c + close.length };
  }
  return null;
}

/** `s.replace(/<name\b[^>]*>[\s\S]*?<\/name>/gi, " ")`. */
export function removeElements(s: string, name: string): string {
  const lower = lowerAscii(s);
  let out = "";
  let pos = 0;
  for (let el = findElement(s, name, 0, lower); el; el = findElement(s, name, el.end, lower)) {
    out += s.slice(pos, el.start) + " ";
    pos = el.end;
  }
  return pos === 0 ? s : out + s.slice(pos);
}

/** `s.replace(/<!--[\s\S]*?-->/g, " ")`. */
export function removeComments(s: string): string {
  let out = "";
  let pos = 0;
  for (let i = s.indexOf("<!--"); i !== -1; i = s.indexOf("<!--", pos)) {
    const c = s.indexOf("-->", i + 4);
    if (c === -1) break;
    out += s.slice(pos, i) + " ";
    pos = c + 3;
  }
  return pos === 0 ? s : out + s.slice(pos);
}

/** `s.replace(/<\/?(?:name1|name2|…)\b[^>]*>/gi, by)` for a set of lower-case names. */
export function replaceNamedTags(s: string, names: ReadonlySet<string>, by: string): string {
  const lower = lowerAscii(s);
  let out = "";
  let pos = 0;
  for (let i = lower.indexOf("<"); i !== -1; i = lower.indexOf("<", i + 1)) {
    const n = lower.charCodeAt(i + 1) === 47 /* / */ ? i + 2 : i + 1;
    const e = wordEnd(lower, n);
    if (e === n || !names.has(lower.slice(n, e))) continue;
    const gt = lower.indexOf(">", e);
    if (gt === -1) break;
    out += s.slice(pos, i) + by;
    pos = gt + 1;
    i = gt;
  }
  return pos === 0 ? s : out + s.slice(pos);
}

/** `s.replace(/<[^>]+>/g, by)`. */
export function replaceAllTags(s: string, by: string): string {
  let out = "";
  let pos = 0;
  for (let i = s.indexOf("<"); i !== -1; i = s.indexOf("<", i + 1)) {
    const gt = s.indexOf(">", i + 1);
    if (gt === -1) break;
    if (gt === i + 1) continue; // `<>`: `[^>]+` needs one character
    out += s.slice(pos, i) + by;
    pos = gt + 1;
    i = gt;
  }
  return pos === 0 ? s : out + s.slice(pos);
}
