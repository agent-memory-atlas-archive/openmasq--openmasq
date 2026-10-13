// The `mcp:*` channels: the connector lifecycle main owns on behalf of the renderer.
import { trustedHandle } from "./senderGate";
import type { McpToolCall } from "@openmasq/mcp";
import { getBroker } from "../broker";
import { setMcpUser, mcpList, mcpCatalog, mcpAdd, mcpAddCustom, mcpAddStdio, mcpSetStdioDirs, mcpDisconnect, mcpConnect, mcpRemove, mcpConnectDirect, mcpAddAccountDirect, mcpAddAccountRemote, mcpReauthDirect, mcpByoCredGroups, mcpEnableBrowser, mcpDisableBrowser, mcpListToolsAll, mcpCallTool } from "../mcp";
import type { CredMode } from "../mcp/credMode";
import { pickGrantDir } from "../mcp/pickGrantDir";
import { cancelConnect as mcpCancelConnect } from "../mcp/server/connectCancel";
import { findConnector } from "@openmasq/catalog/mcp";
import { isCustomServerId } from "../mcp/server/customSpec";
import { assertSessionAccount } from "../store/sessionAccount";
import { handle, nullable, str } from "./handle";

export function registerMcpHandlers(): void {
  // Per-account isolation, same trigger points as db:set-user. `null` = signed out; a
  // non-null uid must be the account of the session main holds (`../store/sessionAccount.ts`).
  handle("mcp:set-user", [nullable(str)], (_e, userId) => {
    assertSessionAccount("mcp:set-user", userId);
    return setMcpUser(userId);
  });
  // Main owns the live connections and returns RAW tool data; the renderer redacts.
  trustedHandle("mcp:list", () => mcpList());
  trustedHandle("mcp:catalog", () => mcpCatalog());
  // The local broker sidecar's URL + platforms (null until it's healthy).
  trustedHandle("mcp:broker", () => getBroker());
  // SECURITY (rule 7): the renderer names WHICH catalog connector to add, never what it
  // is: a renderer-chosen identity would re-point a connector's tool routes and OAuth
  // state at an attacker's host, and outward calls are un-redacted (rule 11). Main
  // resolves the identity from the catalog; user-added servers go through `mcp:add-custom`.
  trustedHandle(
    "mcp:add",
    (_e, spec: { id: string; name: string; url: string; apiKey?: string; }) => {
      const id = typeof spec?.id === "string" ? spec.id : "";
      const connector = findConnector(id);
      if (!connector) {
        if (isCustomServerId(id)) return; // belongs to mcp:add-custom, which validates
        throw new Error("Connecteur inconnu.");
      }
      // Catalog data wins; `url` is taken from the caller only when the entry carries none.
      const url = connector.url ?? (typeof spec?.url === "string" ? spec.url : "");
      // Keep the API key OFF the ServerSpec — mcpAdd stores it encrypted separately.
      return mcpAdd({ id, name: connector.name, url, kind: "http" }, spec?.apiKey);
    }
  );
  // A USER-ADDED server: main MINTS the id, enforces https + no inline credentials, runs
  // the SSRF guard before persisting (`mcp/server/customSpec.ts`).
  trustedHandle(
    "mcp:add-custom",
    (_e, input: { name?: string; url?: string; apiKey?: string; }) => mcpAddCustom(input)
  );
  // A catalog id + declared env + granted paths, never a command; every path re-validated.
  trustedHandle(
    "mcp:add-stdio",
    (_e, catalogId: string, env: Record<string, string>, params?: Record<string, string>) => mcpAddStdio(catalogId, env, params)
  );
  trustedHandle("mcp:pick-dir", (_e, hint: unknown) => pickGrantDir(hint));
  // Add/remove an allowed folder (same gate as an addition). ⚠️ The live connection is
  // DESTROYED before being redone: `connectServer` short-circuits on a connected id, and
  // the filesystem worker receives its roots AT FORK TIME.
  trustedHandle("mcp:set-dirs", (_e, id: string, key: string, dirs: string[]) => mcpSetStdioDirs(id, key, Array.isArray(dirs) ? dirs.map(String) : [], async (sid) => {
    await mcpDisconnect(sid);
    return mcpConnect(sid);
  })
  );
  trustedHandle("mcp:remove", (_e, id: string) => mcpRemove(id));
  trustedHandle("mcp:connect", (_e, id: string) => mcpConnect(id));
  trustedHandle(
    "mcp:connect-direct",
    (_e, id: string, opts: { mode: CredMode; clientId?: string; }) => mcpConnectDirect(id, opts)
  );
  trustedHandle(
    "mcp:add-account-direct",
    (_e, id: string, opts: { mode: CredMode; clientId?: string; clientSecret?: string; }) => mcpAddAccountDirect(id, opts)
  );
  trustedHandle(
    "mcp:add-account-remote",
    (_e, id: string, opts: { url?: string; name?: string; apiKey?: string; }) => mcpAddAccountRemote(id, opts)
  );
  trustedHandle("mcp:reauth-direct", (_e, id: string) => mcpReauthDirect(id));
  trustedHandle("mcp:byo-cred-groups", () => mcpByoCredGroups());
  // Cancel an in-flight connect: the OAuth loopback is torn down, no token is minted.
  trustedHandle("mcp:cancel-connect", (_e, id: string) => mcpCancelConnect(id));
  trustedHandle("mcp:disconnect", (_e, id: string) => mcpDisconnect(id));
  trustedHandle("mcp:enable-browser", () => mcpEnableBrowser());
  trustedHandle("mcp:disable-browser", () => mcpDisableBrowser());
  trustedHandle("mcp:list-tools", () => mcpListToolsAll());
  // Write gating is MAIN-OWNED (`mcp/server/callTool.ts`): no renderer-minted approval.
  trustedHandle("mcp:call-tool", (_e, call: McpToolCall) => mcpCallTool(call));
}
