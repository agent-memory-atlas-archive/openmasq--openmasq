import { useCallback, useState } from "react";
import { captureEvent } from "../../../analytics";
import { connectorErrorReason } from "./connectorErrorReason";
import { connectorErrorFamily } from "./connectorErrorText";
import type { McpItem } from "./mcpItems";

/**
 * A connect that THREW (as opposed to one that returned `connected: false` with its error):
 * its message, per id, until the next attempt. Without it the button went back to
 * « Connecter » and nothing said why — the user retried blind or gave up. Counted for
 * analytics with the same reason the sentence is built from. A sign-in the person
 * CANCELLED is counted, never painted red: it is their choice, not a failure.
 */
export function useConnectFailures() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fail = useCallback((id: string, e: unknown) => {
    captureEvent({ name: "connector_error", provider: id, reason: connectorErrorReason(e) });
    const message = e instanceof Error ? e.message : String(e ?? "");
    if (!message || connectorErrorFamily(message) === "cancelled") return;
    setErrors((m) => ({ ...m, [id]: message }));
  }, []);
  const clear = useCallback(
    (id: string) =>
      setErrors((m) => {
        if (!(id in m)) return m;
        const next = { ...m };
        delete next[id];
        return next;
      }),
    [],
  );
  /** The items with each thrown failure shown where a returned one would be. */
  const apply = (items: McpItem[]): McpItem[] =>
    items.map((i) => {
      const e = errors[i.id] ?? errors[i.serverId];
      return e && !i.connected && !i.error ? { ...i, error: e } : i;
    });
  return { fail, clear, apply, errors };
}
