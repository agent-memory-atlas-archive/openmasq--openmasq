import type { Detection } from "../../types";
import { detectGazetteerNames } from "../../engine/names/nameGazetteer";
import { dropLineNoise } from "./lineContext";
import { detectWithModel } from "../detect";
import { textSkeleton } from "../../textSkeleton";
import { detectDeterministic, fromSkeleton } from "./deterministic";
import { forcedOccurrences } from "./forcedOccurrences";
import { entityKey } from "../../util";
import { redactionCategory } from "../../kinds";
import type { PseudonymizeOptions } from "./options";

/**
 * Phase 1 — gather candidate entities from every source: the model detector (free-form
 * PII, if `complete`), the optional local NER, the regex `RULES` (checksum-gated), the
 * deterministic phone/labeled-field/address/geo detectors, then `forced` + `secrets`.
 * Sorted longest-first so a containing entity wins. `modelError` is set (not thrown) when
 * a detector fails — a coverage downgrade the caller can fail-closed on, never corruption.
 */
export async function gatherCandidates(
  input: string,
  options: PseudonymizeOptions,
): Promise<{ candidates: Detection[]; modelError?: string }> {
  const candidates: Detection[] = [];
  let modelError: string | undefined;
  if (options.complete) {
    candidates.push(
      ...(await detectWithModel(input, options.complete, (err) => {
        modelError = err instanceof Error ? err.message : String(err);
      })),
    );
  }
  options.signal?.throwIfAborted();
  if (options.detectLocal) {
    try {
      candidates.push(...(await options.detectLocal(input)));
    } catch (err) {
      // A detector that stopped because the caller abandoned the pass is not a downgrade.
      options.signal?.throwIfAborted();
      // A thrown local detector (e.g. weights failed to load) is a coverage
      // downgrade, not corruption — record it like a model failure so the caller
      // can fail-closed, and continue with the regex rules.
      modelError = err instanceof Error ? err.message : String(err);
    }
  }
  // The deterministic detectors (`deterministic.ts`), on the input — then on its SKELETON
  // when it wears a disguise (an invisible character, fullwidth or other-script digits, NFD
  // accents): those detections come back as the ORIGINAL slices they cover.
  const { candidates: found, labeled } = detectDeterministic(input, options);
  candidates.push(...found);
  const sk = textSkeleton(input);
  if (sk) candidates.push(...fromSkeleton(detectDeterministic(sk.text, options).candidates, sk, input, candidates));
  // User-forced spans (composer "Redact" → chosen type). Pushed BEFORE `secrets`
  // so a value that's also in `secrets` keeps its CHOSEN category (longest-first is
  // stable). Marked `forced` → bypasses the FP-prevention gates below.
  for (const f of options.forced ?? []) {
    const v = f.value.trim();
    if (!v) continue;
    // Case-INSENSITIVE (audit): a Coffre/forced value the user added as "Nightingale" must
    // also mask "nightingale"/"NIGHTINGALE" in the text — an exact-case `input.includes(v)`
    // shipped the user's EXPLICIT always-redact value in CLEAR when it appeared in another
    // casing. Expand to every standalone occurrence via the SAME machinery detected entities
    // use, so the allocator keeps the casings ONE identity (one fake).
    for (const actual of forcedOccurrences(input, v, sk)) {
      candidates.push({ value: actual, category: f.category, forced: true });
    }
  }
  for (const s of options.secrets ?? []) {
    const v = s.trim();
    if (v.length >= 4 && input.includes(v)) {
      candidates.push({ value: v, category: "SECRET" });
    }
  }
  // Prose names with no honorific and no label — the first-name gazetteer's pairing
  // rule (never a lone first name) is what makes a 15k-name lexicon safe to run.
  // LAST, and on UNCLAIMED spans only: the gazetteer is a recall net for names nothing
  // else could see. When any other source — the NER's ORG, a labeled field, the user's
  // `forced` — already claims the same entity under ANY category, a second NAME-typed
  // candidate for it would SPLIT the entity into two vault identities (« Karl Studio »
  // the company must never also become a person named Karl).
  const gazetteer = detectGazetteerNames(input);
  if (sk) gazetteer.push(...fromSkeleton(detectGazetteerNames(sk.text), sk, input, gazetteer));
  const claimed = new Set(candidates.map((c) => entityKey(c.value)));
  candidates.push(...gazetteer.filter((d) => !claimed.has(entityKey(d.value))));
  // CORROBORATION clears the doubt: `uncertain` means « seen by the one probabilistic
  // source, on weak signals ». If ANY other source — a rule, a labeled field, the
  // gazetteer's pairing (its SUPPRESSED duplicates vote too: not pushed ≠ not seen),
  // the user's `forced` — claims the same entity, the span is no longer single-source
  // and the « à vérifier » flag comes off. Never the reverse: doubt is never ADDED
  // here, and the flag never gates redaction (fail closed).
  // A PERSON LABEL CONSTRAINS THE TYPE — it doesn't just trigger.
  //
  // Measured on 16/08/2026 with the local NER IN THE loop (what the 15/08 field
  // observation asked for and couldn't do): on an ISOLATED line,
  // « Salarié: Gwendal Kervoal » came out as « Salarié: Aix-en-Provence » — the employee turned
  // into a CITY — and « Soizic Quéméner » a COMPANY. Breton names whose second
  // word is also a commune: the NER decides on shape, the label knew.
  // (The three lines in ONE SAME text already converge; the app was seeing two types because
  // the lines fell into different chunks.)
  //
  // ⚠️ BOUNDED TO GEO, and that's the guardrail the field observation called for ("the
  // constraint must not overwrite a genuine company case in a badly named column"): a
  // person is NEVER a place, so that direction of correction is risk-free; whereas
  // a « Contact : Acme SARL » is a REAL organization, and keeps its type.
  const GEO_MISTYPE = new Set(["city", "location", "address", "postal_code"]);
  const namedByLabel = new Set(
    labeled.filter((d) => d.category === "NAME").map((d) => entityKey(d.value)),
  );
  if (namedByLabel.size) {
    for (const c of candidates) {
      if (c.category === "NAME" || !namedByLabel.has(entityKey(c.value))) continue;
      if (GEO_MISTYPE.has(redactionCategory(c.category))) c.category = "NAME";
    }
  }
  const corroborated = new Set<string>();
  for (const c of candidates) if (!c.uncertain) corroborated.add(entityKey(c.value));
  for (const d of gazetteer) corroborated.add(entityKey(d.value));
  for (const c of candidates) if (c.uncertain && corroborated.has(entityKey(c.value))) delete c.uncertain;
  // A heading is not an organisation, a SWIFT field is not a key (`lineContext.ts`).
  const kept = dropLineNoise(candidates, input);
  kept.sort((a, b) => b.value.length - a.value.length);
  return { candidates: kept, modelError };
}
