/**
 * The Host's EMBEDDINGS — the Mémoire's semantic index, on-device only. There is
 * deliberately no slot that embeds through a network endpoint: what would be embedded is
 * conversation text, real PII.
 */

/**
 * Optional MÉMOIRE semantic index — ON-DEVICE embeddings of the memory cards (desktop:
 * bundled e5-small in a worker; the card text NEVER reaches a network embeddings API).
 * `sync` diffs + (re-)embeds + prunes; `edges` returns kNN cosine edges for the
 * clustered Mémoire view. Absent, or `sync` → `available:false` (bundle not baked):
 * the view degrades to the category graph — a convenience, nothing security-relevant.
 */
export interface MemoryIndexHost {
  sync(cards: { id: string; text: string }[]): Promise<{ available: boolean; total: number; indexed: number }>;
  edges(k?: number): Promise<{ a: string; b: string; sim: number }[]>;
  /** Semantic recall text→card (the `memory_search` tier): the query is
   *  embedded ON-DEVICE (e5 prefix `query:`) and compared against the cached vectors.
   *  Optional — an older host / a platform with no bundle doesn't have it, and the
   *  lexical search remains whole. */
  query?(text: string, k?: number): Promise<{ id: string; sim: number }[]>;
}
