import { describe, expect, it } from "vitest";
import type { Message } from "../../../types";
import { redactedReplyIds } from "./redactedTurns";

const msg = (id: string, role: Message["role"], redactions?: number): Message =>
  ({ id, role, content: "x", redactions }) as Message;

describe("redactedReplyIds — « Voir ce que le modèle a vu » sous les réponses d'un tour masqué", () => {
  it("garde la réponse d'un tour masqué, pas celle d'un tour sans masquage", () => {
    const ids = redactedReplyIds([msg("u1", "user", 2), msg("a1", "assistant"), msg("u2", "user", 0), msg("a2", "assistant")]);
    expect([...ids]).toEqual(["a1"]);
  });
  it("une réponse sans message utilisateur au-dessus n'est pas retenue", () => {
    expect(redactedReplyIds([msg("a0", "assistant")]).size).toBe(0);
  });
});
