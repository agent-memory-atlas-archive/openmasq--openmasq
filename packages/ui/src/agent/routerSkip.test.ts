import { describe, expect, it } from "vitest";
import { routerWorthCalling } from "./routerSkip";

describe("routerWorthCalling", () => {
  it("skips the router on conversation", () => {
    for (const t of [
      "bonjour",
      "que peux-tu faire ?",
      "explique-moi la photosynthèse",
      "traduis ce paragraphe en anglais : il fait beau",
      "écris un poème sur la mer",
      "what is the capital of Peru?",
    ])
      expect(routerWorthCalling(t), t).toBe(false);
  });

  it("routes on any sign of a tool: data, action, possessive, URL, path", () => {
    for (const t of [
      "liste mes pages webflow",
      "mes tickets du trimestre",
      "cherche le dernier rapport",
      "envoie un mail à l'équipe",
      "qu'ai-je dans mon agenda demain ?",
      "fais un graphique des ventes",
      "résume https://example.com/article",
      "regarde openmasq.com",
      "ouvre ~/Documents/notes/",
      "find the latest invoice",
      "check my calendar",
    ])
      expect(routerWorthCalling(t), t).toBe(true);
  });

  it("routes a compétence that declares its connectors, whatever its words", () => {
    expect(routerWorthCalling("prépare la journée", ["webflow"])).toBe(true);
  });
});
