import type { Message } from "../../../types";

/**
 * The assistant replies whose TURN masked something: the closest user message above the
 * reply carries `redactions > 0`. Those replies get the permanent « Voir ce que le modèle
 * a vu » action (`MessageActions`); a turn that masked nothing has nothing to compare.
 */
export function redactedReplyIds(messages: readonly Message[]): Set<string> {
  const ids = new Set<string>();
  let lastUserRedacted = false;
  for (const m of messages) {
    if (m.role === "user") lastUserRedacted = !!m.redactions;
    else if (m.role === "assistant" && lastUserRedacted) ids.add(m.id);
  }
  return ids;
}
