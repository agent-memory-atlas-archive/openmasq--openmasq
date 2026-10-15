import { AgentCard, AgentCardDesc, AgentCardTitle, GlyphTile } from "../../components/agent/AgentCard";
import { ArrowRightIcon, EyeIcon, ShieldIcon } from "../../components/brand";
import { useT } from "../../i18n";

/**
 * The TRANSPARENCY card — shown once PER CONVERSATION, after its first reply that
 * actually masked something.
 *
 * Audit of 27/07: the product kept its promise without ever offering to verify it.
 * Hovering a brand and the line under each message already existed, but you have to
 * know they exist; the full comparison, meanwhile, lived in a log reserved for
 * the team. This card is the only moment where the product says "go see", and it says it
 * right when the proof was just produced.
 *
 * ⚠️ It never comes back in THAT conversation (`Settings.transparencySeenIn`): a card on
 * every turn becomes noise. After it, the « N masqués · voir » line, the permanent
 * « Voir ce que le modèle a vu » under each masked reply and the ⋯ menu keep the proof.
 *
 * It composes `AgentCard` like the other in-chat containers: a family, not one more
 * box (see `components/CLAUDE.md`).
 */
export function TransparencyCard({
  count,
  modelName,
  onOpen,
  onDismiss,
}: {
  /** Number of distinct values protected in this conversation. */
  count: number;
  modelName?: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <AgentCard
      className="transparency-card"
      role="group"
      ariaLabel={t.cards.transparency.ariaLabel}
      eyebrow={t.cards.transparency.eyebrow}
      tile={
        <GlyphTile>
          <ShieldIcon size={18} />
        </GlyphTile>
      }
      footer={
        <>
          <span className="agent-card-note">
            <EyeIcon size={13} />
            <span>{t.cards.transparency.note}</span>
          </span>
          <span className="agent-card-spacer" />
          <button className="btn-ghost btn-inline" onClick={onDismiss}>
            {t.cards.transparency.later}
          </button>
          <button className="btn-primary btn-inline" onClick={onOpen}>
            {t.cards.transparency.open} <ArrowRightIcon size={14} />
          </button>
        </>
      }
    >
      <AgentCardTitle>{t.cards.transparency.title(count)}</AgentCardTitle>
      <AgentCardDesc>
        {t.cards.transparency.desc(modelName ?? t.cards.transparency.theModel, count)}
      </AgentCardDesc>
    </AgentCard>
  );
}
