import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { pathToFileURL } from "node:url";

const bus = new EventEmitter();
const mainContents = { id: 1 };
vi.mock("electron", () => ({ app: { isPackaged: true }, ipcMain: bus }));
vi.mock("../mainWindowRef", () => ({ getMainWindow: () => ({ webContents: mainContents }) }));
const { APP_INDEX_HTML } = await import("../appPage");
const { trustedOn, trustedOnce } = await import("./senderGate");

const APP_URL = pathToFileURL(APP_INDEX_HTML).href;
type Ev = { sender: unknown; senderFrame: unknown; returnValue?: unknown };
const trusted = (): Ev => ({ sender: mainContents, senderFrame: { url: APP_URL, parent: null } });
const foreign = (): Ev => ({ sender: { id: 2 }, senderFrame: { url: APP_URL, parent: null } });

beforeEach(() => {
  bus.removeAllListeners();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("trustedOn", () => {
  it("runs the body for the app window and drops any other sender", () => {
    const fn = vi.fn();
    trustedOn("c", fn);
    bus.emit("c", foreign(), "x");
    expect(fn).not.toHaveBeenCalled();
    bus.emit("c", trusted(), "x");
    expect(fn).toHaveBeenCalledWith(expect.anything(), "x");
  });

  it("answers a dropped sendSync with null instead of leaving it unset", () => {
    trustedOn("sync", (e) => {
      e.returnValue = "payload";
    });
    const refused = foreign();
    bus.emit("sync", refused);
    expect(refused.returnValue).toBeNull();
    const ok = trusted();
    bus.emit("sync", ok);
    expect(ok.returnValue).toBe("payload");
  });
});

describe("trustedOnce", () => {
  it("a dropped message does NOT consume the reply; the trusted one does, once", () => {
    const fn = vi.fn();
    trustedOnce("r", fn);
    bus.emit("r", foreign(), "forged");
    expect(fn).not.toHaveBeenCalled();
    expect(bus.listenerCount("r")).toBe(1);
    bus.emit("r", trusted(), "real");
    bus.emit("r", trusted(), "again");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(expect.anything(), "real");
    expect(bus.listenerCount("r")).toBe(0);
  });

  it("its disposer removes the pending reply", () => {
    const dispose = trustedOnce("d", vi.fn());
    dispose();
    expect(bus.listenerCount("d")).toBe(0);
  });
});
