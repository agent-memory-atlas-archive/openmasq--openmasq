import { describe, expect, it } from "vitest";
import { isAllowedRedirect, isRegistrableRedirect, redirectUriMatches } from "./redirectUri.js";

describe("redirect_uri validation", () => {
  it("matches loopback ignoring the port (RFC 8252)", () => {
    expect(redirectUriMatches("http://127.0.0.1:51817/callback", "http://127.0.0.1:0/callback")).toBe(true);
    expect(redirectUriMatches("http://localhost:9999/cb", "http://localhost:1/cb")).toBe(true);
  });

  it("still requires same host + path for loopback", () => {
    expect(redirectUriMatches("http://127.0.0.1:5/evil", "http://127.0.0.1:5/callback")).toBe(false);
    expect(redirectUriMatches("http://127.0.0.1:5/callback", "http://localhost:5/callback")).toBe(false);
  });

  it("rejects an injected query/hash on the loopback redirect", () => {
    expect(redirectUriMatches("http://127.0.0.1:5/callback?x=1", "http://127.0.0.1:0/callback")).toBe(false);
  });

  it("never matches a non-loopback URI — not even an identical one", () => {
    expect(redirectUriMatches("https://app.example.com/cb", "https://app.example.com/cb")).toBe(false);
    expect(redirectUriMatches("https://evil.example.com/cb", "https://app.example.com/cb")).toBe(false);
  });

  it("checks against the full registered list", () => {
    const reg = ["http://127.0.0.1:0/callback", "https://app.example.com/cb"];
    expect(isAllowedRedirect("http://127.0.0.1:42000/callback", reg)).toBe(true);
    expect(isAllowedRedirect("https://app.example.com/cb", reg)).toBe(false);
    expect(isAllowedRedirect("https://evil.example.com/cb", reg)).toBe(false);
  });
});

describe("registration accepts loopback redirects only (the code never leaves the machine)", () => {
  it("accepts the desktop client's loopback redirects", () => {
    for (const u of ["http://127.0.0.1:0/callback", "http://localhost:5555/cb", "http://[::1]:7/cb"]) {
      expect(isRegistrableRedirect(u), u).toBe(true);
    }
  });

  it("REFUSES a remote, custom-scheme, credentialed or query-carrying redirect", () => {
    for (const u of [
      "https://attacker.example/cb",
      "http://127.0.0.1.attacker.example/cb",
      "openmasq://callback",
      "javascript:alert(1)",
      "http://user:pw@127.0.0.1:5/cb",
      "http://127.0.0.1:5/cb?x=1",
      "http://127.0.0.1:5/cb#f",
      "not a url",
    ]) {
      expect(isRegistrableRedirect(u), u).toBe(false);
    }
  });
});
