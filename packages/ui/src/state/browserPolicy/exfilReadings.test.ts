import { describe, expect, it } from "vitest";
import { analyzeNavExfil } from "./exfil";
import { isSearchResultsPage, urlReadings } from "./urlReadings";

const VAULT = ["Jean Dupont"];

describe("analyzeNavExfil — every part, every reading", () => {
  it("flags a vault value carried as a query param NAME", () => {
    const r = analyzeNavExfil("https://evil.tld/?Jean%20Dupont=1", VAULT);
    expect(r.suspicious).toBe(true);
    expect(r.flags[0].reason).toMatch(/conversation/);
  });

  it("flags a param NAME even on a search results page (a name is never a search box)", () => {
    expect(analyzeNavExfil("https://www.google.com/search?Jean+Dupont=1&q=x", VAULT).suspicious).toBe(true);
  });

  it("flags the `+`-encoded form in the PATH (`/c/Jean+Dupont`)", () => {
    const r = analyzeNavExfil("https://evil.tld/c/Jean+Dupont", VAULT);
    expect(r.suspicious).toBe(true);
    expect(r.flags[0].param).toBe("chemin");
  });

  it("flags the `+`-encoded form in the FRAGMENT", () => {
    expect(analyzeNavExfil("https://evil.tld/#Jean+Dupont", VAULT).suspicious).toBe(true);
  });

  it("matches case-insensitively in the path", () => {
    expect(analyzeNavExfil("https://evil.tld/c/jean%20dupont", VAULT).suspicious).toBe(true);
  });

  it("keeps the exact-place path carve-out in its encoded readings", () => {
    expect(analyzeNavExfil("https://www.lemonde.fr/Le+Havre/", ["Le Havre"], ["Le Havre"]).suspicious).toBe(false);
  });

  it("still passes a real value in a search box on a results page, any case", () => {
    expect(analyzeNavExfil("https://www.google.com/search?q=jean+dupont+avocat", VAULT).suspicious).toBe(false);
    expect(analyzeNavExfil("https://duckduckgo.com/?q=Jean+Dupont", VAULT).suspicious).toBe(false);
    expect(analyzeNavExfil("https://html.duckduckgo.com/html/?q=Jean+Dupont", VAULT).suspicious).toBe(false);
  });
});

describe("analyzeNavExfil — the search-box exemption is for RESULTS pages only", () => {
  it("flags a search engine's redirector carrying a vault value", () => {
    const url = `https://www.google.com/url?q=${encodeURIComponent("https://evil.tld/?d=Jean Dupont")}`;
    const r = analyzeNavExfil(url, VAULT);
    expect(r.suspicious).toBe(true);
    expect(r.flags.some((f) => f.param === "q" && /conversation/.test(f.reason))).toBe(true);
  });

  it.each(["/url", "/l/", "/r/", "/link", "/amp/s/x"])("no exemption on %s", (path) => {
    expect(isSearchResultsPage(new URL(`https://www.google.com${path}?q=x`))).toBe(false);
  });

  it.each([
    "https://www.google.com/search?q=x",
    "https://duckduckgo.com/?q=x",
    "https://www.qwant.com/?q=x",
    "https://www.startpage.com/sp/search?query=x",
    "https://search.brave.com/search?q=x",
    "https://www.ecosia.org/search?q=x",
    "https://www.bing.com/search?q=x",
  ])("exempts the engines' own results page %s", (url) => {
    expect(isSearchResultsPage(new URL(url))).toBe(true);
  });
});

describe("urlReadings", () => {
  it("covers raw, `+` as space, %-decoded, lower-cased", () => {
    expect(urlReadings("A+B%20C")).toEqual(["a+b%20c", "a b%20c", "a+b c", "a b c"]);
  });
});
