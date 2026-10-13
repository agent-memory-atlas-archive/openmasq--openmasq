import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({ app: { isPackaged: true } }));
const { isLoopbackCdpEndpoint } = await import("./playwrightMcpMain");

describe("isLoopbackCdpEndpoint — a packaged pw-mcp child only drives OUR agent browser", () => {
  it("accepts the loopback endpoint main hands over", () => {
    expect(isLoopbackCdpEndpoint("http://127.0.0.1:51234/abcdef")).toBe(true);
    expect(isLoopbackCdpEndpoint("ws://127.0.0.1:9222/devtools/browser")).toBe(true);
  });

  it("REFUSES no endpoint (pw-mcp would launch a browser of its own) and any other host", () => {
    expect(isLoopbackCdpEndpoint(undefined)).toBe(false);
    expect(isLoopbackCdpEndpoint("")).toBe(false);
    expect(isLoopbackCdpEndpoint("http://evil.example:9222")).toBe(false);
    expect(isLoopbackCdpEndpoint("http://127.0.0.1")).toBe(false);
    expect(isLoopbackCdpEndpoint("file:///tmp/x")).toBe(false);
  });
});
