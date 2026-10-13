import type { RedactionMatch, Vault } from "../../types";
import type { UrlOccurrenceGuard } from "../../engine/urls";
import { staysGlued } from "../../engine/vault/glue";
import { entityKey } from "../../util";

export const UNREVERSIBLE_ERROR = "redaction postcondition failed: a reported match was not vaulted";
export const RESIDUAL_ERROR = "redaction postcondition failed: a reported value is still in the text";

/**
 * POSTCONDITION — "reported ⇒ vaulted ⇒ substituted". `matches` is what the UI shows as
 * redacted, what `redactedSpans` persists and what the privacy report counts; it is built
 * while gathering, BEFORE we know what actually got applied. A match that claims a
 * redaction which never happened tells the user a value is protected while it sits on
 * the wire. Reconciled here, at the single exit:
 *  - the placeholder is in `exclude` ⇒ the user turned that category off (or kept the
 *    value in clear). Not substituting is CORRECT, but it is not a redaction: drop the claim.
 *  - the placeholder restores ANOTHER CASING of the same entity (« McDonald » vaulted,
 *    « Mcdonald » now: `recaseLike` cannot spell the difference, so both land on one fake
 *    and the vault keeps the first). Reversible to the same identity — accepted ONLY when
 *    `text` no longer holds the value, i.e. the variant pass really substituted it.
 *  - anything else ⇒ UNREVERSIBLE and never substituted: fails CLOSED via `error`, which
 *    the send path turns into a refusal rather than a downgrade.
 * And for a STRUCTURED value (`structured`: a phone, an IBAN, a key — `engine/vault/glue.ts`)
 * the claim is checked against the OUTPUT: an applied match whose value still stands in
 * `text` where the forward pass had to substitute it fails CLOSED via `error` too. Spared
 * on purpose, and only those: an occurrence continuing a longer digit run, one the URL
 * guard keeps (`urlGuard`), one inside a vault key or inside an EXCLUDED value.
 * `uncertainKeys` re-attaches the surviving candidates' "to verify" flag by entity key
 * (the allocators don't thread it — the value is the join).
 */
export function reconcileMatches(
  matches: RedactionMatch[],
  ctx: {
    vault: Vault;
    exclude: Set<string>;
    text: string;
    uncertainKeys: Set<string>;
    structured?: (value: string) => boolean;
    urlGuard?: UrlOccurrenceGuard;
  },
): { applied: RedactionMatch[]; error?: string } {
  const { vault, exclude, text, uncertainKeys } = ctx;
  const applied: RedactionMatch[] = [];
  let unreversible = false;
  let residual = false;
  for (const m of matches) {
    const restored = vault[m.placeholder];
    // `sameEntity` only matters when the vault restores something else — and its
    // `text.includes` is a scan of the whole text, so it is not paid per ordinary match.
    const sameEntity = () =>
      restored !== undefined && entityKey(restored) === entityKey(m.value) && !text.includes(m.value);
    if (restored !== m.value && !sameEntity()) {
      unreversible = true;
      continue;
    }
    if (exclude.has(m.placeholder)) continue;
    // A number token keeps the plain glue guard on the way out (`applyVault`), so here too.
    const checked = restored === m.value && !/^n\d+$/.test(m.placeholder) && ctx.structured?.(m.value);
    if (checked && standsInClear(m.value, ctx)) residual = true;
    applied.push(uncertainKeys.has(entityKey(m.value)) ? { ...m, uncertain: true } : m);
  }
  const error = unreversible ? UNREVERSIBLE_ERROR : residual ? RESIDUAL_ERROR : undefined;
  return { applied, error };
}

/** Every [start, end) where `needle` occurs in `text`. */
function spans(text: string, needle: string): [number, number][] {
  const out: [number, number][] = [];
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) out.push([i, i + needle.length]);
  return out;
}

/** True when `value` occurs in `text` at a place the forward pass had to substitute. */
function standsInClear(
  value: string,
  ctx: { vault: Vault; exclude: Set<string>; text: string; urlGuard?: UrlOccurrenceGuard },
): boolean {
  const { vault, exclude, text, urlGuard } = ctx;
  const hits = spans(text, value);
  if (!hits.length) return false;
  // What may legitimately CONTAIN the value on the wire: a vault key, or a value left in
  // clear because its category is off.
  const covers: string[] = [];
  for (const [token, real] of Object.entries(vault)) {
    if (token.length > value.length && token.includes(value)) covers.push(token);
    if (exclude.has(token) && real.length > value.length && real.includes(value)) covers.push(real);
  }
  const covered = covers.flatMap((c) => spans(text, c));
  return hits.some(
    ([s, e]) =>
      !staysGlued(text, s, value, true) &&
      !urlGuard?.(s, value.length, value) &&
      !covered.some(([cs, ce]) => cs <= s && e <= ce),
  );
}
