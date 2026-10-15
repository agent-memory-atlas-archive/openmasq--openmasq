// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "../../../testKit";
import { McpModals, type McpConnectors } from "./McpModals";
import type { McpItem } from "./mcpItems";

/**
 * « Déconnecter » and « Supprimer ce connecteur » both drop the account's sign-in. One
 * click on the wrong row used to cost a full reconnection with nothing to undo it: the
 * removal now runs only after the app's own confirmation dialog says yes.
 */

const LOCAL: McpItem = {
  id: "filesystem",
  serverId: "local-filesystem",
  name: "Vos dossiers",
  desc: "",
  tone: "amber",
  kind: "local",
  connected: true,
  locked: false,
};
const CONFIGURED: McpItem = {
  id: "vercel",
  serverId: "vercel",
  name: "Vercel",
  desc: "",
  tone: "mint",
  kind: "remote",
  connected: false,
  configured: true,
  url: "https://mcp.vercel.com",
  locked: false,
};

function harness(item: McpItem) {
  const disconnect = vi.fn(async () => {});
  const remove = vi.fn(async () => {});
  const c = {
    openItem: item,
    items: [item],
    busy: {},
    connectUrls: {},
    setOpenId: vi.fn(),
    disconnect,
    remove,
    disableBrowser: vi.fn(async () => {}),
    setInspecting: vi.fn(),
  } as unknown as McpConnectors;
  return { c, disconnect, remove };
}

const button = (label: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);

describe("McpModals — une suppression demande d'abord", () => {
  // A closing dialog lingers for its exit animation: start every case on an empty page.
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("« Déconnecter » ouvre une confirmation ; rien ne part avant le oui", async () => {
    const { c, disconnect } = harness(LOCAL);
    const m = await mount(<McpModals c={c} />);
    await m.click(button("Déconnecter")!);
    expect(disconnect).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Déconnecter Vos dossiers");
    await m.click(document.querySelector<HTMLButtonElement>(".confirm-footer .btn-danger")!);
    expect(disconnect).toHaveBeenCalledWith("local-filesystem");
    await m.unmount();
  });

  it("« Annuler » ne supprime rien", async () => {
    const { c, disconnect, remove } = harness(LOCAL);
    const m = await mount(<McpModals c={c} />);
    await m.click(button("Déconnecter")!);
    await m.click(document.querySelector<HTMLButtonElement>(".confirm-footer .btn-ghost")!);
    expect(disconnect).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    await m.unmount();
  });

  it("« Supprimer ce connecteur » dit la conséquence, puis supprime après le oui", async () => {
    const { c, remove } = harness(CONFIGURED);
    const m = await mount(<McpModals c={c} />);
    await m.click(button("Supprimer ce connecteur")!);
    expect(remove).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("effacées de cet ordinateur");
    await m.click(document.querySelector<HTMLButtonElement>(".confirm-footer .btn-danger")!);
    expect(remove).toHaveBeenCalledWith("vercel");
    await m.unmount();
  });
});
