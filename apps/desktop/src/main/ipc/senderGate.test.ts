import { describe, it, expect, vi } from "vitest";
import { pathToFileURL } from "node:url";

vi.mock("electron", () => ({ app: { isPackaged: true } }));
vi.mock("../mainWindowRef", () => ({ getMainWindow: () => null }));
const { APP_INDEX_HTML } = await import("../appPage");
const { isTrustedSender, assertTrustedSender, IpcSenderError } = await import("./senderGate");

const APP_URL = pathToFileURL(APP_INDEX_HTML).href;
const mainContents = { id: 1 } as unknown as Electron.WebContents;
const top = (url = APP_URL) => ({ url, parent: null });
const ev = (sender: unknown, senderFrame: unknown) =>
  ({ sender, senderFrame }) as unknown as Parameters<typeof isTrustedSender>[0];

describe("isTrustedSender — only the app window's top frame on the app page", () => {
  it("accepts the main window's top frame on the bundled page", () => {
    expect(isTrustedSender(ev(mainContents, top()), mainContents)).toBe(true);
  });

  it("REFUSES a sub-frame of the main window", () => {
    const sub = { url: APP_URL, parent: top() };
    expect(isTrustedSender(ev(mainContents, sub), mainContents)).toBe(false);
  });

  it("REFUSES another webContents (any other window)", () => {
    expect(isTrustedSender(ev({ id: 2 }, top()), mainContents)).toBe(false);
  });

  it("REFUSES the main window once it shows anything but the app page", () => {
    expect(isTrustedSender(ev(mainContents, top("https://evil.example/")), mainContents)).toBe(false);
    expect(isTrustedSender(ev(mainContents, top("file:///tmp/evil.html")), mainContents)).toBe(false);
  });

  it("REFUSES a destroyed frame and a missing main window (fail closed)", () => {
    expect(isTrustedSender(ev(mainContents, null), mainContents)).toBe(false);
    expect(isTrustedSender(ev(mainContents, top()), undefined)).toBe(false);
    const throwing = {
      sender: mainContents,
      get senderFrame(): never {
        throw new Error("frame disposed");
      },
    } as unknown as Parameters<typeof isTrustedSender>[0];
    expect(isTrustedSender(throwing, mainContents)).toBe(false);
  });

  it("assertTrustedSender throws a typed refusal naming only the channel", () => {
    expect(() => assertTrustedSender("keys:set", ev(mainContents, top()))).toThrow(IpcSenderError);
  });
});
