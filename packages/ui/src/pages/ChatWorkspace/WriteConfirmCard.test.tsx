// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "../../testKit";
import { WriteConfirmCard } from "./WriteConfirmCard";

/**
 * The card is read by someone about to let the assistant send an e-mail: it names the
 * service and the action in words, keeps the raw tool id inside « Détails techniques », and
 * never promises « ne vous sera plus demandée » on a confirmation that asks every time.
 */
const base = {
  tool: "send_email",
  server: "gmail--a1b2",
  args: { to: "jean@example.com", subject: "Bonjour" },
  reason: "write" as const,
  flags: [],
  onDecision: () => {},
};

describe("WriteConfirmCard", () => {
  it("nomme le service et l'action en mots ; l'id brut seulement dans les détails", async () => {
    const m = await mount(<WriteConfirmCard {...base} />);
    const target = m.find(".agent-card-box-target-val").textContent ?? "";
    expect(target).toContain("Gmail");
    expect(target).not.toContain("send_email");
    expect(target).not.toContain("gmail--a1b2");
    expect(m.find(".write-confirm-json").textContent).toContain("send_email");
    expect(m.find(".write-confirm-json summary").textContent).toBe("Détails techniques");
    await m.unmount();
  });

  it("une confirmation PLANCHER (envoi) dit qu'elle reviendra, sans case « autres conversations »", async () => {
    const m = await mount(<WriteConfirmCard {...base} floor />);
    expect(m.el.textContent).toContain("vous est demandé, même après une première autorisation");
    expect(m.maybe(".write-confirm-remember")).toBeNull();
    await m.unmount();
  });

  it("une confirmation ordinaire dit sa portée : cette conversation", async () => {
    const m = await mount(<WriteConfirmCard {...base} />);
    expect(m.el.textContent).toContain("ne vous sera plus demandée dans cette conversation");
    expect(m.maybe(".write-confirm-remember")).not.toBeNull();
    await m.unmount();
  });
});
