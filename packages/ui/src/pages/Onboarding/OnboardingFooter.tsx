import { ArrowRightIcon, ChevLeftIcon } from "../../components/brand";
import { useT } from "../../i18n";

/**
 * The onboarding's footer: « Retour » (any screen but the first, and out of « Régler
 * finement »), « Passer l'introduction » (never while the access step is GATED — see
 * `Onboarding.tsx`), then « Suivant » / « Commencer ». `.ob-back` is NOT `.ob-skip`: the
 * gate's test asserts the skip is absent, and going back is never a way out.
 */
export function OnboardingFooter({
  rules,
  step,
  last,
  gated,
  onBack,
  onSkip,
  onNext,
  onFinish,
}: {
  rules: boolean;
  step: number;
  /** On the last step, the primary button finishes. */
  last: boolean;
  gated: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const t = useT();
  return (
    <div className="ob-footer">
      {(rules || step > 0) && (
        <button type="button" onClick={onBack} className="ob-back">
          <ChevLeftIcon size={16} /> {t.onboarding.back}
        </button>
      )}
      {!rules && !gated && (
        <button type="button" onClick={onSkip} className="ob-skip">
          {t.onboarding.skip}
        </button>
      )}
      <div className="flex-spacer" />
      {rules || last ? (
        <button type="button" onClick={onFinish} className="ob-next">
          {t.onboarding.start} <ArrowRightIcon size={17} />
        </button>
      ) : (
        <button type="button" onClick={onNext} className="ob-next">
          {t.onboarding.next} <ArrowRightIcon size={17} />
        </button>
      )}
    </div>
  );
}
