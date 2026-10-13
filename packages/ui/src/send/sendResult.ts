import { subscriptionCliOfProvider, type ProviderId } from "@openmasq/llm";
import type { TrackEvent } from "../analytics/events";
import type { ModelAccess } from "../state/auth/modelAccess";
import type { UnavailableReason } from "./modelAvailability";

/**
 * How a send ENDED, once per turn (`send_result`). `send_message` fires before anything
 * is known and `send_error` only on a failure, so neither says whether sending WORKS for
 * someone: this event is the denominator and the verdict together, per access road.
 *
 * `refused` = a gate stopped the turn before the model (no key, CLI missing or signed
 * out, fail-closed redaction…), named by `refusal`; `stopped` = the person stopped it
 * before anything reached the model, or mid agentic turn; `incomplete` = a reply that
 * ended cut or empty (a Stop during a plain stream lands here too).
 */
export type SendOutcome = "ok" | "incomplete" | "error" | "refused" | "stopped";
export type SendRefusal = UnavailableReason | "suspended" | "org_blocked" | "platform_token" | "redaction";

/** What the turn ended on: written by the phase that resolves the bubble, read once at the end. */
export interface SendResult {
  outcome: SendOutcome | null;
  refusal?: SendRefusal;
}

/** The road this send took. A CLI and a local endpoint are roads of their own; a keyed
 *  provider is the platform's only when the turn is proxied through its gateway. */
export function sendAccess(provider: ProviderId, effectivePlatform: boolean): Exclude<ModelAccess, "none"> {
  if (subscriptionCliOfProvider(provider)) return "agent";
  if (provider === "openai-compat") return "local";
  return effectivePlatform ? "platform" : "key";
}

/** The outcome a bubble patch states, or `null` when it does not resolve the turn. */
export function outcomeOfPatch(patch: { pending?: boolean; error?: boolean; incomplete?: boolean }): SendOutcome | null {
  if (patch.pending !== false) return null;
  return patch.error ? "error" : patch.incomplete ? "incomplete" : "ok";
}

/** Records a resolving patch. A refusal or a Stop is FINAL: a later patch of the same
 *  bubble (the refusal's own, a usage stamp) never turns it into a failure or a success. */
export function noteOutcome(result: SendResult, outcome: SendOutcome | null): void {
  if (!outcome || result.outcome === "refused" || result.outcome === "stopped") return;
  result.outcome = outcome;
}

/** The `send_result` event. A turn that unwound without resolving its bubble is an error. */
export function buildSendResultEvent(i: {
  provider: ProviderId;
  model: string;
  effectivePlatform: boolean;
  result: SendResult;
}): TrackEvent {
  return {
    name: "send_result",
    provider: i.provider,
    model: i.model,
    access: sendAccess(i.provider, i.effectivePlatform),
    outcome: i.result.outcome ?? "error",
    ...(i.result.outcome === "refused" && i.result.refusal ? { refusal: i.result.refusal } : {}),
  };
}
