import { describe, expect, it } from "vitest";
import type { McpConnection } from "@openmasq/mcp";
import type { Masker } from "../../lib/masker";
import { createBridge } from "./bridge";
import { connectUpstream } from "./upstream";

const REAL = "Camille Roussel";
const FAKE = "Marc Charvet";
const masker: Masker = {
  async mask(text, vault) {
    if (!text.includes(REAL)) return { text, matches: [] };
    vault[FAKE] = REAL;
    return { text: text.split(REAL).join(FAKE), matches: [] };
  },
  restoreReply: (t) => t,
  restoreArgs: (t, v) => Object.entries(v).reduce((s, [f, r]) => s.split(f).join(r), t),
};

async function bridgeOver(connection: McpConnection, m: Masker = masker) {
  const upstream = await connectUpstream(
    [{ id: "crm", transport: "stdio", command: "unused", args: [], env: {} }],
    { connect: async () => connection },
  );
  return createBridge({ upstream, masker: m, policy: "allow", confirm: async () => true });
}

const session = () => ({ vault: {}, key: "k", mode: "fake" as const });

describe("bridge — a tool that throws", () => {
  it("hands the agent a MASKED message when the upstream call throws", async () => {
    const bridge = await bridgeOver({
      id: "crm",
      listTools: async () => [{ name: "find", inputSchema: { type: "object" }, serverId: "crm" }],
      callTool: async () => {
        throw new Error(`no record for ${REAL}`);
      },
      close: async () => {},
    });
    const err = await bridge.callTool("crm__find", {}, session()).catch((e: Error) => e);
    expect((err as Error).message).toBe(`no record for ${FAKE}`);
  });

  it("masks a failure before the call too (the write gate's confirmation)", async () => {
    const upstream = await connectUpstream(
      [{ id: "crm", transport: "stdio", command: "unused", args: [], env: {} }],
      {
        connect: async () => ({
          id: "crm",
          listTools: async () => [
            { name: "send_mail", inputSchema: { type: "object" }, serverId: "crm" },
          ],
          callTool: async () => ({ content: [] }),
          close: async () => {},
        }),
      },
    );
    const bridge = createBridge({
      upstream,
      masker,
      policy: "confirm",
      confirm: async () => {
        throw new Error(`terminal lost while asking about ${REAL}`);
      },
    });
    const err = (await bridge.callTool("crm__send_mail", {}, session()).catch((e) => e)) as Error;
    expect(err.message).toBe(`terminal lost while asking about ${FAKE}`);
  });

  it("withholds the message whole when the masker itself fails", async () => {
    const broken: Masker = {
      ...masker,
      mask: async () => {
        throw new Error("engine down");
      },
    };
    const bridge = await bridgeOver(
      {
        id: "crm",
        listTools: async () => [{ name: "find", inputSchema: { type: "object" }, serverId: "crm" }],
        callTool: async () => {
          throw new Error(`no record for ${REAL}`);
        },
        close: async () => {},
      },
      broken,
    );
    const err = (await bridge.callTool("crm__find", {}, session()).catch((e) => e)) as Error;
    expect(err.message).not.toContain(REAL);
  });
});
