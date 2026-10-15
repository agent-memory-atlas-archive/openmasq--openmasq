// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "../../../testKit";
import { McpConnectorModal } from "./McpConnectorModal";
import type { McpItem } from "./mcpItems";

/**
 * Régression : un connecteur connecté PUIS bloqué par l'organisation affichait la modale
 * normale (« Voir les outils », « Déconnecter ») sans jamais dire qu'il était bloqué — la
 * carte de la grille le signalait (badge « Org »), pas cette modale. La boucle agentique
 * retire pourtant ses outils en silence : on voyait une connexion active et on croyait
 * que ça marchait.
 */

const BASE: McpItem = {
  id: "slack",
  serverId: "slack",
  name: "Slack",
  desc: "Lire vos canaux",
  tone: "sky",
  kind: "remote",
  connected: false,
  locked: false,
};

const noop = () => {};

const open = (over: Partial<McpItem>) =>
  mount(
    <McpConnectorModal
      item={{ ...BASE, ...over }}
      busy={false}
      onClose={noop}
      onConnectRemote={noop}
      onConnectApiKey={noop}
      onConnectDirect={noop}
      onConnectLocal={noop}
      onDisconnect={noop}
      onRemove={noop}
      onByo={noop}
      onInspect={noop}
      onPickDir={async () => undefined}
    />,
  );

describe("McpConnectorModal — bloqué par l'organisation", () => {
  it("le dit même DÉJÀ CONNECTÉ — et garde l'action Déconnecter", async () => {
    const m = await open({ connected: true, locked: true });
    expect(m.el.textContent).toContain("bloqué par votre organisation");
    // It's still connected: you must be able to disconnect, not be stuck in a dead end.
    expect(m.el.textContent).toContain("Déconnecter");
    await m.unmount();
  });

  it("le dit quand il n'est pas connecté", async () => {
    const m = await open({ connected: false, locked: true });
    expect(m.el.textContent).toContain("bloqué par votre organisation");
    expect(m.el.textContent).not.toContain("Déconnecter");
    await m.unmount();
  });

  it("ne dit rien quand il n'est pas bloqué", async () => {
    const m = await open({ connected: true, locked: false });
    expect(m.el.textContent).not.toContain("bloqué par votre organisation");
    await m.unmount();
  });
});

/**
 * Log from 15/08 (Vercel): under "Refresh token is invalid." — raw English — the
 * modal served the FIRST-connection sentence, "you accept, and it's done. Nothing to
 * create.". The user was therefore reading a failure, then a welcome text, and the only
 * button named was « Oublier »: the fix (« Connecter ») was flagged nowhere.
 */
describe("McpConnectorModal — autorisation expirée", () => {
  const EXPIRED = { configured: true, error: "Refresh token is invalid." };

  it("dit la panne en français, et le geste — le message brut seulement replié en détail", async () => {
    const m = await open(EXPIRED);
    expect(m.el.textContent).toContain("Votre autorisation a expiré");
    const error = m.el.querySelector(".mcp-modal-error")!;
    const detail = error.querySelector("details")!;
    expect(detail.open).toBe(false);
    expect(detail.textContent).toContain("Refresh token is invalid");
    // Outside the closed fold, the raw English is nowhere.
    expect(error.firstChild?.textContent).not.toContain("Refresh token is invalid");
    await m.unmount();
  });

  it("l'aide cesse de décrire un premier branchement et pointe la reconnexion", async () => {
    const m = await open(EXPIRED);
    expect(m.el.textContent).toContain("Reconnectez-vous");
    expect(m.el.textContent).not.toContain("Rien à créer");
    // The redaction promise, though, holds in both states.
    expect(m.el.textContent).toContain("masquées");
    // And the fix stays offered next to « Oublier ».
    expect(m.el.textContent).toContain("Connecter");
    await m.unmount();
  });

  it("une panne INCONNUE est DITE en clair, sans phrase rassurante, le brut replié en détail", async () => {
    const m = await open({ configured: true, error: "Kaboom v2 subsystem misaligned" });
    expect(m.el.textContent).toContain("La connexion n'a pas abouti");
    expect(m.el.querySelector(".mcp-modal-error details")?.textContent).toContain(
      "Kaboom v2 subsystem misaligned",
    );
    expect(m.el.textContent).not.toContain("Reconnectez-vous");
    await m.unmount();
  });

  it("sans erreur, l'accueil habituel est intact", async () => {
    const m = await open({ configured: true });
    expect(m.el.textContent).not.toContain("Votre autorisation a expiré");
    expect(m.el.textContent).not.toContain("Reconnectez-vous ci-dessous");
    await m.unmount();
  });
});

describe("McpConnectorModal — abonnement payant du service", () => {
  it("Superhuman dit l'abonnement requis AVANT la connexion", async () => {
    const m = await open({ id: "superhuman", serverId: "superhuman", name: "Superhuman" });
    expect(m.el.textContent).toContain("Nécessite un abonnement Superhuman Business");
    await m.unmount();
  });

  it("aucun autre connecteur n'en invente", async () => {
    const m = await open({});
    expect(m.el.textContent).not.toContain("Nécessite un abonnement");
    await m.unmount();
  });
});
