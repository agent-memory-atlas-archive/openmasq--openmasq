import { getMessages } from "@openmasq/i18n";
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { FailedTurnCard } from "./FailedTurnCard";
import { mount } from "../../testKit";
import { FeedbackOpenProvider } from "../../containers/providers/feedbackOpen";
import { failureKindOf, humanizeSendError } from "../../state/errors";

/** The « Crédits épuisés » card must offer a WAY OUT, not dead text (journal
 *  02/08: a blocked org member only had « Réessayer »). And its eyebrow stays
 *  honest: the key is a PROPOSED way out, not the cause of the block.
 *  The eyebrow reads the turn's CLASS (`errorKind`, from the error CODE), never the
 *  translated sentence: shortening a message, or the English catalogue, can't flip it. */
const t = getMessages("fr");
const QUOTA_RAW =
  'openrouter request failed (429): {"error":{"message":"Rate limit exceeded: free-models-per-day",' +
  '"metadata":{"limit_source":"openrouter_free_tier_daily"}}}';

describe("FailedTurnCard — un quota épuisé n'est pas un abonnement requis", () => {
  it("garde « Quota épuisé » au-dessus du vrai message de quota", async () => {
    const ui = await mount(
      <FailedTurnCard
        assistantId="a1"
        text={humanizeSendError(QUOTA_RAW, t)!}
        kind={failureKindOf(QUOTA_RAW)}
        action={{ kind: "upgrade_plan" }}
        onAction={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(ui.el.textContent).toContain("Quota épuisé");
    expect(ui.el.textContent).not.toContain("Abonnement requis");
    await ui.unmount();
  });

  it("la classe vient du CODE : le texte anglais garde le même eyebrow", async () => {
    const ui = await mount(
      <FailedTurnCard
        assistantId="a1"
        text={humanizeSendError(QUOTA_RAW, getMessages("en"))!}
        kind={failureKindOf(QUOTA_RAW)}
        action={{ kind: "upgrade_plan" }}
        onAction={() => {}}
      />,
    );
    expect(ui.el.textContent).toContain("Quota épuisé");
    await ui.unmount();
  });
});

describe("FailedTurnCard — le blocage crédits offre le geste clé", () => {
  const RAW = 'Error invoking remote method: {"error":"CREDITS_EXHAUSTED"}';

  it("crédits épuisés + CTA clé : eyebrow « Envoi impossible », bouton actif", async () => {
    const onAction = vi.fn();
    const ui = await mount(
      <FailedTurnCard
        assistantId="a1"
        text={humanizeSendError(RAW, t)!}
        kind={failureKindOf(RAW)}
        action={{ kind: "missing_key", provider: "openrouter", label: "OpenRouter" }}
        onAction={onAction}
        onRetry={() => {}}
      />,
    );
    expect(ui.el.textContent).toContain("Envoi impossible"); // never « Clé requise » here
    expect(ui.el.textContent).not.toContain("Clé requise");
    await ui.click(".btn-primary");
    expect(onAction).toHaveBeenCalledWith("a1", expect.objectContaining({ kind: "missing_key" }));
    await ui.unmount();
  });

  it("une vraie clé MANQUANTE garde son eyebrow « Clé requise »", async () => {
    const ui = await mount(
      <FailedTurnCard
        assistantId="a1"
        text="Clé manquante pour OpenRouter. Renseignez-la pour envoyer."
        action={{ kind: "missing_key", provider: "openrouter" }}
        onAction={() => {}}
      />,
    );
    expect(ui.el.textContent).toContain("Clé requise");
    await ui.unmount();
  });
});

describe("FailedTurnCard — « Signaler le problème »", () => {
  it("ouvre « Votre avis » prérempli quand l'hôte peut le recevoir", async () => {
    const openFeedback = vi.fn();
    const ui = await mount(
      <FeedbackOpenProvider value={{ openFeedback }}>
        <FailedTurnCard assistantId="a1" text="La réponse a échoué." onRetry={() => {}} />
      </FeedbackOpenProvider>,
    );
    expect(ui.el.textContent).toContain(t.turnStatus.report);
    await ui.click(".failed-report");
    expect(openFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ category: "bug", message: t.turnStatus.reportDraft }),
    );
    await ui.unmount();
  });

  it("absent sans destination (pas d'hôte d'avis)", async () => {
    const ui = await mount(<FailedTurnCard assistantId="a1" text="x" />);
    expect(ui.el.querySelector(".failed-report")).toBeNull();
    await ui.unmount();
  });
});
