import { memo } from "react";
import { conversationUsage } from "../../state/billing/usage";
import { useChatSelector, shallowEqual } from "../../containers/providers/chatStore";
import { tokensToPages } from "../../send/contextFit";
import { useT } from "../../i18n";

/**
 * The conversation's size, in PAGES (never « tokens »), as a passive line of the chat's
 * ⋯ menu — no longer a permanent counter under the composer: most people never need it,
 * and « ↑ 12k · ↓ 3k tokens » read as jargon. Reads its usage from the store BY ID via a
 * shallow-equal selector + `memo`, so it does NOT re-render on every streamed token.
 */
export const ConversationTokens = memo(function ConversationTokens({ convId }: { convId: string }) {
  const u = useChatSelector((s) => {
    const c = s.conversations.find((cv) => cv.id === convId);
    return c ? conversationUsage(c) : null;
  }, shallowEqual);
  const t = useT();
  if (!u || u.total === 0) return null;
  return (
    <div className="conv-size-note" title={t.conversation.tokens.tip}>
      {t.conversation.tokens.line(tokensToPages(u.inputTokens), tokensToPages(u.outputTokens))}
    </div>
  );
});
