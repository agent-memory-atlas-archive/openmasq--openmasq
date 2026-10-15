/**
 * The EN catalogue's « onboarding » slice — translated from the source (`../fr/onboarding.ts`).
 *
 * `satisfies` per entry: the compiler demands EXACTLY the contract's keys
 * (`../messages/onboarding.ts`), ni plus ni moins.
 */
import type { Messages } from "../messages";

export const onboarding = {
  skip: "Skip the introduction",
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
    titleUnserved: "Your access to an AI model",
    subServed:
      "You can change this later.",
    subUnserved:
      "An access key is all you need to start. A model installed on your computer (Ollama, LM Studio…) can be connected too, later, in Settings → Models.",
    titleAgents: "Your subscription, or a key",
    subAgents:
      "With your Claude or ChatGPT subscription, your messages go through what you already pay for, no key. Otherwise, an access key.",
    required:
      "Pick one of the options above to continue: without access to a model, nothing can answer you.",
  },

  ready: {
    title: "Masking is on",
    eyebrow: "YOU'RE SET",
    subServed: (brand) =>
      `Masking needs no key and applies from your first message. A free model is already selected and works with your ${brand} account.`,
    subUnserved:
      "Masking applies from your first message, with no account. To get answers, you need access to a model: an access key, your Claude or ChatGPT subscription, or a model installed on your computer. You set it all up in Settings → Models.",
    subAgent: "Your messages go through your subscription, masked before each send.",
    subKey: "Your messages go out with your access key, masked before each send.",
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
      title: "My own access key",
      sub: "OpenRouter is a service that gives access to many models (ChatGPT, Claude, Mistral…), including free ones. You get its key in one click, and it stays encrypted on this computer. Paid use, if you choose it, is billed by OpenRouter.",
    },
    agent: {
      title: "My existing subscription (Claude, ChatGPT…)",
      sub: "Uses the subscription you already pay for, no key. If needed, the app installs and connects the matching app for you (Claude Code, Codex…).",
      hint: "Each message counts against your subscription. Its quota is shown in Settings → Models.",
    },
    recommended: "recommended",
    otherProvider: "Another service (OpenAI, Mistral…)",
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
