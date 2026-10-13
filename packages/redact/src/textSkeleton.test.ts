import { describe, expect, it } from "vitest";
import { caseInsensitiveOccurrences } from "./model/detect";
import { pseudonymize, redact, unredact } from "./index";
import { originalSlice, textSkeleton } from "./textSkeleton";

/**
 * A value DISGUISED by an invisible character, a fullwidth or other-script digit, or NFD
 * accents is detected as if it were written plainly — and what is substituted is the
 * ORIGINAL slice, so the text still restores byte for byte.
 */
describe("textSkeleton", () => {
  it("is null for an ordinary text, accents and NBSP included", () => {
    expect(textSkeleton("Hélène Cortès, 12 rue de Paris")).toBeNull();
  });

  it("drops ignorables, maps fullwidth and other-script digits, composes NFD — and maps back", () => {
    const input = "a​b ０１ ٠٦ Hé";
    const sk = textSkeleton(input)!;
    expect(sk.text).toBe("ab 01 06 Hé");
    const at = sk.text.indexOf("ab");
    expect(originalSlice(sk, input, at, at + 2)).toBe("a​b");
    const he = sk.text.indexOf("Hé");
    expect(originalSlice(sk, input, he, he + 2)).toBe("Hé");
  });
});

describe("pseudonymize — a disguised value is still masked, and restores exactly", () => {
  const cases: [string, string, string][] = [
    ["zero-width space inside an e-mail", "mail jean​.dupont@acme.fr merci", "dupont"],
    ["zero-width space inside a card", "carte 4539​1488 0343 6467", "0343 6467"],
    ["soft hyphen inside a key", "clé AKIA­IOSFODNN7EXAMPLE", "IOSFODNN7EXAMPLE"],
    ["fullwidth digits", "tel ０６１２３４５６７８", "１２３４５６７８"],
    ["Arabic-Indic digits", "tel ٠٦١٢٣٤٥٦٧٨", "١٢٣٤٥٦٧٨"],
    ["fullwidth at sign", "mail jean.dupont＠acme.fr", "acme"],
  ];
  for (const [label, text, real] of cases) {
    it(label, async () => {
      const vault: Record<string, string> = {};
      const r = await pseudonymize(text, { vault });
      expect(r.modelError).toBeUndefined();
      expect(r.text).not.toContain(real);
      expect(unredact(r.text, vault)).toBe(text);
    });
  }
});

describe("redact (marker mode) — the same disguises", () => {
  it("masks the whole disguised value, not only its plain tail", () => {
    expect(redact("mail jean​.dupont@acme.fr merci").text).toBe("mail [REDACTED_EMAIL_1] merci");
    expect(redact("carte 4539​1488 0343 6467").text).toBe("carte [REDACTED_CARD_1]");
    expect(redact("tel ０６１２３４５６７８").text).toBe("tel [REDACTED_PHONE_1]");
  });
});

describe("forced (Coffre) values — every way the text writes them", () => {
  const spellings: [string, string][] = [
    ["NBSP", "Contrat de Jean Dupont"],
    ["double space", "Contrat de JEAN  DUPONT"],
    ["line break", "Contrat de Jean\nDupont"],
    ["dotted", "Contrat de jean.dupont"],
    ["zero-width space", "Contrat de Jean​ Dupont"],
  ];
  for (const [label, text] of spellings) {
    it(label, async () => {
      const vault: Record<string, string> = {};
      const r = await pseudonymize(text, { vault, forced: [{ value: "Jean Dupont", category: "NAME" }] });
      expect(r.text.toLowerCase()).not.toContain("dupont");
      expect(unredact(r.text, vault)).toBe(text);
    });
  }

  it("NFD accents in the text, NFC in the Coffre", async () => {
    const text = "Contrat de Hélène Cortes";
    const vault: Record<string, string> = {};
    const r = await pseudonymize(text, { vault, forced: [{ value: "Hélène Cortes", category: "NAME" }] });
    expect(r.text).not.toContain("Cortes");
    expect(unredact(r.text, vault)).toBe(text);
  });
});

describe("caseInsensitiveOccurrences — one length-changing character does not disable it", () => {
  it("still finds another casing in a text holding « İ »", () => {
    expect(caseInsensitiveOccurrences("İstanbul, NIGHTINGALE", "Nightingale")).toEqual(["NIGHTINGALE"]);
  });
});
