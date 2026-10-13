// The one line the operator reads before approving a write. It is bounded, so WHAT survives
// the cut is the decision: the fields that say where the data goes (recipient, URL, path…)
// come first at every depth, whatever order the model wrote them in — a long body must
// never push the `to` out of sight. A cut is announced with how much was hidden, so a
// preview that ends early never reads as the whole call.

/** Destination-bearing keys, compared lower-cased with `_`/`-` removed. Order = display order. */
const RISK_KEYS = [
  "to",
  "cc",
  "bcc",
  "recipient",
  "recipients",
  "recipientid",
  "toaddress",
  "emailaddress",
  "email",
  "emails",
  "address",
  "phone",
  "url",
  "uri",
  "href",
  "link",
  "endpoint",
  "webhook",
  "webhookurl",
  "host",
  "domain",
  "path",
  "filepath",
  "file",
  "filename",
  "destination",
  "dest",
  "target",
  "channel",
  "channelid",
  "user",
  "userid",
  "repo",
  "repository",
  "owner",
  "share",
  "permission",
  "role",
];
const RANK = new Map(RISK_KEYS.map((k, i) => [k, i]));
const rank = (key: string): number =>
  RANK.get(key.toLowerCase().replace(/[-_]/g, "")) ?? RISK_KEYS.length;

/** The same value, every object's keys re-ordered risk-first (stable for the rest). */
function riskFirst(value: unknown, depth = 0): unknown {
  if (depth > 20 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => riskFirst(v, depth + 1));
  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => rank(a) - rank(b));
  return Object.fromEntries(entries.map(([k, v]) => [k, riskFirst(v, depth + 1)]));
}

/** The arguments as the real server will get them, on one bounded line. */
export function argsPreview(args: unknown, max = 220): string {
  let text: string;
  try {
    text = JSON.stringify(riskFirst(args)) ?? String(args);
  } catch {
    text = String(args);
  }
  if (text.length <= max) return text;
  const kept = text.slice(0, max);
  return `${kept}… [cut: ${text.length - kept.length} more chars not shown]`;
}
