import { describe, it, expect } from "vitest";
import { htmlToText } from "./htmlText";

// ORACLE: the regex formulation of `htmlToText`. The linear scanner must produce the same
// text for every input; only the cost differs (the regexes are quadratic on unclosed tags).
function decodeEntities(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+);/gi, (_m, code: string) => {
      const cp = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(cp) && cp >= 0x20 && cp <= 0x10ffff ? safeFromCodePoint(cp) : _m;
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#0*39);/gi, "'")
    .replace(/&nbsp;/g, " ");
}

function safeFromCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

const BLOCK_TAG =
  /<\/?(?:p|div|section|article|header|footer|main|aside|nav|ul|ol|li|table|thead|tbody|tr|h[1-6]|blockquote|pre|figure|figcaption|br|hr)\b[^>]*>/gi;

function regexHtmlToText(html: string, max: number): string {
  if (!html) return "";
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  const articles = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi);
  const candidate = main ?? (articles?.length === 1 ? articles[0] : undefined);
  if (candidate) {
    const focused = regexHtmlToText(candidate.replace(/<\/?(?:main|article)\b[^>]*>/gi, " "), max);
    if (focused.length >= 500) return focused;
  }
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, " ")
    .replace(BLOCK_TAG, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(stripped)
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "\n…[tronqué]" : text;
}

// A tiny HTML-ish alphabet, so random strings hit every construct, closed or not, in any case.
const TOKENS = [
  "<main>", "</main>", "<MAIN class=x>", "<main", "<article>", "</article>", "<Article id=a>",
  "<script>", "</script>", "<SCRIPT type=t>", "</ScRiPt>", "<style>", "</style>", "<!--", "-->",
  "<!-->", "<nav>", "</nav>", "<footer>", "</footer>", "<button>", "</button>", "<select>",
  "</select>", "<head>", "</head>", "<svg>", "</svg>", "<p>", "</p>", "<pre>", "<br/>", "<h1>",
  "</h1>", "<h7>", "<li>", "<div class='a>b'>", "<>", "<", ">", "</", "<a href=x>", "</a>",
  "<scripts>", "<mainx>", "<main_>", "&amp;", "&#x41;", "&#65;", "&nbsp;", "&lt;", " ", "\n",
  "\t", "\u00a0", "text", "Lorem ipsum dolor sit amet ", "İ", "ſ", "K",
];

function rand(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32);
}

describe("htmlToText — linear scanner, same output as the regex formulation", () => {
  it("matches the oracle on 4000 random documents", () => {
    const r = rand(42);
    for (let n = 0; n < 4000; n++) {
      const len = 1 + Math.floor(r() * 40);
      let doc = "";
      for (let k = 0; k < len; k++) doc += TOKENS[Math.floor(r() * TOKENS.length)];
      // a long reading area half the time, so the <main>/<article> branch is taken too
      if (r() < 0.5) doc = doc.replace("<main>", "<main>" + "mot ".repeat(150));
      const max = r() < 0.2 ? 50 : 20_000;
      expect(htmlToText(doc, max), JSON.stringify(doc)).toBe(regexHtmlToText(doc, max));
    }
  });

  it("matches the oracle on a realistic page", () => {
    const page =
      "<!doctype html><html><head><title>T</title><style>p{}</style></head><body>" +
      "<nav><a href=/>Home</a></nav><header><h1>Titre</h1></header>" +
      "<main><article><p>" + "Un paragraphe de contenu. ".repeat(40) + "</p>" +
      "<!-- comment --><script>var x = '<p>';</script><ul><li>a</li><li>b &amp; c</li></ul>" +
      "</article></main><footer>© footer</footer></body></html>";
    expect(htmlToText(page)).toBe(regexHtmlToText(page, 20_000));
  });
});

describe("htmlToText — bounded cost on hostile pages", () => {
  // Each of these holds the regex formulation for minutes on ~1 MB of input.
  const cases: Record<string, string> = {
    "unclosed <main>": "<main>".repeat(170_000),
    "unclosed <article>": "<article>".repeat(110_000),
    "unclosed <script>": "<script>".repeat(125_000),
    "unclosed comment": "<!--".repeat(250_000),
    "tag never closed by >": "<p".repeat(500_000),
    "lone <": "<".repeat(1_000_000),
  };
  for (const [name, html] of Object.entries(cases)) {
    it(`${name} finishes fast`, () => {
      const t0 = performance.now();
      htmlToText(html);
      expect(performance.now() - t0).toBeLessThan(1500);
    });
  }
});
