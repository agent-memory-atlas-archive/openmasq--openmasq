import { providerCreditsExhausted, rateLimitInfo } from "@openmasq/llm";
import type { SendRefusal } from "../../send/sendResult";
import type { Message } from "../../types";

export type TurnFailureKind = NonNullable<Message["errorKind"]>;

/**
 * The CLASS of a failed turn, read from the error's CODES (gateway `CREDITS_EXHAUSTED`, the
 * provider's own « no credits » parse, a DAILY 429) at failure time and persisted on the
 * bubble (`Message.errorKind`). The card's eyebrow reads it — never the translated sentence,
 * which a copy edit or the other language would silently flip.
 */
export function failureKindOf(raw: string): TurnFailureKind | undefined {
  const m = raw || "";
  if (/CREDITS_EXHAUSTED/.test(m) || providerCreditsExhausted(m)) return "blocked";
  if ((/\b429\b/.test(m) || /rate[\s_-]?limit/i.test(m)) && rateLimitInfo(m).daily) return "quota";
  return undefined;
}

/** The same class for a send refused BEFORE any call (`send/preflight.ts`). */
export function refusalFailureKind(code: SendRefusal | undefined): TurnFailureKind | undefined {
  return code === "no_credits" ? "blocked" : undefined;
}
