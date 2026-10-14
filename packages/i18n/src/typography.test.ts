import { describe, expect, it } from "vitest";
import { frenchSpacing, withFrenchSpacing } from "./typography";
import { getMessages } from "./locale";

describe("French typography", () => {
  it("binds the space before : ; ? ! and inside guillemets", () => {
    expect(frenchSpacing("Envoi bloqué : rien n'est parti ; réessayez ? Oui !")).toBe(
      "Envoi bloqué : rien n'est parti ; réessayez ? Oui !",
    );
    expect(frenchSpacing("le bouton « Ajouter »")).toBe("le bouton « Ajouter »");
  });

  it("leaves what has no regular space alone", () => {
    for (const s of ["https://exemple.fr", "IPv6 (formes compressées :: comprises)", "Réglages → Modèles", "3:1"]) {
      expect(frenchSpacing(s)).toBe(s);
    }
  });

  it("reaches strings returned by functions, arrays and nested slices", () => {
    const set = withFrenchSpacing({ a: (n: number) => `${n} valeurs : ok`, b: ["Prêt ?"], c: { d: "x !" } });
    expect(set.a(2)).toBe("2 valeurs : ok");
    expect(set.b[0]).toBe("Prêt ?");
    expect(set.c.d).toBe("x !");
  });

  it("is applied to the French catalogue, and only to it", () => {
    expect(getMessages("fr").onboarding.access.required).not.toMatch(/ :/);
    expect(getMessages("fr").onboarding.access.required).toContain(" :");
    expect(getMessages("en").onboarding.access.required).not.toContain(" ");
  });
});
