import { describe, expect, it } from "vitest";
import { SIMPLE_MODEL_IDS } from "@openmasq/catalog";
import { DEFAULT_MODEL_ID } from "./models";
import { effectiveDefaultModelId, factorySimpleIds, readyAccessModelIds } from "./defaultModel";

/**
 * The default follows the ACCESS PATH: a subscription CLI switched on and FOUND leads,
 * unless a model was picked by hand. The map is the store's `id → reason`: an id absent
 * from it is usable, an id present is not — and no map at all offers nothing.
 */
const unavailable = (...blocked: string[]) => new Map(blocked.map((id) => [id, "cli_unavailable"]));
const allBlocked = unavailable("claude-cli", "codex-cli", "antigravity-cli");

describe("readyAccessModelIds", () => {
  it("rien tant que la disponibilité n'est pas calculée — le sélecteur ne bascule pas au chargement", () => {
    expect(readyAccessModelIds(undefined)).toEqual([]);
  });
  it("une CLI activée mais introuvable ne compte pas ; la première prête mène", () => {
    expect(readyAccessModelIds(allBlocked)).toEqual([]);
    expect(readyAccessModelIds(unavailable("claude-cli", "antigravity-cli"))).toEqual(["codex-cli"]);
    expect(readyAccessModelIds(unavailable("antigravity-cli"))).toEqual(["claude-cli", "codex-cli"]);
  });
  it("respecte la liste blanche de l'organisation", () => {
    expect(readyAccessModelIds(unavailable(), ["codex-cli"])).toEqual(["codex-cli"]);
  });
});

describe("effectiveDefaultModelId", () => {
  it("le seed vide n'est pas un choix : la CLI prête le remplace", () => {
    expect(effectiveDefaultModelId("", unavailable("antigravity-cli"))).toBe("claude-cli");
    expect(effectiveDefaultModelId(undefined, unavailable("claude-cli"))).toBe("codex-cli");
  });
  it("sans CLI prête, le seed vide retombe sur le défaut d'usine", () => {
    expect(effectiveDefaultModelId("", allBlocked)).toBe(DEFAULT_MODEL_ID);
    expect(effectiveDefaultModelId(undefined, undefined)).toBe(DEFAULT_MODEL_ID);
  });
  it("choisir Laguna À LA MAIN le respecte, même avec une CLI prête (le bug corrigé)", () => {
    // DEFAULT_MODEL_ID est Laguna : un clic dessus est un choix, pas l'absence de choix.
    // Avant, il était confondu avec le seed et se résolvait vers la CLI d'accès.
    expect(effectiveDefaultModelId(DEFAULT_MODEL_ID, unavailable("antigravity-cli"))).toBe(DEFAULT_MODEL_ID);
  });
  it("un modèle choisi à la main est respecté, CLI prête ou non", () => {
    expect(effectiveDefaultModelId("openai/gpt-4o", unavailable())).toBe("openai/gpt-4o");
    expect(effectiveDefaultModelId("auto", unavailable())).toBe("auto");
  });
});

// A saved Anthropic key used to leave new conversations on Laguna, refused at the first send.
describe("effectiveDefaultModelId — a model a saved key unlocks", () => {
  const { SIMPLE_MODEL_IDS: simple } = { SIMPLE_MODEL_IDS };
  const onlyAnthropic = new Map(
    [...allBlocked.keys(), ...simple, "gpt-5.4", "gemini-3.5-flash", "mistral-medium-2508", "deepseek-v4-flash"].map(
      (id) => [id, "no_key"],
    ),
  );
  it("le seed indisponible cède au modèle équilibré de la clé enregistrée", () => {
    expect(effectiveDefaultModelId("", onlyAnthropic)).toBe("claude-sonnet-5");
  });
  it("une CLI prête passe toujours devant la clé", () => {
    const m = new Map(onlyAnthropic);
    m.delete("claude-cli");
    expect(effectiveDefaultModelId("", m)).toBe("claude-cli");
  });
  it("le seed utilisable reste le défaut ; sans rien d'utilisable, aussi", () => {
    expect(effectiveDefaultModelId("", allBlocked)).toBe(DEFAULT_MODEL_ID);
    const none = new Map([...onlyAnthropic, ["claude-sonnet-5", "no_key"]]);
    expect(effectiveDefaultModelId("", none)).toBe(DEFAULT_MODEL_ID);
  });
  it("un choix fait à la main n'est jamais remplacé", () => {
    expect(effectiveDefaultModelId(DEFAULT_MODEL_ID, onlyAnthropic)).toBe(DEFAULT_MODEL_ID);
  });
});

describe("factorySimpleIds", () => {
  it("sans CLI prête, c'est la liste gouvernable telle quelle", () => {
    expect(factorySimpleIds(allBlocked)).toBe(SIMPLE_MODEL_IDS);
    expect(factorySimpleIds(undefined)).toBe(SIMPLE_MODEL_IDS);
  });
  it("les CLI prêtes passent en tête, la liste gouvernable suit sans doublon", () => {
    const ids = factorySimpleIds(unavailable("antigravity-cli"));
    expect(ids.slice(0, 2)).toEqual(["claude-cli", "codex-cli"]);
    expect(ids.slice(2)).toEqual([...SIMPLE_MODEL_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
