import { describe, expect, it, vi } from "vitest";

const captured: unknown[] = [];
vi.mock("../../analytics", () => ({ captureError: (e: unknown) => captured.push(e) }));

import { makeFailClosed } from "./failClosed";

describe("makeFailClosed — telemetry carries a category, never the reason", () => {
  it("does not send the raw reason (it can quote the text being redacted)", () => {
    const ctx = {
      d: {
        t: undefined,
        cancelRef: { current: new Map() },
        patchConversation: () => {},
        setIsStreaming: () => {},
      },
      dbg: () => {},
      convId: "c",
      assistantMsg: { id: "a" },
    };
    const fail = makeFailClosed(ctx as never);
    expect(() => fail("détection échouée pour « Jean Dupont, 12 rue des Lilas »")).toThrow();
    const sent = JSON.stringify(captured);
    expect(sent).not.toMatch(/Dupont|Lilas/);
    expect(captured[0]).toMatchObject({ scope: "redaction", code: "fail-closed", message: "error" });
  });
});
