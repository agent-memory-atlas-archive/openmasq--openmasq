import { isWordGlued } from "../../util";

/**
 * When a forward pass may leave an occurrence of a vaulted value in place because it only
 * continues a longer word — and when it may NOT.
 *
 * The glue guard exists for SHORT WORD-LIKE values: a 2-letter entity (« us », « ca ») must
 * not rewrite « plus » or « Canva ». A STRUCTURED value — a phone, an IBAN, a card, an id,
 * a key — is never the fragment of an ordinary word, and a LETTER written against it
 * (« Tél0612345678Fax », « …0189é », an OCR line with no spaces) does not make it one: the
 * occurrence is the value, and it is substituted. Only a DIGIT continuing its digit run
 * still keeps it apart, because « 12345678 » inside « 9912345678 » is another number.
 *
 * Structured = 6+ characters carrying a digit (the shape every one of those kinds has),
 * or a value the caller knows to be of a structured category (`isUngluedKind`). Number
 * tokens (`n1`) keep the plain guard: their values are bare quantities that DO glue into
 * references (« 12 » inside « A12B »), which the number pass itself refuses to split.
 */
export function isStructuredValue(value: string): boolean {
  return value.length >= 6 && /\d/.test(value);
}

/** The redaction categories (`redactionCategory`) whose value is structured whatever its
 *  shape. `secret` is the fallback of unknown kinds, so it only counts for a long,
 *  space-free value. */
const UNGLUED = new Set(["card", "iban", "phone", "national_id", "apikey"]);

export function isUngluedKind(category: string, value: string): boolean {
  if (/\s/.test(value) || value.length < 8) return false;
  return UNGLUED.has(category) || (category === "secret" && value.length >= 12);
}

const DIGIT = /\p{N}/u;

/** True when the occurrence of `matched` at `start` must stay verbatim as part of a longer
 *  word (see the header). `structured` relaxes the guard to a digit-run continuation. */
export function staysGlued(text: string, start: number, matched: string, structured: boolean): boolean {
  if (!isWordGlued(text, start, matched)) return false;
  if (!structured) return true;
  const before = start > 0 ? text[start - 1] : "";
  const after = text[start + matched.length] ?? "";
  return (
    (DIGIT.test(before) && DIGIT.test(matched[0])) ||
    (DIGIT.test(after) && DIGIT.test(matched[matched.length - 1]))
  );
}
