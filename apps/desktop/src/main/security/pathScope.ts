import { realpathSync } from "node:fs";
import { sep } from "node:path";

// The path primitives of every by-path confinement gate (`../fs/grant.ts`, `../ipc/readGate.ts`).
//
// ⚠️ `realpathSync` (the JS implementation) KEEPS the caller's casing: on a case-insensitive
// volume (APFS/HFS+ default, NTFS) `~/.SSH/id_ed25519` resolves to `~/.SSH/id_ed25519`, the
// same file as `~/.ssh/id_ed25519`. `realpathSync.native` returns the ON-DISK casing, so an
// existing path is compared in its canonical form. A path that does not exist yet (a deny entry
// not created, the trailing segments of a write) keeps the caller's casing whatever we do, so
// a DENY match is additionally case-folded on the platforms whose default volume ignores case.
// Folding only ever WIDENS a deny; an allow-root is compared exactly on canonical paths.

/** Canonical real path (symlinks followed, on-disk casing), or null when it doesn't resolve. */
export function realPathOrNull(p: string): string | null {
  try {
    return realpathSync.native(p);
  } catch {
    return null;
  }
}

/** True when `child` is `root` or strictly beneath it, by path SEGMENT (`/a/bc` is not under `/a/b`). */
export function isWithin(root: string, child: string): boolean {
  return child === root || child.startsWith(root + sep);
}

const foldsCase = (platform: NodeJS.Platform): boolean => platform === "darwin" || platform === "win32";

/** {@link isWithin}, case-insensitive on darwin/win32 — the form every DENY check uses. */
export function isWithinDenied(
  denied: string,
  child: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!foldsCase(platform)) return isWithin(denied, child);
  return isWithin(denied.toLowerCase(), child.toLowerCase());
}
