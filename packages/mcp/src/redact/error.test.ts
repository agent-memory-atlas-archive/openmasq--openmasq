import { describe, expect, it } from "vitest";
import { RedactingMcpClient } from "./client";
import { redactError, WITHHELD_ERROR } from "./error";
import type { McpConnection } from "../types";

const REAL = "camille.roussel@example.com";
const FAKE = "marc.charvet@example.org";
const swap = async (t: string) => t.split(REAL).join(FAKE);

/** A server that THROWS, echoing the real argument it received in its message. */
function throwingServer(err: () => unknown): McpConnection {
  return {
    id: "mail",
    listTools: async () => [{ name: "send", inputSchema: { type: "object" }, serverId: "mail" }],
    callTool: async () => {
      throw err();
    },
    close: async () => {},
  };
}

describe("redactError", () => {
  it("masks the message and the stack, drops cause and data, keeps the class", async () => {
    class McpLike extends Error {
      data = { to: REAL };
    }
    const e = new McpLike(`no mailbox for ${REAL}`, { cause: new Error(REAL) });
    const out = await redactError(e, swap);
    expect(out).toBe(e);
    expect(out).toBeInstanceOf(McpLike);
    expect(out.message).toBe(`no mailbox for ${FAKE}`);
    expect(JSON.stringify({ ...out, stack: out.stack, message: out.message })).not.toContain(REAL);
  });

  it("withholds the whole message when the redactor fails", async () => {
    const out = await redactError(new Error(`bad ${REAL}`), async () => {
      throw new Error("engine down");
    });
    expect(out.message).toBe(WITHHELD_ERROR);
    expect(out.stack ?? "").not.toContain(REAL);
  });

  it("turns a thrown string or object into an Error the redactor has read", async () => {
    expect((await redactError(`x ${REAL}`, swap)).message).toBe(`x ${FAKE}`);
    expect((await redactError({ to: REAL }, swap)).message).toBe(WITHHELD_ERROR);
  });
});

describe("RedactingMcpClient — a thrown tool", () => {
  it("rethrows the upstream error through the result redactor", async () => {
    const mcp = new RedactingMcpClient({
      connections: [throwingServer(() => new Error(`550 unknown recipient ${REAL}`))],
      redactResult: swap,
    });
    await mcp.listTools();
    const err = await mcp.callTool({ name: "mail__send", arguments: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`550 unknown recipient ${FAKE}`);
  });

  it("keeps the SDK's dead-transport text readable", async () => {
    const mcp = new RedactingMcpClient({
      connections: [throwingServer(() => new Error("Not connected"))],
      redactResult: swap,
    });
    await mcp.listTools();
    const err = await mcp.callTool({ name: "mail__send", arguments: {} }).catch((e) => e);
    expect(err.message).toBe("Not connected");
  });
});
