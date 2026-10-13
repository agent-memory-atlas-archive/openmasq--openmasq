import { describe, expect, it } from "vitest";
import { applyVault, unredact } from ".";
import { pseudonymize } from "../../index";
import { reconcileMatches, RESIDUAL_ERROR } from "../../model/pseudonymize/postcondition";
import { isStructuredValue } from "./glue";

/**
 * A STRUCTURED value (phone, IBAN, card, id, key) is substituted even when a LETTER is glued
 * to it, and a value reported as redacted is never left in the text that leaves.
 */
describe("applyVault — a letter glued to a structured value does not spare it", () => {
  it("substitutes a phone glued between words", () => {
    const vault = { "0687786474": "0612345678" };
    expect(applyVault("Tél0612345678Fax", vault)).toBe("Tél0687786474Fax");
  });

  it("still spares a short word-like value inside a word (« us » in « plus »)", () => {
    expect(applyVault("plus de us", { XX: "us" })).toBe("plus de XX");
  });

  it("still spares a structured value continuing a longer DIGIT run (another number)", () => {
    expect(applyVault("ref 9912345678", { "11111111": "12345678" })).toBe("ref 9912345678");
  });

  it("a number token keeps the plain glue guard (« 150000EUR » is a reference)", () => {
    expect(applyVault("150000EUR et 150000", { n1: "150000" })).toBe("150000EUR et n1");
  });

  it("isStructuredValue: 6+ characters carrying a digit", () => {
    expect(isStructuredValue("0612345678")).toBe(true);
    expect(isStructuredValue("A1")).toBe(false);
    expect(isStructuredValue("Dupont")).toBe(false);
  });
});

describe("pseudonymize — glued structured values leave masked and reversible", () => {
  const cases: [string, string[]][] = [
    ["Tél0612345678Fax0145678901", ["0612345678", "0145678901"]],
    ["IBAN FR7630006000011234567890189é", ["FR7630006000011234567890189"]],
    ["clé AKIAIOSFODNN7EXAMPLEé", ["AKIAIOSFODNN7EXAMPLE"]],
  ];
  for (const [text, reals] of cases) {
    it(`« ${text} »`, async () => {
      const vault: Record<string, string> = {};
      const r = await pseudonymize(text, { vault });
      expect(r.modelError).toBeUndefined();
      for (const real of reals) expect(r.text).not.toContain(real);
      expect(unredact(r.text, vault)).toBe(text);
    });
  }
});

describe("postcondition — a reported structured value still in the text fails CLOSED", () => {
  const match = { type: "secret" as const, value: "0612345678", placeholder: "0687786474", category: "PHONE" };
  const base = { vault: { "0687786474": "0612345678" }, exclude: new Set<string>(), uncertainKeys: new Set<string>(), structured: isStructuredValue };

  it("refuses when the value is still on the wire", () => {
    const r = reconcileMatches([match], { ...base, text: "Tél0612345678Fax" });
    expect(r.error).toBe(RESIDUAL_ERROR);
  });

  it("accepts the substituted text", () => {
    expect(reconcileMatches([match], { ...base, text: "Tél0687786474Fax" }).error).toBeUndefined();
  });

  it("spares an occurrence continuing a longer digit run, and one the URL guard keeps", () => {
    expect(reconcileMatches([match], { ...base, text: "0687786474 et 990612345678" }).error).toBeUndefined();
    const urlGuard = (start: number) => start === 4;
    expect(reconcileMatches([match], { ...base, text: "url 0612345678", urlGuard }).error).toBeUndefined();
  });

  it("spares an occurrence inside a value left in clear on purpose (category off)", () => {
    const vault = { ...base.vault, "[REDACTED_IBAN_1]": "FR76 0612345678 00" };
    const exclude = new Set(["[REDACTED_IBAN_1]"]);
    const r = reconcileMatches([match], { ...base, vault, exclude, text: "0687786474 / FR76 0612345678 00" });
    expect(r.error).toBeUndefined();
  });
});
