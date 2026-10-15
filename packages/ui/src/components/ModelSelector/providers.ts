import type { ProviderId } from "@openmasq/llm";

/**
 * Shared provider presentation for the model pickers (the chat Finder + the Settings
 * grid): the display ORDER and the group LABEL (Scaleway wears the brand name).
 * Single-sourced here (rule 9) so both pickers agree.
 */

/** The chat picker's provider order (platform-first, then BYO). No web-session
 *  providers — the desktop has none. */
export const PROVIDER_ORDER: ProviderId[] = [
  "scaleway",
  // The user's Claude subscription (Claude Code CLI) — only appears if the CLI
  // is detected AND the setting enabled (`claudeCliReady`, otherwise the row is hidden).
  "claude-cli",
  // The user's ChatGPT subscription (Codex CLI) — only appears if the CLI is
  // detected AND the setting enabled (`codexCliReady`, otherwise the row is hidden).
  "codex-cli",
  // The Google Antigravity subscription (`agy` CLI) — same display rule.
  "antigravity-cli",
  "openai",
  "anthropic",
  "google",
  "mistral",
  "deepseek",
  "openrouter",
  "openai-compat",
];

/** Moved to `help/providerLabel.ts` (the one user-facing vocabulary); re-exported for the pickers. */
export { providerGroupLabel } from "../../help/providerLabel";
