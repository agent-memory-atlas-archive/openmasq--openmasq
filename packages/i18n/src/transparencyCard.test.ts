import { describe, expect, it } from "vitest";
import { getMessages } from "./locale";

/** The card's title counts the values; its body must agree with that count. */
describe("carte de transparence — accord en nombre", () => {
  const fr = getMessages("fr").cards.transparency;
  const en = getMessages("en").cards.transparency;

  it("parle d'UNE valeur quand un seul élément est masqué", () => {
    expect(fr.title(1)).toBe("1 élément masqué dans cet échange");
    const desc = fr.desc("Llama 3.3 (local)", 1);
    expect(desc).toContain("n'a jamais reçu cette valeur. Elle a été remplacée");
    expect(desc).toContain("puis rétablie dans la réponse");
    expect(desc).not.toMatch(/ces valeurs|Elles|rétablies/);
    expect(en.desc("Llama", 1)).toContain("never received this value. It was replaced");
    expect(en.desc("Llama", 1)).not.toMatch(/these values|They/);
  });

  it("reste au pluriel au-delà d'un", () => {
    expect(fr.desc("Le modèle", 3)).toContain("ces valeurs. Elles ont été remplacées");
    expect(fr.desc("Le modèle", 3)).toContain("rétablies");
    expect(en.desc("The model", 3)).toContain("these values. They were replaced");
  });

  it("dit « valeur de substitution », jamais le nom nu « substitut »", () => {
    for (const n of [1, 2]) expect(fr.desc("X", n)).not.toMatch(/\bsubstituts?\b/);
  });
});
