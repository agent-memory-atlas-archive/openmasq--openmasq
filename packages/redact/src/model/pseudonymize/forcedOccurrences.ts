// Where a FORCED value (a Coffre term, a manual « Redact ») occurs in the input. Its contract
// is « always redacted »: the user named the value, so every way the text may write it
// counts — another casing, a separator written differently (« Jean Dupont » as
// « Jean Dupont », « Jean  Dupont », « Jean\nDupont », « jean.dupont », « JEAN-DUPONT »,
// « JeanDupont »), an invisible character inside, NFD accents. Each occurrence is returned
// as the ORIGINAL characters, so the substitution touches only verbatim spans.
import { caseInsensitiveOccurrences, escapeRegExp, isCjkText } from "../../util";
import { originalSlice, textSkeleton, type Skeleton } from "../../textSkeleton";

/** Any run of space (NBSP and the narrow NBSP included), `.`, `_`, `-` — or none. */
const SEP = "[\\s\\u00A0\\u202F._\\-]*";
const WORDISH = /[\p{L}\p{N}]/u;

function forcedRegex(value: string): RegExp | null {
  const skeleton = textSkeleton(value)?.text ?? value;
  const tokens = skeleton.split(/[\s  ._-]+/u).filter(Boolean);
  if (!tokens.length) return null;
  const body = tokens.map(escapeRegExp).join(SEP);
  // Whole-word bounded where the value's own edge is a letter or digit (as `isWordGlued`);
  // a CJK value has no word boundary to respect.
  const cjk = isCjkText(value);
  const lead = !cjk && WORDISH.test(tokens[0][0]) ? "(?<![\\p{L}\\p{N}])" : "";
  const last = tokens[tokens.length - 1];
  const trail = !cjk && WORDISH.test(last[last.length - 1]) ? "(?![\\p{L}\\p{N}])" : "";
  return new RegExp(`${lead}(?:${body})${trail}`, "giu");
}

export function forcedOccurrences(input: string, value: string, sk: Skeleton | null): string[] {
  const out = new Set(caseInsensitiveOccurrences(input, value));
  const re = forcedRegex(value);
  if (!re) return [...out];
  const hay = sk?.text ?? input;
  for (let m = re.exec(hay); m; m = re.exec(hay)) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    out.add(sk ? originalSlice(sk, input, m.index, m.index + m[0].length) : m[0]);
  }
  return [...out];
}
