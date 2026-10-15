import { getMessages } from "@openmasq/i18n";
import { describe, expect, it } from "vitest";
import { connectorErrorText } from "./connectorErrorText";

/**
 * Log of 15/08: the Vercel card displayed « Refresh token is invalid. » — raw English, in
 * place of the service's description, without saying what to do, on the very screen where
 * the repair is one click away.
 */

const fr = getMessages("fr");

describe("connectorErrorText — l'utilisateur lit une phrase, et le geste à faire", () => {
  it("autorisation morte, dans toutes les langues des fournisseurs → « reconnectez-vous »", () => {
    for (const m of [
      "Refresh token is invalid.",
      "invalid_grant",
      "Token has been expired or revoked.",
      "401 Unauthorized",
      "authorization required",
    ]) {
      const out = connectorErrorText(m, fr);
      expect(out, m).not.toBeNull();
      expect(out!.reconnect, m).toBe(true);
      expect(out!.text, m).toMatch(/reconnectez-vous/i);
    }
  });

  it("distingue les gestes : une clé refusée ne se « reconnecte » pas", () => {
    const k = connectorErrorText("clé API refusée", fr);
    expect(k?.reconnect).toBe(false);
    expect(k?.text).toContain("clé d'accès");
    const n = connectorErrorText("fetch failed", fr);
    expect(n?.reconnect).toBe(false);
    expect(n?.text).toContain("injoignable");
    const u = connectorErrorText(
      "Ce serveur n'autorise pas l'inscription OAuth (dynamic client registration)",
      fr,
    );
    expect(u?.reconnect).toBe(false);
  });

  it("un 403 est un refus du service, pas une expiration — mais se re-tente après correction", () => {
    const f = connectorErrorText("403 Forbidden", fr);
    expect(f?.text).toContain("a refusé l'accès");
    expect(f?.reconnect).toBe(true);
  });

  it("INCONNU ⇒ une phrase simple qui DIT l'échec, le texte brut gardé en détail", () => {
    const u = connectorErrorText("Kaboom v2 subsystem misaligned", fr);
    expect(u?.text).toBe(fr.mcpTab.errorGeneric);
    expect(u?.text).toContain("n'a pas abouti");
    expect(u?.detail).toBe("Kaboom v2 subsystem misaligned");
    expect(u?.reconnect).toBe(false);
    expect(connectorErrorText("", fr)).toBeNull();
    expect(connectorErrorText(undefined, fr)).toBeNull();
  });

  it("une phrase déjà écrite pour l'utilisateur par le main passe telle quelle, dans les deux langues", () => {
    for (const m of [getMessages("fr"), getMessages("en")]) {
      const blocked = connectorErrorText(m.desktopMain.mcp.blockedByOrg, fr);
      expect(blocked).toEqual({ text: m.desktopMain.mcp.blockedByOrg, reconnect: false });
      // A template matches whatever its parameter was.
      const folder = m.desktopMain.mcp.folderNotAllowed("Dossiers autorisés");
      expect(connectorErrorText(folder, fr)?.text).toBe(folder);
    }
    // …even wrapped by Electron's IPC envelope, which the user never reads.
    const wrapped = `Error invoking remote method 'mcp:connect-direct': Error: ${fr.desktopMain.mcp.oneClickNotConfigured}`;
    expect(connectorErrorText(wrapped, fr)).toEqual({ text: fr.desktopMain.mcp.oneClickNotConfigured, reconnect: false });
  });

  it("un refus Microsoft (AADSTS…) devient une phrase, le code reste en détail", () => {
    const raw = fr.desktopMain.oauth.microsoftRefused("AADSTS50020: User account from identity provider does not exist");
    const out = connectorErrorText(raw, fr);
    expect(out?.text).toBe(fr.mcpTab.errorMicrosoft);
    expect(out?.text).not.toContain("AADSTS");
    expect(out?.detail).toContain("AADSTS50020");
  });

  it("le code HTTP d'un échec d'échange ne s'affiche qu'en détail", () => {
    const raw = fr.desktopMain.oauth.tokenExchangeFailed("Google", 400);
    const out = connectorErrorText(raw, fr);
    expect(out?.text).not.toContain("400");
    expect(out?.detail).toContain("400");
  });
});
