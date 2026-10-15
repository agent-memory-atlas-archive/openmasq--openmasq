import { describe, expect, it } from "vitest";
import { failureKindOf, refusalFailureKind } from "./failureKind";

describe("failureKindOf — la classe d'un échec vient de son CODE", () => {
  it("crédits : le code de la passerelle et le « plus de crédits » du fournisseur", () => {
    expect(failureKindOf('{"error":"CREDITS_EXHAUSTED"}')).toBe("blocked");
  });
  it("quota : un 429 QUOTIDIEN, pas une rafale", () => {
    const daily =
      'openrouter request failed (429): {"error":{"message":"Rate limit exceeded: free-models-per-day","metadata":{"limit_source":"openrouter_free_tier_daily"}}}';
    expect(failureKindOf(daily)).toBe("quota");
    expect(failureKindOf("request failed (429): slow down")).toBeUndefined();
  });
  it("rien de reconnu ⇒ absent (la CTA décide)", () => {
    expect(failureKindOf("boom")).toBeUndefined();
    expect(refusalFailureKind("no_credits")).toBe("blocked");
    expect(refusalFailureKind("no_key")).toBeUndefined();
  });
});
