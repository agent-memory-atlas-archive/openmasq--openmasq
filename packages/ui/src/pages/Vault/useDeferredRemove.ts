import { useEffect, useRef, useState } from "react";

/**
 * The Coffre's delete safety net — DEFERRED, not restored: a term asked for deletion
 * stays in `Settings.coffre` (so it keeps being masked on every send) until the undo
 * window closes. Only then is `commit` called. Fail-closed by construction: during the
 * window, nothing about the redaction changed; « Annuler » just drops the request.
 *
 * Why not delete-then-restore like Mémoire: a vault term removed even for six seconds is
 * a term a send in another window would leave in clear.
 *
 * - A second request while one is pending commits the first (one toast, one net).
 * - Leaving the page (unmount) commits what is pending: the user asked for it, and the
 *   toast that offered the undo is gone with the page.
 */
export function useDeferredRemove<T extends { id: string }>(commit: (id: string) => void) {
  const [pending, setPending] = useState<T | null>(null);
  const pendingRef = useRef<T | null>(null);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const flush = () => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p) commitRef.current(p.id);
  };

  useEffect(() => {
    return flush;
  }, []);

  return {
    /** The term waiting for its window to close — hidden from the list, still masked. */
    pending,
    request: (item: T) => {
      flush();
      pendingRef.current = item;
      setPending(item);
    },
    /** « Annuler »: the deletion never happens. */
    undo: () => {
      pendingRef.current = null;
      setPending(null);
    },
    /** The toast's timer ran out: the deletion happens now. */
    expire: () => {
      flush();
      setPending(null);
    },
  };
}
