// The DETERMINISTIC detectors of phase 1 (rules + shape detectors), run on one text — the
// input itself, and its SKELETON when it wears a disguise (`../../textSkeleton.ts`), whose
// detections are mapped back to the ORIGINAL slices they cover.
import type { Detection } from "../../types";
import { LABELS, RULES } from "../../engine/rules";
import { datesEnabled } from "../../engine/redact";
import { longestValidPrefix } from "../../engine/validators";
import { detectPhones } from "../../engine/phones";
import { detectSelfHandles, detectLabeledFields, detectAccountNumbers, detectFiscalNumbers, detectContractNumbers, detectLabeledCodes } from "../../engine/labels";
import { detectIdentityDocFields, detectBirthDates, detectHonorificNames, detectTeamRoster } from "../../engine/persons";
import { detectAddresses } from "../../engine/addresses";
import { detectOrgContext } from "../../engine/orgContext";
import { detectAddressComplements } from "../../engine/addresses/complement";
import { detectLabelBlocks } from "../../engine/labels/blocks";
import { detectFrGeo } from "../../engine/geo/frGeo";
import { detectUsGeo } from "../../engine/geo/usGeo";
import { detectCjkGeo } from "../../engine/geo/cjkGeo";
import { detectCsvBlocks } from "../../engine/labels/csv";
import { positionsOf } from "../../positions";
import { originalSlice, type Skeleton } from "../../textSkeleton";
import type { PseudonymizeOptions } from "./options";

export function detectDeterministic(
  text: string,
  options: PseudonymizeOptions,
): { candidates: Detection[]; labeled: Detection[] } {
  const candidates: Detection[] = [];
  // The `date` category is the one OPT-IN rule of the table: it runs only for a caller
  // that names its categories (`disabledKinds` given) and leaves `date` on — the app at
  // the Strict level, the proxy — never for a bare call, whose consumers were promised
  // that plain dates stay untouched. `datesEnabled` (`../../engine/redact.ts`) is the one
  // predicate, shared with the marker mode.
  const datesOn = datesEnabled(options.disabledKinds);
  // A birth date matches BOTH `DOB_RULE` and `DATE_RULE` (same core); the birth rule comes
  // first in `RULES`, and its value must keep its category and its fake — the date rule
  // skips what a dob rule already claimed.
  const dobValues = new Set<string>();
  for (const rule of RULES) {
    if (rule.type === "date" && !datesOn) continue;
    // Same keyword presence-probe as `engine/redact.ts` — a gated rule with no
    // keyword in the text never runs its per-digit lookbehind.
    const probe = (rule.pattern as { probe?: RegExp }).probe;
    if (probe && !probe.test(text)) continue;
    for (const m of text.matchAll(rule.pattern)) {
      // Honour the rule's checksum/range gate (card Luhn, IBAN mod-97, NHS/PESEL/…
      // mod-11, GPS range) — exactly like `redact()`. Without this, `pseudonymize`
      // faked ANY shape-matching number regardless of its checksum, so a bare
      // 10-digit Unix timestamp that coincidentally passed (or a checksum-FAILING
      // card/id) got redacted → corrupted data the model then reasoned on.
      let value = m[0];
      if (rule.validate && !rule.validate(value)) {
        // A greedy validated match (IBAN) may have swallowed a trailing token
        // (`… 606 BIC BNPAFRPPXXX`) → invalid; recover the valid inner value.
        const trimmed = longestValidPrefix(value, rule.validate);
        if (!trimmed) continue;
        value = trimmed;
      }
      if (rule.type === "dob") dobValues.add(value);
      else if (rule.type === "date" && dobValues.has(value)) continue;
      candidates.push({ value, category: LABELS[rule.type] });
    }
  }
  // Deterministic, language-agnostic detectors that complement the regex rules
  // AND the (optional) model/local detectors: validated international phones
  // (libphonenumber) + values of sensitive `label : value` form fields.
  for (const p of detectPhones(text)) candidates.push({ value: p.value, category: "PHONE" });
  const labeled = detectLabeledFields(text);
  candidates.push(...labeled);
  // A CSV pasted as text: each cell typed by its column header (`csvText.ts`).
  candidates.push(...detectCsvBlocks(text));
  // The prose form of the same field (« mon pseudo est … ») — see `contextFields.ts`.
  candidates.push(...detectSelfHandles(text));
  candidates.push(...detectAccountNumbers(text));
  candidates.push(...detectFiscalNumbers(text));
  candidates.push(...detectContractNumbers(text));
  candidates.push(...detectLabeledCodes(text));
  candidates.push(...detectIdentityDocFields(text));
  candidates.push(...detectHonorificNames(text));
  candidates.push(...detectOrgContext(text));
  // Team-roster lists (bare first names above role lines) — the NER's blind spot.
  candidates.push(...detectTeamRoster(text));
  candidates.push(...detectLabelBlocks(text));
  // The address, then what precedes it on the same line (« Résidence X, appartement Y »):
  // the complement anchors on the address, it detects nothing on its own.
  const addresses = detectAddresses(text);
  candidates.push(...addresses, ...detectAddressComplements(text, addresses));
  candidates.push(...detectBirthDates(text));
  candidates.push(...detectFrGeo(text));
  candidates.push(...detectUsGeo(text));
  candidates.push(...detectCjkGeo(text));
  return { candidates, labeled };
}

/**
 * Detections made on the SKELETON, as ORIGINAL slices: every occurrence of each value in the
 * skeleton becomes the input characters it stands for (an invisible character inside, a
 * fullwidth digit, an NFD accent — verbatim). A slice the input-side pass already holds
 * under the same category is not repeated.
 */
export function fromSkeleton(dets: Detection[], sk: Skeleton, input: string, known: Detection[]): Detection[] {
  const seen = new Set(known.map((d) => `${d.category}::${d.value}`));
  const out: Detection[] = [];
  const at = new Map<string, number[]>();
  for (const d of dets) {
    if (!d.value) continue;
    let hits = at.get(d.value);
    if (!hits) at.set(d.value, (hits = [...positionsOf(sk.text, d.value)]));
    for (const a of hits) {
      const value = originalSlice(sk, input, a, a + d.value.length);
      const key = `${d.category}::${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...d, value, ...(d.start !== undefined ? { start: sk.start[a] } : {}) });
    }
  }
  return out;
}
