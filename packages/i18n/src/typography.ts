/**
 * French typography, applied ONCE to the whole French catalogue rather than by hand in
 * 4,900 lines: a space before « : ; ? ! » and inside « guillemets » is NON-breaking, so a
 * colon or a question mark never starts a line on its own. Only an existing regular space
 * is replaced: a string that has none is left exactly as written (URLs, « :: », ratios).
 *
 * Narrow no-break space (U+202F) before ; ? ! as the Imprimerie nationale sets them, a
 * no-break space (U+00A0) before : and inside the guillemets.
 */
const NBSP = " ";
const NNBSP = " ";

export function frenchSpacing(s: string): string {
  return s
    .replace(/ ([;?!])/g, `${NNBSP}$1`)
    .replace(/ :(?=\s|$)/g, `${NBSP}:`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`);
}

/** The catalogue with every string — returned by a function too — set by `frenchSpacing`. */
export function withFrenchSpacing<T>(value: T): T {
  if (typeof value === "string") return frenchSpacing(value) as T;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    const wrapped = (...args: unknown[]) => withFrenchSpacing(fn(...args));
    // Keep the declared arity: callers (and the catalogue's own completeness test) read it.
    Object.defineProperty(wrapped, "length", { value: fn.length });
    return wrapped as T;
  }
  if (Array.isArray(value)) return value.map((v) => withFrenchSpacing(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withFrenchSpacing(v)])) as T;
  }
  return value;
}
