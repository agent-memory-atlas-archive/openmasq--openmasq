import { PROVIDERS, type ModelInfo } from "@openmasq/llm";
import { AlertIcon, CheckIcon, ModelLogo } from "../../../components/brand";
import { modelDisplay } from "../../../prompt/models";

import { useT } from "../../../i18n";
/**
 * WHAT ANSWERS WHEN A CONVERSATION IS OPENED — named at the top of the screen.
 *
 * This page's setting is ONE choice, but its result was readable nowhere:
 * you had to scroll through ~400 cards and spot the one with a checkmark (reported
 * on 11/08). A setting whose value you cannot read is not a setting.
 *
 * The row is a BUTTON, and its only gesture shows the model's card in the right
 * panel — never changing the default: you don't change a setting by clicking its
 * statement. Absent when no model matches (an account with no access), rather than an
 * empty state that would read as a failure.
 *
 * A default that CANNOT send (no key for it yet) loses the check: a green tick over a model
 * that will refuse the first message is a promise the next screen breaks. It says why
 * instead, beside the one gesture that fixes it.
 */
export function DefaultModelSummary({
  model,
  onPreview,
  unavailable,
  onFix,
}: {
  model: ModelInfo | undefined;
  /** Show this model's card in the detail panel. */
  onPreview: (id: string) => void;
  /** Why the default cannot send right now (`unavailableLabel`), or absent when it can. */
  unavailable?: { chip: string; title: string };
  /** The fix, when there is one here (the provider's key modal). */
  onFix?: () => void;
}) {
  const t = useT();
  if (!model) return null;
  const display = modelDisplay(model);
  return (
    <div className="model-default-row">
    <button
      type="button"
      className={`model-default-summary${unavailable ? " blocked" : ""}`}
      title={t.modelPicker.defaultSummaryTip}
      onMouseEnter={() => onPreview(model.id)}
      onClick={() => onPreview(model.id)}
    >
      <span className="model-default-check">
        {unavailable ? <AlertIcon size={14} /> : <CheckIcon size={14} />}
      </span>
      <ModelLogo provider={model.provider} modelId={model.id} size={22} tile />
      <span className="model-default-body">
        <span className="model-default-label">{t.modelPicker.defaultSummaryLabel}</span>
        <span className="model-default-name">
          {display.label}
          {display.free && <span className="model-free-badge">{t.modelsTab.freeBadge}</span>}
          <span className="model-default-provider">{PROVIDERS[model.provider].label}</span>
        </span>
      </span>
    </button>
      {unavailable && (
        <button
          type="button"
          className="model-default-fix"
          title={unavailable.title}
          onClick={onFix}
          disabled={!onFix}
        >
          {onFix ? t.modelsTab.defaultFix(unavailable.chip) : unavailable.chip}
        </button>
      )}
    </div>
  );
}
