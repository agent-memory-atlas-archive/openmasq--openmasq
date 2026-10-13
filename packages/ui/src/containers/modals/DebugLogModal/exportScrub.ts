import type { DebugEntry } from "../../../state/debug/debug";

/**
 * The « sans mapping » export holds NO real value the journal knows of. Entries also keep
 * text that never went through the redactor — a refusal's journal line, a server's raw error
 * quoting a real argument, a real file name in a phase label — so the serialized export is
 * re-masked here with the vaults its own entries carry: every real value becomes the fake it
 * already has, in each form a URL or a form body gives it (`+`, %-escapes), any casing.
 * Residual: a real value no vault holds (never detected) stays as written.
 */
export function scrubWithVaults(text: string, entries: readonly DebugEntry[]): string {
  const realToFake = new Map<string, string>();
  for (const e of entries) {
    const vault = "vault" in e ? e.vault : undefined;
    if (!vault) continue;
    for (const [fake, real] of Object.entries(vault)) {
      if (typeof real === "string" && real.trim() && !realToFake.has(real)) realToFake.set(real, fake);
    }
  }
  if (!realToFake.size) return text;
  // Longest first: a full name is replaced before the first name inside it.
  const reals = [...realToFake.keys()].sort((a, b) => b.length - a.length);
  let out = text;
  for (const real of reals) {
    const fake = realToFake.get(real)!;
    const forms = new Set([real, real.replace(/ /g, "+"), encodeURIComponent(real), encodeURIComponent(real).replace(/%20/g, "+")]);
    for (const form of forms) {
      const esc = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // A short value only as a whole token, or it would mangle every word containing it.
      const pattern = real.length < 4 ? `(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])` : esc;
      out = out.replace(new RegExp(pattern, "giu"), fake);
    }
  }
  return out;
}
