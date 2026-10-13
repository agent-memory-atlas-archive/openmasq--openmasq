import { describe, expect, it } from "vitest";
import { detectLabeledFields, pseudonymize, unredact } from "../../index";
import { buildFakeName } from "./name";

/**
 * A NAME is made of words. A span typed NAME that holds an e-mail or a digit-bearing token
 * never ships that token verbatim inside its fake, and a labelled value that STARTS with one
 * holds no name at all.
 */
describe("a labelled NAME value that starts with an e-mail is not a name", () => {
  it("« Contact: jean.dupont@acme.fr merci » yields no NAME — the EMAIL detector claims it", () => {
    const names = detectLabeledFields("Contact: jean.dupont@acme.fr merci").filter((d) => d.category === "NAME");
    expect(names).toEqual([]);
  });

  it("end to end: the address is faked as an e-mail, nothing of it leaves", async () => {
    const text = "Contact: jean.dupont@acme.fr merci";
    const vault: Record<string, string> = {};
    const r = await pseudonymize(text, { vault });
    expect(r.text).not.toMatch(/dupont|acme/);
    expect(r.text).toContain(" merci");
    expect(r.matches.map((m) => m.category)).toEqual(["EMAIL"]);
    expect(unredact(r.text, vault)).toBe(text);
  });

  it("a NAME value cut at a token carrying a digit keeps the name before it", () => {
    const names = detectLabeledFields("Nom : Jean Dupont 2B rue").filter((d) => d.category === "NAME");
    expect(names.map((d) => d.value)).toEqual(["Jean Dupont"]);
  });
});

describe("buildFakeName — a non-word token carrying letters is redrawn, never copied", () => {
  const fake = (real: string) => buildFakeName(real, 0, () => undefined, () => false, 0);
  it("an e-mail-shaped token inside a NAME span", () => {
    const out = fake("jean.dupont@acme.fr");
    expect(out).not.toMatch(/dupont|acme/);
  });
  it("a letter+digit token", () => {
    expect(fake("Jean Dupont2")).not.toContain("Dupont2");
  });
  it("a bare number and a particle stay as they are", () => {
    expect(fake("Promo 2024")).toContain("2024");
    expect(fake("Maria y Gonzalez")).toContain(" y ");
  });
});
