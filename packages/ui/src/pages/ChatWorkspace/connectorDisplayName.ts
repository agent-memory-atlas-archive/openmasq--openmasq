import type { Messages } from "@openmasq/i18n";
import { connectorBrandName } from "@openmasq/catalog/mcp";
import { connectorOfServer } from "../../state/conversation/mcpIds";

/**
 * The connector a confirmation card names, as the user knows it: « Gmail », « Dossiers de
 * votre ordinateur » — never the server INSTANCE id the loop carries (`gmail--a1b2`,
 * `local-filesystem`). The language catalogue's name first (it translates « Google
 * Agenda »), the catalogue's brand next, the raw id only for a server nobody catalogued
 * (one the user added by address).
 */
export function connectorDisplayName(server: string, t: Messages): string {
  const id = connectorOfServer(server);
  return t.connectorCatalog.connectors[id]?.name ?? connectorBrandName(id) ?? server;
}
