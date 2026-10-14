// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { mount } from "../../../testKit";
import { useQueuedSubmit } from "./useQueuedSubmit";

/** Enter during the live analysis used to be ignored without a word. */
describe("useQueuedSubmit", () => {
  let api!: ReturnType<typeof useQueuedSubmit>;
  function Probe(p: { busy: boolean; input: string; onSubmit: () => void }) {
    api = useQueuedSubmit(p.busy, p.input, p.onSubmit);
    return null;
  }

  it("sends at once when idle", async () => {
    const onSubmit = vi.fn();
    await mount(<Probe busy={false} input="bonjour" onSubmit={onSubmit} />);
    act(() => api.request());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("queues while busy and sends once the analysis ends", async () => {
    const onSubmit = vi.fn();
    const m = await mount(<Probe busy input="bonjour" onSubmit={onSubmit} />);
    act(() => api.request());
    await m.rerender(<Probe busy input="bonjour" onSubmit={onSubmit} />);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(api.queued).toBe(true);
    await m.rerender(<Probe busy={false} input="bonjour" onSubmit={onSubmit} />);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(api.queued).toBe(false);
  });

  it("typing again cancels the queued send", async () => {
    const onSubmit = vi.fn();
    const m = await mount(<Probe busy input="bonjour" onSubmit={onSubmit} />);
    act(() => api.request());
    await m.rerender(<Probe busy input="bonjour, et" onSubmit={onSubmit} />);
    await m.rerender(<Probe busy={false} input="bonjour, et" onSubmit={onSubmit} />);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
