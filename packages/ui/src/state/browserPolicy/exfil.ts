// ── Exfiltration heuristics (pure, unit-testable) ────────────────────────────
// The scans that decide when a tool call must be CONFIRMED because it carries the
// user's data somewhere unexpected: `analyzeNavExfil` for a navigation URL,
// `analyzeArgExfil` for any other tool's arguments.
//
// ⚠️ These are DAMAGE-LIMITERS, not an immunity claim, and root rule 11 put real weight
// on them: every connector now dispatches the REAL value, so there is no un-redaction
// gate behind these — they ARE the line. They are also the last thing standing between a
// prompt-injected model and a host it chose, so keep them keyed on the VALUE's shape and
// never on a tool/param NAME (naming must never confer capability).
//
// Kept beside `tools.ts` (classification + the domain allow-list) so a reviewer sees the
// whole agent-browser trust boundary as one family (root rule 10).

import { looksEncoded, pathSegments } from "./exfilShapes";
import { isSearchResultsPage, stripVaultValues, urlReadings, vaultHitIn } from "./urlReadings";

export interface NavExfilFlag {
  param: string;
  value: string;
  reason: string;
}
export interface NavExfilResult {
  host: string;
  suspicious: boolean;
  flags: NavExfilFlag[];
}

/** Params that legitimately carry long FREE TEXT (search boxes): a long plaintext
 *  value here is EXPECTED — but ONLY on a real search engine (see below). Encoded
 *  blobs and values embedding conversation data are still flagged regardless. */
const SEARCH_PARAMS = new Set(["q", "query", "search", "s", "p", "wd", "text", "kw", "k"]);

/** Bare length past which a NON-search value is opaque enough to mention. Kept high
 *  on purpose — a plain long value is the WEAKEST signal (a search phrase, a title,
 *  an address all exceed the old 40); only encoded/vault-embedding values matter. */
const BULKY_LEN = 120;

/**
 * Heuristic scan of a navigation URL for data-exfiltration patterns in its query
 * string / fragment: values that embed known conversation data (`vaultValues` =
 * real + fake vault entries), or encoded blobs — NOT merely-long plaintext, which
 * flags ordinary search queries. Advisory only — it surfaces a warning in the
 * write-confirmation dialog; the user still decides.
 *
 * Pass the URL as it will ACTUALLY be dispatched — i.e. FULLY un-redacted, which is what
 * every connector now sends (root rule 11). A real value in a real search box on a real
 * search engine is therefore the NORMAL case, not a finding: the user asked for that
 * search, and it cannot run on a fake. Anywhere else — another param, another host — the
 * same value in a URL is still the strongest exfil signal there is.
 */
export function analyzeNavExfil(
  url: string,
  vaultValues: string[] = [],
  /** Vault values that are PLACE names (category `location`). The web's geography is
   *  MADE of them (`lemonde.fr/France/`, wiki pages, city sections), so an exact-match
   *  PATH SEGMENT equal to one reads as site structure, not smuggling — flagging it
   *  teaches the user to click through the one card that must stay meaningful. The
   *  carve-out is PATH-ONLY and EXACT-only: a place as a QUERY value stays flagged
   *  (`evil.com/?q=Amiens` is payload — the exfil shape itself), a place embedded in a
   *  longer segment stays flagged, and the HOSTNAME is never exempted (a DNS-label
   *  smuggle is pre-TLS-visible and costs nothing to keep strict). Absent ⇒ nothing
   *  exempted (fail closed). */
  placeValues: string[] = [],
): NavExfilResult {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { host: "", suspicious: false, flags: [] };
  }
  // The `SEARCH_PARAMS` exemption applies ONLY on a search engine's RESULTS page — exact
  // host AND an allow-listed path (`urlReadings.ts`). The same host's redirectors
  // (`google.com/url?q=https://evil.tld/?d=<real>`) are not a search box.
  const isSearchPage = isSearchResultsPage(u);
  const placeSet = new Set(placeValues.map((v) => v.trim().toLowerCase()));
  const exactPlace = (seg: string): boolean => urlReadings(seg).some((r) => placeSet.has(r.trim()));
  const flags: NavExfilFlag[] = [];
  const CONV = "contient une donnée de la conversation";
  const scan = (key: string, val: string) => {
    if (!val) return;
    // The ONE exemption: a vault value in a real search box, on a real search page — that
    // IS the search the user asked for (rule 11). Narrow on purpose: `?redirect=<real>` or
    // `evil.com/?q=<real>` is exfil. ⚠️ It REMOVES the vault material from the scan, it does
    // not bless the value: the checks re-run on the RESIDUE, or `?q=<real> <blob>` rides out.
    const searchBox = isSearchPage && SEARCH_PARAMS.has(key.toLowerCase());
    const residue = searchBox ? stripVaultValues(val, vaultValues) : val;
    // Conversation/vault data leaving in a URL is the strongest signal — flagged on ANY
    // host, ANY param, in ANY reading (`+`, %-escapes, case). NO place carve-out here: a
    // query value is PAYLOAD — only the PATH scan below treats an exact place as structure.
    if (vaultHitIn(residue, vaultValues)) {
      flags.push({ param: key, value: val, reason: CONV });
      return;
    }
    const enc = looksEncoded(residue);
    if (enc) {
      flags.push({ param: key, value: val, reason: enc });
      return;
    }
    // A merely very long, opaque value is the weakest signal — exempt search-box params
    // ONLY on a real search page. To ANY other URL, a long `q=` is as suspect as any param.
    if (!searchBox && val.length >= BULKY_LEN) {
      flags.push({ param: key, value: val, reason: "valeur très longue" });
    }
  };
  // The URL's CREDENTIALS (`https://<value>@evil.io/`) carry data like any param — and no
  // search box ever lives there. Main refuses such a navigation outright
  // (`isAllowedBrowserUrl`); the scan still names what was in it.
  for (const [key, raw] of [
    ["username", u.username],
    ["password", u.password],
  ] as const) {
    if (raw) scan(key, safeDecode(raw));
  }
  let qTotal = 0;
  let qCount = 0;
  u.searchParams.forEach((val, key) => {
    qTotal += val.length;
    qCount += 1;
    // A param NAME carries data as well as its value (`?<real>=1`): no name is a search
    // box, so a key is scanned for vault data and encoded blobs, never exempted.
    if (vaultHitIn(key, vaultValues)) flags.push({ param: key, value: key, reason: CONV });
    else {
      const enc = looksEncoded(key);
      if (enc) flags.push({ param: key, value: key, reason: enc });
    }
    scan(key, val);
  });
  // Split-exfil: the per-value length rule is dodged by chunking a payload across many
  // tiny params (`?a=x&b=y&c=z…`). Off a search page, flag the CUMULATIVE query volume /
  // param count — a legit navigation carries few short params.
  if (!isSearchPage && (qTotal >= BULKY_LEN || qCount >= 12)) {
    flags.push({
      param: "requête",
      value: `${qCount} paramètre(s), ${qTotal} caractères`,
      reason: "cumul de données volumineux dans l'URL (exfiltration possible)",
    });
  }
  // The fragment carries the same payload as the query (visible to the destination's JS),
  // routinely encoded (`#Louis%20Simon`, `#Louis+Simon`): decoded, then scanned in every reading.
  if (u.hash && u.hash.length > 1) scan("#", safeDecode(u.hash.slice(1)));
  // Exfil can ride the PATH (`/collect/<blob>`, `/c/Jean+Dupont`) or the HOSTNAME
  // (`<vault-value>.attacker.com`). The path gets the vault check in every reading and the
  // encoded check (no bulky-length rule — a long path is normal); the host the vault check.
  const rawPath = u.pathname.replace(/^\/+/, "");
  const decodedPath = safeDecode(rawPath);
  if (decodedPath) {
    // Per-SEGMENT place carve-out: `/France/elections` drops the exact-place segment
    // and scans the REST — an IBAN riding beside a place name still flags.
    const pathResidue = placeSet.size
      ? rawPath.split("/").filter((seg) => !exactPlace(seg)).join("/")
      : rawPath;
    if (vaultHitIn(pathResidue, vaultValues)) {
      flags.push({ param: "chemin", value: decodedPath, reason: CONV });
    } else {
      const enc = looksEncoded(decodedPath);
      if (enc) flags.push({ param: "chemin", value: decodedPath, reason: enc });
    }
  }
  // Case-INSENSITIVE (`new URL()` lower-cases the hostname, names carry capitals).
  if (vaultHitIn(u.hostname, vaultValues)) {
    flags.push({ param: "hôte", value: u.hostname, reason: CONV });
  }
  return { host: u.hostname, suspicious: flags.length > 0, flags };
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // malformed %-escape: scan raw (`looksEncoded` reads that too)
  }
}

/**
 * Scan a tool call's (un-redacted) argument VALUES for conversation-data smuggling —
 * the H-4 exfil shape for NON-navigation tools. The pipeline un-redacts every string
 * arg (fake→REAL) before dispatch, so a prompt-injected model can call a read-classified
 * tool on any connector with real PII crammed into its args and the real data leaves the
 * machine with no confirmation. We distinguish LEGIT use from EXFIL by shape: a standalone
 * field whose value EQUALS a vault entry is the connector's purpose (send to the real
 * recipient, look up the real id) — NOT flagged; a vault value EMBEDDED inside a LARGER
 * string (concatenated with other data), or an encoded blob, is the model hiding
 * conversation secrets in an argument — flagged so the loop surfaces a confirm showing
 * the real values about to leave. Advisory (mirrors {@link analyzeNavExfil}); pure/tested.
 */
export function analyzeArgExfil(args: unknown, vaultValues: string[] = []): NavExfilResult {
  const flags: NavExfilFlag[] = [];
  const visit = (key: string, v: unknown): void => {
    if (typeof v === "string") {
      if (!v) return;
      const enc = looksEncoded(v);
      if (enc) {
        flags.push({ param: key || "arg", value: v, reason: enc });
        return;
      }
      // A PROPER substring match (v is longer than the vault value) = the value is
      // embedded/concatenated → smuggling. An exact-equal field value is legit — and a
      // PATH is a *list* of fields, so it is compared SEGMENT by segment (a folder really
      // IS named after the vaulted company, and the fs connector reported that root
      // itself). A value glued INSIDE a segment still flags.
      const parts = pathSegments(v);
      const hit = parts.some((seg) =>
        vaultValues.some((s) => s.length >= 4 && seg.length > s.length && seg.includes(s)),
      );
      if (hit) flags.push({ param: key || "arg", value: v, reason: "contient une donnée de la conversation" });
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => visit(`${key}[${i}]`, x));
      return;
    }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) visit(key ? `${key}.${k}` : k, x);
    }
  };
  visit("", args);
  return { host: "", suspicious: flags.length > 0, flags };
}
