/**
 * A tool's THROWN error is model-facing text like its result: an upstream message routinely
 * echoes the arguments it was given (real values, after un-redaction) or a record it found.
 * So it crosses the same redactor before anyone reads it, and the redactor failing means
 * the message is replaced whole — never forwarded as it came.
 *
 * The error OBJECT is kept (mutated in place) when it can be: callers branch on its
 * name/class (`isAbortError`, `isDeadTransport` reads the SDK's own, PII-free text). Every
 * other channel that could carry the original text — `stack`, `cause`, an `McpError`'s
 * `data` — is rewritten or dropped.
 */
export const WITHHELD_ERROR =
  "The tool failed; its error message was withheld (it could not be masked).";

export async function redactError(
  err: unknown,
  redact: (text: string) => Promise<string>,
): Promise<Error> {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  let safe = WITHHELD_ERROR;
  if (raw) {
    try {
      safe = await redact(raw);
    } catch {
      safe = WITHHELD_ERROR;
    }
  }
  if (!(err instanceof Error)) return new Error(safe);
  try {
    err.message = safe;
    const head = `${err.name}: ${safe}`;
    const frames = typeof err.stack === "string" ? err.stack.split("\n    at ").slice(1) : [];
    err.stack = [head, ...frames].join("\n    at ");
    const bag = err as unknown as Record<string, unknown>;
    if ("cause" in bag) delete bag.cause;
    if ("data" in bag) delete bag.data;
    if (err.message !== safe) return new Error(safe);
    return err;
  } catch {
    return new Error(safe);
  }
}
