/**
 * The SKELETON of a text: what the deterministic detectors read when the text wears an
 * invisible or a compatibility disguise, with the way back to the ORIGINAL characters.
 *
 * A detector reads characters. Written with an invisible character inside it (zero-width
 * space, soft hyphen, word joiner — every `Default_Ignorable_Code_Point`), with fullwidth
 * forms (« ０６１２… », « ＠ »), with digits of another script (Arabic-Indic « ٠٦١٢… »)
 * or with DECOMPOSED accents (NFD, what a macOS paste and most PDF extractions emit), a
 * value no longer has the shape a rule knows, and travels in clear. The skeleton removes
 * the ignorables, composes NFC, and maps fullwidth ASCII and every decimal digit
 * (`\p{Nd}`) to ASCII — so the detectors see the value — while `start`/`end` say which
 * ORIGINAL characters each skeleton unit stands for. A detection is mapped back to the
 * original slice it covers, invisible characters included, and THAT is what is vaulted
 * and substituted: only verbatim spans of the input are ever touched.
 *
 * Whitespace is never touched (the rules already read NBSP and a fullwidth space is a
 * field separator), nor any other compatibility form: the skeleton differs from the text
 * only where a disguise is, and is `null` for an ordinary text.
 */
export interface Skeleton {
  text: string;
  /** Original index where the cluster behind each skeleton unit starts. */
  start: number[];
  /** Original index (exclusive) where that cluster ends. */
  end: number[];
}

const IGNORABLE = /\p{Default_Ignorable_Code_Point}/u;
const MARK = /\p{M}/u;
const ND = /\p{Nd}/u;
const DISGUISE = /[\p{Default_Ignorable_Code_Point}\p{M}\uFF01-\uFF5E]|(?![0-9])\p{Nd}/u;

/** The value of a non-ASCII decimal digit: Unicode lays every `Nd` set out as a contiguous
 *  0…9 run, so the digit is how many `Nd` code points precede it in its run, modulo 10. */
function digitOf(cp: number): string {
  let k = 0;
  while (k < 64 && ND.test(String.fromCodePoint(cp - k - 1))) k++;
  return String(k % 10);
}

function mapCluster(cluster: string): string {
  const cp = cluster.codePointAt(0)!;
  if (cluster.length <= 2 && cp > 0x7f && ND.test(cluster)) return digitOf(cp);
  if (cp >= 0xff01 && cp <= 0xff5e && cluster.length === 1) return String.fromCharCode(cp - 0xfee0);
  return cluster.normalize("NFC");
}

export function textSkeleton(input: string): Skeleton | null {
  // Fast path: no character of the families above (an ordinary NFC text, accents included).
  if (!DISGUISE.test(input)) return null;
  let text = "";
  const start: number[] = [];
  const end: number[] = [];
  const chars = Array.from(input);
  let i = 0; // original UTF-16 index
  let k = 0; // index in `chars`
  while (k < chars.length) {
    const ch = chars[k];
    if (IGNORABLE.test(ch)) {
      // Dropped. A slice between two kept clusters still covers it (slices are contiguous).
      i += ch.length;
      k++;
      continue;
    }
    const from = i;
    let cluster = ch;
    i += ch.length;
    k++;
    while (k < chars.length && MARK.test(chars[k])) {
      cluster += chars[k];
      i += chars[k].length;
      k++;
    }
    const out = mapCluster(cluster);
    for (let u = 0; u < out.length; u++) {
      start.push(from);
      end.push(i);
    }
    text += out;
  }
  return text === input ? null : { text, start, end };
}

/** The ORIGINAL slice behind skeleton range [a, b). */
export function originalSlice(sk: Skeleton, input: string, a: number, b: number): string {
  return input.slice(sk.start[a], sk.end[b - 1]);
}
