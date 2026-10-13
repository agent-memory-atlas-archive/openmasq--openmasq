// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "../../testKit";
import { useAccessStateEvent } from "./useAccessStateEvent";

const { captureEvent } = vi.hoisted(() => ({ captureEvent: vi.fn() }));
vi.mock("../../analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../analytics")>()),
  captureEvent,
}));

type Props = Parameters<typeof useAccessStateEvent>[0];
function Probe(p: Props) {
  useAccessStateEvent(p);
  return null;
}

const base: Props = {
  onboarded: true,
  keysKnown: true,
  served: false,
  agents: [],
  keyConfigured: new Set<string>(),
};
const sent = () => captureEvent.mock.calls.map(([e]) => e).filter((e) => e.name === "access_state");

beforeEach(() => captureEvent.mockClear());

describe("access_state", () => {
  it("waits for the key store: an empty set read before it answered is not « none »", async () => {
    const m = await mount(<Probe {...base} keysKnown={false} />);
    expect(sent()).toEqual([]);
    await m.rerender(<Probe {...base} keyConfigured={new Set(["openai"])} />);
    expect(sent()).toEqual([{ name: "access_state", access: "key" }]);
  });

  it("waits for the probe of a CLI that is switched on", async () => {
    const m = await mount(<Probe {...base} agents={[{ enabled: true, detected: null }]} />);
    expect(sent()).toEqual([]);
    await m.rerender(<Probe {...base} agents={[{ enabled: true, detected: true }]} />);
    expect(sent()).toEqual([{ name: "access_state", access: "agent" }]);
  });

  it("says none, once per launch, and nothing before the onboarding is over", async () => {
    const m = await mount(<Probe {...base} onboarded={false} />);
    expect(sent()).toEqual([]);
    await m.rerender(<Probe {...base} />);
    await m.rerender(<Probe {...base} keyConfigured={new Set(["openai"])} />);
    expect(sent()).toEqual([{ name: "access_state", access: "none" }]);
  });
});
