import { describe, it, expect, vi } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("electron", () => ({ app: { isPackaged: true } }));
const { isAppPageUrl } = await import("./appPage");

const INDEX = join(tmpdir(), "App.app", "out", "renderer", "index.html");
const indexUrl = pathToFileURL(INDEX).href;

describe("isAppPageUrl — the app page is ONE file, not a scheme", () => {
  it("accepts the bundled index.html, with or without query/fragment", () => {
    expect(isAppPageUrl(indexUrl, INDEX, undefined)).toBe(true);
    expect(isAppPageUrl(`${indexUrl}#/settings`, INDEX, undefined)).toBe(true);
    expect(isAppPageUrl(`${indexUrl}?x=1`, INDEX, undefined)).toBe(true);
  });

  it("REFUSES any other file:// URL (a downloaded page must not get window.openmasq)", () => {
    const other = pathToFileURL(join(tmpdir(), "Downloads", "index.html")).href;
    expect(isAppPageUrl(other, INDEX, undefined)).toBe(false);
    expect(isAppPageUrl(pathToFileURL(join(INDEX, "..", "evil.html")).href, INDEX, undefined)).toBe(false);
    expect(isAppPageUrl("file://attacker-host/share/index.html", INDEX, undefined)).toBe(false);
  });

  it("refuses remote, data, blank and garbage URLs", () => {
    for (const u of ["https://evil.example/", "data:text/html,x", "about:blank", "not a url"]) {
      expect(isAppPageUrl(u, INDEX, undefined)).toBe(false);
    }
  });

  it("dev: the dev server's origin only — a lookalike prefix is not it", () => {
    const dev = "http://localhost:5173";
    expect(isAppPageUrl("http://localhost:5173/", INDEX, dev)).toBe(true);
    expect(isAppPageUrl("http://localhost:5173/index.html#/x", INDEX, dev)).toBe(true);
    expect(isAppPageUrl("http://localhost:51730/", INDEX, dev)).toBe(false);
    expect(isAppPageUrl("http://localhost:5173.evil.example/", INDEX, dev)).toBe(false);
    expect(isAppPageUrl(indexUrl, INDEX, dev)).toBe(false);
  });

  it("win32 compares the path case-insensitively (drive-letter casing)", () => {
    expect(isAppPageUrl(indexUrl.toUpperCase().replace("FILE:", "file:"), INDEX, undefined, "win32")).toBe(true);
  });
});
