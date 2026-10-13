import type { ConvSeed } from "@openmasq/redact/pdf-redact";
import { mintRedactionKey } from "../../send/redactionKey";

/**
 * The SEED a drop-time masking mints its fakes under. The send REUSES a document's map
 * (`reusableDocReplacements`), so its fakes must follow a SECRET value→fake mapping like
 * every other fake of the conversation — never the public one (salt 0, no key), which a
 * table precomputed over the fake pools reverses.
 *
 * The conversation's own salt and key when it has them (pinned at its first redaction);
 * otherwise a seed minted from the CSPRNG for the staging it is dropped into, kept for the
 * session so every file of one draft shares it (one person, one fake across two files).
 * Any secret seed holds the property: the reused pairs enter the vault as they are.
 */
const minted = new Map<string, { salt: number; key: string }>();
const MAX_KEYS = 64;

export function dropSeed(stagedKey: string, conv?: ConvSeed): ConvSeed {
  let own = minted.get(stagedKey);
  if (!own && (conv?.salt === undefined || conv.key === undefined)) {
    const salt = (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff) || 1;
    own = { salt, key: mintRedactionKey() };
    minted.set(stagedKey, own);
    if (minted.size > MAX_KEYS) minted.delete(minted.keys().next().value as string);
  }
  return { salt: conv?.salt ?? own?.salt, key: conv?.key ?? own?.key, mode: conv?.mode };
}

/** True when `seed` is a SECRET mapping (a salt AND a key). */
export const isSeeded = (seed: ConvSeed): boolean => !!seed.salt && !!seed.key;
