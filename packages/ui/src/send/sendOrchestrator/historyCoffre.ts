import { pseudonymize, type Vault } from "@openmasq/redact";
import type { Message } from "../../types";
import { deriveRedactedSpans } from "../sendAnalytics";
import type { SendEngineContext } from "../redactionOptions";

type ForcedItem = { value: string; category: string };

/** Every distinct surface (casing) of `value` in `texts` — `applyVault` is exact-case, so
 *  each casing needs its own vault entry before the replay can substitute it. */
function surfaces(value: string, texts: string[]): string[] {
  const re = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const out = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(re)) out.add(m[0]);
  return [...out];
}

/**
 * The Coffre holds for the WHOLE replayed history, every send: past turns go back to the
 * model by vault REPLAY only, so a Coffre term the vault does not cover yet (added after
 * those turns were sent, or never typed in the current message) would ride the history in
 * clear. Each such term found in a past text is vaulted here — through the send's own engine
 * context, so `keep` still wins and the conversation's seed and mode apply — before the
 * history is wired. Returns the new value→kind pairs (empty when nothing was missing).
 * A throw propagates: the caller fails the send closed.
 */
export async function vaultCoffreForHistory(
  past: Message[],
  vault: Vault,
  forced: readonly ForcedItem[],
  engine: SendEngineContext,
): Promise<Record<string, string>> {
  const kinds: Record<string, string> = {};
  if (!forced.length) return kinds;
  const texts = past.map((m) => m.modelContent ?? m.content).filter((t): t is string => !!t);
  if (!texts.length) return kinds;
  const vaulted = new Set(Object.values(vault));
  for (const term of forced) {
    const missing = surfaces(term.value.trim(), texts).filter((s) => !vaulted.has(s));
    if (!missing.length) continue;
    const r = await pseudonymize(missing.join("\n"), { ...engine, vault, forced: [term], numbers: false });
    for (const sp of deriveRedactedSpans(r.matches)) kinds[sp.value] = sp.kind;
    for (const s of missing) vaulted.add(s);
  }
  return kinds;
}
