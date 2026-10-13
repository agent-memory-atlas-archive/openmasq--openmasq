import { describe, expect, it } from "vitest";
import { unredact } from ".";

/**
 * Two fakes differing only by their separators that restore to two DIFFERENT reals make the
 * separator-tolerant restore ambiguous: a third spelling is never resolved to one of them.
 */
describe("unredact — an ambiguous collapsed key restores nothing", () => {
  const vault = { "Jean-Basile": "Marc Lefort", "Jean Basile": "Paul Vidal" };

  it("each exact key still restores its own real value", () => {
    expect(unredact("Jean-Basile et Jean Basile", vault)).toBe("Marc Lefort et Paul Vidal");
  });

  it("a third spelling (« Jean_Basile ») is left as is, never handed another person's value", () => {
    const out = unredact("dossier Jean_Basile", vault);
    expect(out).not.toContain("Marc Lefort");
    expect(out).not.toContain("Paul Vidal");
  });

  it("two separator spellings of ONE identity stay restorable", () => {
    const same = { "Jean-Basile": "Jean-Pierre", "Jean Basile": "Jean Pierre" };
    expect(unredact("dossier Jean_Basile", same)).toMatch(/Jean[ -]Pierre/);
  });
});
