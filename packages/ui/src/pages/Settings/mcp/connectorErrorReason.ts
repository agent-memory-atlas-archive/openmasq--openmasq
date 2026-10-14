import type { TrackEvent } from "../../../analytics";
import { connectorErrorFamily } from "./connectorErrorText";

/**
 * BOUNDED cause of a connector's connection failure, for measurement: the SAME
 * classification the user's sentence comes from (`connectorErrorFamily`), so what we count
 * and what we show cannot drift. Derived from the error message, never sent itself.
 * Accepts the thrown error OR the `error` string a failed connect returns.
 */
export function connectorErrorReason(
  e: unknown,
): Extract<TrackEvent, { name: "connector_error" }>["reason"] {
  const m = e instanceof Error ? e.message : String(e ?? "");
  const family = connectorErrorFamily(m);
  if (family) return family;
  if (/oauth|consent|redirect|authorization code|pkce/i.test(m)) return "oauth";
  return "unknown";
}
