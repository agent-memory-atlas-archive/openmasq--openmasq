// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { mount } from "../../../testKit";
import { useConnectFailures } from "./useConnectFailures";
import type { McpItem } from "./mcpItems";

vi.mock("../../../analytics", async (orig) => ({ ...(await orig<typeof import("../../../analytics")>()), captureEvent: vi.fn() }));

/** A connect that THREW used to leave no trace: the button went back to « Connecter ». */
describe("useConnectFailures", () => {
  const item = { id: "notion", serverId: "notion", connected: false } as McpItem;
  let api!: ReturnType<typeof useConnectFailures>;
  function Probe() {
    api = useConnectFailures();
    return null;
  }

  it("shows a thrown failure on its card, never a cancelled sign-in, and clears it on retry", async () => {
    const m = await mount(<Probe />);
    await m.rerender(<Probe />);
    api.fail("notion", new Error("fetch failed"));
    await m.rerender(<Probe />);
    expect(api.apply([item])[0]?.error).toBe("fetch failed");

    api.clear("notion");
    await m.rerender(<Probe />);
    expect(api.apply([item])[0]?.error).toBeUndefined();

    api.fail("notion", new Error("Connexion annulée"));
    await m.rerender(<Probe />);
    expect(api.apply([item])[0]?.error).toBeUndefined();
  });

  it("never overrides a connected card or the error main already returned", async () => {
    const m = await mount(<Probe />);
    api.fail("notion", new Error("fetch failed"));
    await m.rerender(<Probe />);
    expect(api.apply([{ ...item, connected: true }])[0]?.error).toBeUndefined();
    expect(api.apply([{ ...item, error: "invalid_grant" }])[0]?.error).toBe("invalid_grant");
  });
});
