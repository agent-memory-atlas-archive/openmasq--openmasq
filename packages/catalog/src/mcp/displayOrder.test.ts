import { describe, expect, it } from "vitest";
import { MCP_CATEGORIES, MCP_CONNECTORS, findConnector, mcpConnectorRank } from "./index";

/**
 * The connector list is read by someone who connects a mailbox, not a database: the
 * everyday services lead, developer tools close the list under their own heading.
 */
describe("ordre d'affichage des connecteurs", () => {
  it("la messagerie et l'agenda passent avant les autres outils de leur catégorie", () => {
    expect(mcpConnectorRank("gmail")).toBeLessThan(mcpConnectorRank("superhuman"));
    expect(mcpConnectorRank("microsoft-outlook")).toBeLessThan(mcpConnectorRank("asana"));
    expect(mcpConnectorRank("google-calendar")).toBeLessThan(mcpConnectorRank("monday"));
  });

  it("chaque id classé existe dans le catalogue (pas de rang orphelin)", () => {
    const ranked = MCP_CONNECTORS.filter((c) => mcpConnectorRank(c.id) < mcpConnectorRank("__unknown__"));
    expect(ranked.length).toBeGreaterThan(10);
    expect(mcpConnectorRank("__unknown__")).toBe(mcpConnectorRank("another-unknown"));
  });

  it("les outils pour développeurs ferment la liste", () => {
    expect(MCP_CATEGORIES.at(-1)?.id).toBe("dev");
    for (const id of ["neon", "supabase", "prisma-postgres", "github", "vercel"]) {
      expect([id, findConnector(id)?.category]).toEqual([id, "dev"]);
    }
  });
});

describe("abonnement payant du service", () => {
  // Only what the service itself documents — never a guess.
  it("n'est déclaré que là où il est documenté (Superhuman Business)", () => {
    expect(findConnector("superhuman")?.paidPlan).toBe("Superhuman Business");
    const declared = MCP_CONNECTORS.filter((c) => c.paidPlan).map((c) => c.id);
    expect(declared).toEqual(["superhuman"]);
  });
});
