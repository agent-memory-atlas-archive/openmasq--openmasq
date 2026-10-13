import { describe, expect, it } from "vitest";
import { replayForModel, type Vault } from "@openmasq/redact";
import type { Message } from "../../types";
import type { SendEngineContext } from "../redactionOptions";
import { vaultCoffreForHistory } from "./historyCoffre";

const engine: SendEngineContext = {
  disabledKinds: [], keep: [], kinds: {}, salt: 7, key: "a".repeat(64), mode: "fake",
  commercialNotoriety: false, peopleNotoriety: true,
};
const past = [
  { id: "u1", role: "user", content: "Le projet Nightingale démarre.", redactions: 0 },
  { id: "a1", role: "assistant", content: "Bien noté pour nightingale." },
] as Message[];

describe("vaultCoffreForHistory — the Coffre holds for the replayed history", () => {
  it("a Coffre term added AFTER the turns were sent is masked when they are replayed", async () => {
    const vault: Vault = {};
    await vaultCoffreForHistory(past, vault, [{ value: "Nightingale", category: "ORG" }], engine);
    const wire = past.map((m) => replayForModel(m.content, vault, { mode: "fake" })).join("\n");
    expect(wire).not.toMatch(/nightingale/i);
    expect(Object.values(vault)).toEqual(expect.arrayContaining(["Nightingale", "nightingale"]));
  });

  it("leaves an already-vaulted term's fake untouched", async () => {
    const vault: Vault = { Rossignol: "Nightingale", rossignol: "nightingale" };
    await vaultCoffreForHistory(past, vault, [{ value: "Nightingale", category: "ORG" }], engine);
    expect(vault).toEqual({ Rossignol: "Nightingale", rossignol: "nightingale" });
  });

  it("`keep` still wins over the Coffre, as on the message", async () => {
    const vault: Vault = {};
    await vaultCoffreForHistory(past, vault, [{ value: "Nightingale", category: "ORG" }], { ...engine, keep: ["Nightingale"] });
    expect(Object.values(vault)).not.toContain("Nightingale");
  });
});
