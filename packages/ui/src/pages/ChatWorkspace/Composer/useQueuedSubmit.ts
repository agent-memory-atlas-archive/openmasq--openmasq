import { useEffect, useState } from "react";

/**
 * Enter pressed while the live preview still analyses (or a file is read): the message is
 * SENT once that ends, never silently dropped — the send re-detects anyway, the preview is
 * only an aperçu. Typing again cancels the request: the draft is no longer the one asked.
 */
export function useQueuedSubmit(busy: boolean, input: string, onSubmit: () => void) {
  const [queued, setQueued] = useState(false);
  useEffect(() => setQueued(false), [input]);
  useEffect(() => {
    if (!queued || busy) return;
    setQueued(false);
    onSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, busy]);
  const request = () => (busy ? setQueued(true) : onSubmit());
  return { queued: queued && busy, request };
}
