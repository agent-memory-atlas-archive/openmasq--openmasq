/**
 * The EN catalogue's « onboarding » slice — translated from the source (`../fr/onboarding.ts`).
 *
 * `satisfies` per entry: the compiler demands EXACTLY the contract's keys
 * (`../messages/onboarding.ts`), ni plus ni moins.
 */
import type { Messages } from "../messages";

export const onboarding = {
  skip: "Skip",
  back: "Back",
  next: "Next",
  start: "Start",

  redaction: {
    eyebrow: "MASKING",
    titleLead: "Write",
    titleHighlight: "freely",
    sub: (brand) =>
      `Before a message is sent, ${brand} finds sensitive data and replaces it with substitutes. The model sees only the substitutes. You keep seeing the real values.`,
    notoriety: {
      lead: "Public figures and major brands are ",
      strong: "not masked",
      tail: " by default, countries never: they identify no one.",
    },
    webReveal: {
      lead: (brand) => `Before a web search, ${brand} `,
      strong: "offers to unmask",
      tail: " what is masked. Otherwise the search would run on substitutes that do not exist.",
    },
  },

  access: {
    eyebrow: "MODEL ACCESS",
    titleServed: "A subscription, or your key",
    titleIncluded: "Your account, or your key",
    titleUnserved: "Your key, or a local model",
    subServed:
      "You can change this later.",
    subUnserved:
      "Your Claude Code / Codex subscription or an API key. You can change this later.",
    titleAgents: "Your subscription, or a key",
    subAgents:
      "With Claude Code or Codex, your messages go through the subscription you already pay for, no key. Otherwise, an API key.",
    required: "Add an API key or switch on your subscription to continue: without access, no model can answer you.",
  },

  ready: {
    title: "Masking is on",
    eyebrow: "YOU'RE SET",
    subServed: (brand) =>
      `Masking needs no key and applies from your first message. A free model is already selected and works with your ${brand} account.`,
    subUnserved:
      "Masking needs no account and applies from your first message. You only need access to a model: an API key, a local server, or your CLI.",
    subAgent: "Your messages go through your subscription, masked before each send.",
    subKey: "Your messages go out with your API key, masked before each send.",
    subLocal: "Your messages stay on your computer, masked before each send.",
    modelHint: "The model name is under the message box: click it to switch.",
    slashHint: {
      lead: "Type ",
      strong: "/",
      tail: " in the message box for your skills, your routines and “remember that…”.",
    },
    helpHint: {
      lead: "Not sure? ",
      strong: "Help",
      tail: ", at the bottom of the right sidebar, covers all of this, including the demo.",
    },
    tuneRedaction: "Fine-tune masking",
  },

  tune: {
    eyebrow: "MASKING",
    title: "Fine-tune",
    sub: "The defaults are recommended. You can change them any time in Settings → Privacy.",
  },

  keyChoice: {
    subscription: {
      title: (brand) => `My ${brand} account`,
      sub: "No key to manage: models use your subscription credits.",
    },
    included: {
      sub: "No key to manage: included models run under your account, most of them hosted in France.",
    },
    ownKey: {
      title: "My own API key",
      sub: "An OpenRouter key gives access to every model, including free ones, billed to your account. Get one in a click. It stays encrypted on this machine.",
    },
    agent: {
      title: "My Claude Code / Codex subscription",
      sub: "Uses the subscription you already pay for, no key. The app installs and connects Claude Code or Codex for you if needed.",
      hint: "Each message counts against your subscription. Its quota is shown in Settings → Models.",
    },
    recommended: "recommended",
    otherProvider: "Another provider",
    savedKey: (provider) => `${provider} key saved. You're ready.`,
    connect: "Get a key for free",
    connecting: "Waiting for approval in your browser…",
    retry: "Retry",
    connectTip: (brand) => `${brand} connects to your OpenRouter account. Usage is billed to your OpenRouter credits.`,
    connectHint: "Approve access on OpenRouter. The key is saved here, encrypted.",
    manualCreate: "Create the key manually",
    manualHave: "I already have an OpenRouter key",
    errorIncomplete: "The connection did not finish. Nothing was saved. Try again.",
    errorUnreachable: "Could not connect. Try again in a moment.",
    errorSaveFailed: "The key could not be saved. Try again.",
  },

  keySteps: {
    markDone: "Mark this step as done",
    openHost: (host) => `Open ${host} ↗`,
    placeholder: (provider, hint) => `${provider} key — ${hint}`,
    placeholderPlain: (provider) => `${provider} key`,
    save: "Save",
    saving: "Saving…",
    stepDone: (step) => `Mark step ${step} as done`,
    stepUndo: (step) => `Mark step ${step} as not done`,
  },
} satisfies Messages["onboarding"];
