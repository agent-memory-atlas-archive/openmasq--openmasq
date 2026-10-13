import { describe, expect, it } from "vitest";
import { applyVaultVariants, pseudonymize, unredact } from "../../index";
import { forwardExclusions } from "./exclusions";
import { isKept, keepSet } from "../../util";

const detects = (...vals: { value: string; category: string }[]) => async () => JSON.stringify(vals);

/**
 * One real value keeps ONE fake whatever accents, NFD or spacing it comes back with, and a
 * known value is masked in those spellings even when no detector names it again.
 */
describe("accent / NFD variants of a known person", () => {
  it("« helene cortes » reuses the identity of « Hélène Cortes » — no second fake", async () => {
    const vault: Record<string, string> = {};
    const first = await pseudonymize("Contrat signé par Hélène Cortes", {
      vault,
      complete: detects({ value: "Hélène Cortes", category: "NAME" }),
    });
    const fake = Object.keys(vault).find((k) => vault[k] === "Hélène Cortes")!;
    expect(first.text).toContain(fake);
    const second = await pseudonymize("helene cortes a rappelé", {
      vault,
      complete: detects({ value: "helene cortes", category: "NAME" }),
    });
    expect(second.modelError).toBeUndefined();
    expect(second.text).not.toContain("cortes");
    expect(second.text.toLowerCase()).toContain(fake.toLowerCase());
  });

  it("a later text spelling it without accents or in NFD is masked with no detector at all", async () => {
    const vault: Record<string, string> = {};
    await pseudonymize("Contrat signé par Hélène Cortes", {
      vault,
      complete: detects({ value: "Hélène Cortes", category: "NAME" }),
    });
    for (const text of ["Puis helene cortes est partie", "Puis Hélène Cortes est partie"]) {
      const r = await pseudonymize(text, { vault, complete: detects() });
      expect(r.text).not.toMatch(/cortes/i);
      expect(unredact(r.text, vault)).toContain("Hélène Cortes");
    }
  });
});

describe("digit-bearing values vary by their spaces only", () => {
  const vault = { "XY98 7654 ZW": "AB12 3456 CD" };
  it("glued, NBSP-spaced and lowercase spellings map to the same fake", () => {
    expect(applyVaultVariants("ref AB123456CD", vault)).toBe("ref XY98 7654 ZW");
    expect(applyVaultVariants("ref AB12 3456 CD", vault)).toBe("ref XY98 7654 ZW");
    expect(applyVaultVariants("ref ab12 3456 cd", vault)).toBe("ref XY98 7654 ZW");
  });
  it("a dot or a hyphen stays part of the shape (an IP in a hostname is not rewritten)", () => {
    expect(applyVaultVariants("ip-192-168-1-10.internal", { "10.0.3.7": "192.168.1.10" })).toBe(
      "ip-192-168-1-10.internal",
    );
  });
});

describe("keep never releases an org-MANDATED category", () => {
  const vault = { "Oslen Group": "Stripe", Kelby: "Acme" };
  const kindOf = new Map([
    ["Stripe", "ORG"],
    ["Acme", "ORG"],
  ]);
  it("a kept value of a mandated category stays substituted", () => {
    const exclude = forwardExclusions(vault, {
      keep: keepSet(["Stripe"]),
      isKept,
      kindOf,
      unrevealable: new Set(["company"]),
    });
    expect(exclude.has("Oslen Group")).toBe(false);
  });
  it("without a mandate, keep still releases it (tool routing)", () => {
    const exclude = forwardExclusions(vault, { keep: keepSet(["Stripe"]), isKept, kindOf });
    expect(exclude.has("Oslen Group")).toBe(true);
  });
  it("end to end: a vaulted mandated company named in `keep` does not leave in clear", async () => {
    const v: Record<string, string> = {};
    await pseudonymize("Contrat avec Karl Studio", { vault: v, complete: detects({ value: "Karl Studio", category: "ORG" }) });
    const r = await pseudonymize("Suite du contrat avec Karl Studio", {
      vault: v,
      keep: ["Karl Studio"],
      unrevealableCategories: ["company"],
      kinds: { "Karl Studio": "ORG" },
      complete: detects(),
    });
    expect(r.text).not.toContain("Karl Studio");
  });
});
