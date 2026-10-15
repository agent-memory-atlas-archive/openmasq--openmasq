import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useT } from "../../i18n";
import { EyeIcon, FileIcon, ShieldIcon } from "../../components/brand";
import { kindLabel } from "../../components/message/kindLabel";
import type { Item } from "./composerDetection";
import type { longTextStats } from "./composerDetection";

/** Chips shown collapsed — enough for one comfortable row. Past it, the row folds
 *  behind « +N autres » : a dense letter's 40 detections must not push the send row
 *  below the fold (kept values always stay visible — an un-redaction is a decision
 *  the user must be able to SEE and revert, never hidden by the fold). */
const CHIP_COLLAPSE_LIMIT = 8;

/**
 * The composer's small presentational leaves, peeled off `Composer.tsx` (LOC
 * ratchet): the per-value un-redact CHIPS row, and the LONG-DRAFT summary card
 * that replaces the inline textarea past `LONG_TEXT_THRESHOLD` (click → the
 * modal editor). Pure render — every decision stays with the caller.
 */

/** One chip per detected value: click toggles « envoyer en clair · ce message ».
 *  The same gesture exists directly ON the highlighted word (`MarkKeepMenu`) —
 *  this row stays the overview + the way BACK (re-mask a kept value).
 *  The glyphs say the STATE, never « dismiss »: a masked chip wears the shield and an
 *  eye (= « montrer au modèle »); a kept one wears the eye, a painted « en clair » and the
 *  shield to mask it again. The category is in the tooltip AND the accessible name, never
 *  only in the hue. `focusSignal` (the « N à masquer » pill) unfolds the row and focuses it. */
export function DetectChips({
  items,
  keepSet,
  onToggle,
  focusSignal = 0,
}: {
  items: Item[];
  keepSet: Set<string>;
  onToggle: (value: string) => void;
  focusSignal?: number;
}) {
  const t = useT();
  const mark = t.conversation.mark;
  const [expanded, setExpanded] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusSignal) return;
    setExpanded(true);
    rowRef.current?.querySelector<HTMLButtonElement>(".detect-chip")?.focus();
  }, [focusSignal]);
  // Kept (un-redacted) values are NEVER folded away: that decision must stay
  // visible and revertable. The fold only hides still-redacted chips.
  const shown = expanded
    ? items
    : items.filter(
        (it, i) => i < CHIP_COLLAPSE_LIMIT || keepSet.has(it.value),
      );
  const hidden = items.length - shown.length;
  return (
    <div className="detect-chips" ref={rowRef}>
      {shown.map(({ value, hue, kind, uncertain }) => {
        const kept = keepSet.has(value);
        // « À vérifier »: single-source detection and weak signal (see
        // `Detection.uncertain`). The chip SHOWS it — the value stays redacted
        // as long as the user doesn't keep it in clear (fail closed).
        const doubt = uncertain && !kept;
        const category = kindLabel(kind, t);
        const tip = kept
          ? mark.chipClear(category)
          : doubt
            ? `${category} · ${t.composer.detect.uncertain}`
            : mark.chipMasked(category);
        return (
          <button
            key={value}
            type="button"
            className={`detect-chip hl-${hue} ${kept ? "kept" : ""}${doubt ? " doubt" : ""}`}
            title={tip}
            aria-label={`${value} · ${tip}`}
            aria-pressed={kept}
            onClick={() => onToggle(value)}
          >
            {kept ? <EyeIcon size={11} /> : <ShieldIcon size={11} />}
            <span className="detect-chip-val">{value}</span>
            {kept && <span className="detect-clear-badge">{mark.clearBadge}</span>}
            {doubt && <span className="detect-chip-doubt">{t.composer.detect.toVerify}</span>}
            <span className="detect-chip-x" aria-hidden="true">
              {kept ? <ShieldIcon size={10} /> : <EyeIcon size={10} />}
            </span>
          </button>
        );
      })}
      {hidden > 0 && (
        <button
          type="button"
          className="detect-chip detect-more"
          title={t.composer.detect.showAll}
          onClick={() => setExpanded(true)}
        >
          {t.composer.detect.more(hidden)}
        </button>
      )}
      {expanded && items.length > CHIP_COLLAPSE_LIMIT && (
        <button
          type="button"
          className="detect-chip detect-more"
          title={t.composer.detect.collapseTip}
          onClick={() => setExpanded(false)}
        >
          {t.composer.detect.collapse}
        </button>
      )}
    </div>
  );
}

/** The collapsed long-draft card (chars · lines · first line), click to edit. Right
 *  after the paste that folded it, it holds the focus and Cmd/Ctrl+Z undoes the paste
 *  (`Composer/useLongPasteUndo.ts`). */
export function LongTextCard({
  stats,
  onOpen,
  cardRef,
  onKeyDown,
  canUndo,
}: {
  stats: ReturnType<typeof longTextStats>;
  onOpen: () => void;
  cardRef?: RefObject<HTMLButtonElement>;
  onKeyDown?: (e: KeyboardEvent) => void;
  canUndo?: boolean;
}) {
  const t = useT();
  return (
    <button
      ref={cardRef}
      type="button"
      className="composer-longtext"
      onClick={onOpen}
      onKeyDown={onKeyDown}
      title={t.composer.longText.openTip}
    >
      <FileIcon size={16} />
      <span className="composer-longtext-body">
        <span className="composer-longtext-title">
          {t.composer.longText.summary(stats.chars, stats.lines)}
        </span>
        {stats.preview && <span className="composer-longtext-preview">{stats.preview}</span>}
        {canUndo && <span className="composer-longtext-preview">{t.composer.longText.undoTip}</span>}
      </span>
      <span className="composer-longtext-cta">{t.composer.longText.edit}</span>
    </button>
  );
}
