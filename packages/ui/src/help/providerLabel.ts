import { PROVIDERS, type ProviderId } from "@openmasq/llm";
import { BRAND } from "@openmasq/branding";
import type { Messages } from "@openmasq/i18n";
import { subscriptionsSold } from "../send/platformAccess";

/** THE name a provider wears on screen: the reply header, a model card, an error sentence.
 *  Never show `PROVIDERS[pid].label` directly: it is technical English for some ids
 *  (« OpenAI-compatible / Local », « (no API key) »). Everyone else keeps the registry
 *  label, which is a brand name (« OpenAI », « Claude Code »). Short on purpose: it is read
 *  inside sentences (« chez X », « Votre session X a expiré »). `providerLabel.test.ts`. */
export function providerLabel(pid: ProviderId, t: Messages): string {
  const m = t.modelPicker;
  if (pid === "openai-compat") return m.nameLocal;
  if (pid === "openai-session") return m.nameChatgptSession;
  if (pid === "anthropic-session") return m.nameClaudeSession;
  return PROVIDERS[pid]?.label ?? pid;
}

/** The picker's GROUP header — longer than the name, it says what pays for the models:
 *  Scaleway (the subscription-only platform) wears the brand name, the CLIs name the
 *  subscription, the local endpoint and the sessions get plain catalogue words. */
export function providerGroupLabel(pid: ProviderId, t: Messages): string {
  const m = t.modelPicker;
  if (pid === "scaleway") {
    return subscriptionsSold() ? m.groupIncludedSub(BRAND.name) : m.groupIncludedAccount(BRAND.name);
  }
  if (pid === "claude-cli") return m.groupClaudeCli;
  if (pid === "codex-cli") return m.groupCodexCli;
  if (pid === "antigravity-cli") return m.groupAntigravityCli;
  if (pid === "openai-compat") return m.groupLocal;
  if (pid === "openai-session") return m.groupChatgptSession;
  if (pid === "anthropic-session") return m.groupClaudeSession;
  return providerLabel(pid, t);
}
