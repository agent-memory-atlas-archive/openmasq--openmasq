import { describe, expect, it } from "vitest";
import { buildSendResultEvent, noteOutcome, outcomeOfPatch, sendAccess, type SendResult } from "./sendResult";

describe("sendAccess", () => {
  it("names the road each provider takes", () => {
    expect(sendAccess("claude-cli", false)).toBe("agent");
    expect(sendAccess("codex-cli", false)).toBe("agent");
    expect(sendAccess("antigravity-cli", false)).toBe("agent");
    expect(sendAccess("openai-compat", false)).toBe("local");
    expect(sendAccess("openrouter", false)).toBe("key");
    expect(sendAccess("openai", true)).toBe("platform");
  });
});

describe("outcomeOfPatch", () => {
  it("resolves only on pending:false", () => {
    expect(outcomeOfPatch({ content: "x" } as never)).toBeNull();
    expect(outcomeOfPatch({ pending: true })).toBeNull();
    expect(outcomeOfPatch({ pending: false })).toBe("ok");
    expect(outcomeOfPatch({ pending: false, incomplete: true })).toBe("incomplete");
    expect(outcomeOfPatch({ pending: false, error: true })).toBe("error");
  });
});

describe("noteOutcome", () => {
  it("keeps a refusal or a Stop final", () => {
    const refused: SendResult = { outcome: null };
    noteOutcome(refused, "refused");
    noteOutcome(refused, "error");
    expect(refused.outcome).toBe("refused");

    const stopped: SendResult = { outcome: null };
    noteOutcome(stopped, "stopped");
    noteOutcome(stopped, "ok");
    expect(stopped.outcome).toBe("stopped");
  });

  it("lets the last resolution win otherwise", () => {
    const r: SendResult = { outcome: null };
    noteOutcome(r, "ok");
    noteOutcome(r, "error");
    expect(r.outcome).toBe("error");
    noteOutcome(r, null);
    expect(r.outcome).toBe("error");
  });
});

describe("buildSendResultEvent", () => {
  it("carries the refusal only when refused", () => {
    expect(
      buildSendResultEvent({
        provider: "openrouter",
        model: "m",
        effectivePlatform: false,
        result: { outcome: "refused", refusal: "no_key" },
      }),
    ).toEqual({ name: "send_result", provider: "openrouter", model: "m", access: "key", outcome: "refused", refusal: "no_key" });
    expect(
      buildSendResultEvent({
        provider: "claude-cli",
        model: "claude-cli",
        effectivePlatform: false,
        result: { outcome: "ok", refusal: "no_key" },
      }),
    ).toEqual({ name: "send_result", provider: "claude-cli", model: "claude-cli", access: "agent", outcome: "ok" });
  });

  it("reports a turn that unwound unresolved as an error", () => {
    const e = buildSendResultEvent({ provider: "openai", model: "m", effectivePlatform: false, result: { outcome: null } });
    expect(e).toMatchObject({ outcome: "error" });
  });
});
