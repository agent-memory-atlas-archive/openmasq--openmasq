// How the allocator finds the fake a real value ALREADY has — so one real value keeps ONE
// fake whatever casing, separators, glue or ACCENTS it comes back with. Reads `reverse`
// (real → token) only; the allocator owns every write.
import { capitalize, entityKey, foldAccents } from "../../util";

export interface Resolvers {
  /** The canonical fake of A SINGLE WORD (name token, domain), case- and accent-tolerant. */
  resolveFakeCI: (real: string) => string | undefined;
  /** The fake of a WHOLE VALUE already known, whatever its casing, glue or accents. */
  resolveEntityFakeCI: (real: string) => string | undefined;
}

const fold = (s: string): string => foldAccents(s.normalize("NFC")).toLowerCase();

/** ONE identity, accents folded: « Amélie Brivet » and « Amelie Brivet » are the same person,
 *  so they share a fake here — and the exit postcondition (`postcondition.ts`) must accept
 *  that pair by the SAME definition, or it refuses a value that was masked. */
export const foldedEntityKey = (s: string): string => fold(entityKey(s));

/**
 * The ACCENT-folded index: « helene » and « Hélène » (or its NFD spelling) are one key. A
 * key two DIFFERENT reals fold onto (beyond their casing) resolves to NOTHING — the accent
 * is then the only thing telling them apart, and a wrong reuse would merge two identities.
 *
 * Maintained incrementally: `reverse` only ever GROWS (no delete), and a Map iterator that
 * is never driven past the end keeps seeing appended entries, so each entry is indexed once.
 */
function foldIndex(reverse: Map<string, string>, keyOf: (real: string) => string) {
  const index = new Map<string, { real: string; ambiguous: boolean }>();
  const it = reverse.keys();
  let consumed = 0;
  return (key: string): string | undefined => {
    while (consumed < reverse.size) {
      const next = it.next();
      if (next.done) break;
      consumed++;
      const k = keyOf(next.value);
      const prior = index.get(k);
      if (!prior) index.set(k, { real: next.value, ambiguous: false });
      else if (prior.real.normalize("NFC").toLowerCase() !== next.value.normalize("NFC").toLowerCase()) {
        prior.ambiguous = true;
      }
    }
    const hit = index.get(key);
    return hit && !hit.ambiguous ? reverse.get(hit.real) : undefined;
  };
}

export function makeResolvers(reverse: Map<string, string>): Resolvers {
  const byFoldedWord = foldIndex(reverse, fold);
  const byFoldedGlue = foldIndex(reverse, foldedEntityKey);
  // The value's existing canonical fake (a name token, a domain), tried across case
  // variants so a lowercase alias and a capitalised NAME resolve to the same identity —
  // then across accents (« helene » for a vaulted « Hélène »).
  const resolveFakeCI = (real: string): string | undefined =>
    reverse.get(real) ??
    reverse.get(real.toLowerCase()) ??
    reverse.get(capitalize(real)) ??
    (real.length >= 3 ? byFoldedWord(fold(real)) : undefined);
  // A whole-value entity re-mentioned in a different casing must reuse the SAME fake —
  // scan the reverse map for ANY case-insensitive match (multi-word / whole-value).
  const resolveEntityFakeCI = (real: string): string | undefined => {
    const direct = resolveFakeCI(real);
    if (direct) return direct;
    const lc = real.toLowerCase();
    for (const [orig, token] of reverse) if (orig.toLowerCase() === lc) return token;
    // …and the GLUED form of the same entity (« Karl Studio » vaulted at turn 1,
    // « karlstudio.fr » returned by a tool at turn 2 must be the same identity). Aligned
    // with `applyVaultVariants` on one identity definition (`entityKey`), accents folded.
    const glue = entityKey(real);
    if (glue.length >= 4) {
      for (const [orig, token] of reverse) if (entityKey(orig) === glue) return token;
      return byFoldedGlue(fold(glue));
    }
    return undefined;
  };
  return { resolveFakeCI, resolveEntityFakeCI };
}
