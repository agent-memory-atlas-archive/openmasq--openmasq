import { defineConfig } from "tsup";

export default defineConfig({
  // Named so the emitted file matches the export subpath (`./tooltip` → `dist/tooltip.js`),
  // which a bare path would not: tsup names an output after its source file.
  // `sheetWorker`: the spreadsheet preview's Web Worker, emitted beside `index.js` so the
  // consumer's bundler finds the `./sheetWorker?worker` import `index.js` keeps verbatim.
  entry: { index: "src/index.ts", tooltip: "src/components/brand/tooltipPlacement.ts", sheetWorker: "src/containers/modals/SpreadsheetViewer/sheetWorker.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@openmasq/llm",
    "@openmasq/redact",
    // Markdown stack — let the consumer's bundler handle these (they're ESM).
    "react-markdown",
    "remark-gfm",
    "remark-math",
    "rehype-katex",
    "katex",
    // pdf.js is heavy + uses a Web Worker resolved via the consumer's bundler
    // (`?url`); keep it external so the desktop's Vite handles bundling + worker.
    /^pdfjs-dist/,
    // pdf-lib bakes the in-memory redacted PDF; external → desktop Vite bundles it.
    "pdf-lib",
    // Office-doc renderers (spreadsheet + docx + pptx viewers). Heavy + lazy-
    // imported at view time; external so the consumer's bundler code-splits them.
    "xlsx",
    // a Vite module worker (`parseOffThread.ts`): the consumer's bundler builds it
    /\?worker$/,
    /^mammoth/,
    "fflate",
  ],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
