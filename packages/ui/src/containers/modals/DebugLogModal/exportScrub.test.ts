import { beforeEach, describe, expect, it } from "vitest";
import { clearDebugLog, pushDebug, setDebugCapture } from "../../../state/debug/debug";
import { logExportFor } from "./entryText";

/** The avis export carries no real value its own entries' vaults know — including text that
 *  never went through the redactor (raw errors, refusal journal lines, file names). */
describe("logExportFor — re-masked with the entries' vaults", () => {
  beforeEach(() => {
    clearDebugLog();
    setDebugCapture(true);
  });

  const VAULT = { "Paul Martin": "Jean Dupont", "rapport-b.pdf": "bilan-dupont.pdf" };

  it("masks a real value quoted in a raw MCP error and in args", () => {
    pushDebug(
      { type: "tool", name: "gmail__send", ok: false, args: '{"to":"Jean Dupont"}', error: "404: no user Jean Dupont", vault: VAULT },
      "c1",
    );
    const out = logExportFor("c1");
    expect(out).not.toMatch(/Jean Dupont/i);
    expect(out).toContain("Paul Martin");
  });

  it("masks a real FILE NAME and the `+`/%-encoded forms in a URL", () => {
    pushDebug({ type: "tool", name: "browser__navigate", ok: false, args: "https://x.tld/?q=Jean+Dupont&f=Jean%20Dupont", vault: VAULT }, "c1");
    pushDebug({ type: "phase", scope: "tool", label: "Pièce jointe · bilan-dupont.pdf" }, "c1");
    const out = logExportFor("c1");
    expect(out).not.toMatch(/Dupont/i);
    expect(out).toContain("rapport-b.pdf");
  });

  it("leaves a short value inside an ordinary word alone", () => {
    pushDebug({ type: "tool", name: "x", ok: true, args: "Lucas a parlé à Lu", vault: { Zo: "Lu" } }, "c1");
    expect(logExportFor("c1")).toContain("Lucas a parlé à Zo");
  });
});
