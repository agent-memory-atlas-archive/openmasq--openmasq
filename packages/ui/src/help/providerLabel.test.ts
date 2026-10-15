import { describe, expect, it } from "vitest";
import { getMessages, LOCALES } from "@openmasq/i18n";
import { PROVIDERS, type ProviderId } from "@openmasq/llm";
import { providerGroupLabel, providerLabel } from "./providerLabel";

/** The registry label is technical English for a few ids; no screen may ever wear it. */
const TECHNICAL = /no API key|OpenAI-compatible/i;
const IDS = Object.keys(PROVIDERS) as ProviderId[];

describe("providerLabel / providerGroupLabel — no registry jargon on screen", () => {
  for (const locale of LOCALES) {
    const t = getMessages(locale);
    it(`${locale}: every provider gets a plain, non-empty name and group header`, () => {
      for (const pid of IDS) {
        for (const label of [providerLabel(pid, t), providerGroupLabel(pid, t)]) {
          expect(label, `${locale}/${pid}`).not.toMatch(TECHNICAL);
          expect(label.trim(), `${locale}/${pid}`).not.toBe("");
        }
      }
    });
  }

  it("names the local endpoint in the reader's language", () => {
    expect(providerLabel("openai-compat", getMessages("fr"))).toBe("Modèle local");
    expect(providerLabel("openai-compat", getMessages("en"))).toBe("Local model");
  });

  it("keeps a brand name as the registry spells it", () => {
    expect(providerLabel("openai", getMessages("fr"))).toBe("OpenAI");
    expect(providerLabel("claude-cli", getMessages("en"))).toBe("Claude Code");
  });
});
