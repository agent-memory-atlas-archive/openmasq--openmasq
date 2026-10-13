// ── URL readings + the search-page predicate (pure) ──────────────────────────
// ONE home for "every form a receiving server decodes a URL part to" (rule 9): the
// nav-exfil scan (`exfil.ts`) and the reply link/image gate
// (`components/markdown/logic/hrefCarriesVault.ts`) both match the vault through it.

import { isSearchEngineHost } from "@openmasq/catalog/mcp";

/**
 * Every reading of `s` a receiving server ends up decoding to the same thing, LOWER-cased:
 * raw, `+` as a space (`application/x-www-form-urlencoded`, which `decodeURIComponent`
 * leaves alone — `unredactArgs` restores `Paul+Martin` as `Jean+Dupont`), and each of those
 * percent-decoded. A malformed %-escape keeps the raw reading.
 */
export function urlReadings(s: string): string[] {
  const out = [s];
  const plus = s.replace(/\+/g, " ");
  if (plus !== s) out.push(plus);
  for (const r of [...out]) {
    try {
      const decoded = decodeURIComponent(r);
      if (decoded !== r) out.push(decoded);
    } catch {
      /* a malformed %-escape decodes to nothing — the raw reading still counts */
    }
  }
  return out.map((r) => r.toLowerCase());
}

/** Vault values the nav scan compares (same ≥4-chars floor everywhere in this family). */
const scannable = (vaultValues: string[]): string[] =>
  vaultValues.filter((v) => v && v.length >= 4).map((v) => v.toLowerCase());

/** The first vault value found in ANY reading of `s`, case-insensitive; `undefined` if none. */
export function vaultHitIn(s: string, vaultValues: string[]): string | undefined {
  if (!s) return undefined;
  const forms = urlReadings(s);
  const needles = scannable(vaultValues);
  return needles.find((n) => forms.some((f) => f.includes(n)));
}

/** `s` with every vault value removed (case-insensitive), for the search-box residue. */
export function stripVaultValues(s: string, vaultValues: string[]): string {
  let out = s;
  for (const v of vaultValues) {
    if (!v) continue;
    const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "gi"), " ");
  }
  return out.trim();
}

/**
 * The PATHS where a search engine renders a results page from its search box. An
 * ALLOW-list: a search engine also serves redirectors (`/url?q=`, `/l/`, `/r/`, `/link`)
 * and arbitrary pages whose `?q=` is not a search — those get no search-box exemption.
 * Compared without the trailing slash, lower-cased.
 */
const SEARCH_PATHS: ReadonlySet<string> = new Set([
  "",
  "/search",
  "/html",
  "/lite",
  "/s",
  "/web",
  "/sp/search",
  "/do/search",
  "/images/search",
  "/news/search",
  "/videos/search",
]);

/** Is this URL a search engine's RESULTS page (exact host AND an allow-listed path)? */
export function isSearchResultsPage(u: URL): boolean {
  if (!isSearchEngineHost(u.hostname)) return false;
  const path = u.pathname.toLowerCase().replace(/\/+$/, "");
  return SEARCH_PATHS.has(path);
}
