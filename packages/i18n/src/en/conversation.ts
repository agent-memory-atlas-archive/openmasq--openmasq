/**
 * The « conversation » slice of the EN catalogue: the conversation screen, its agent
 * browser, and everything that frames a message.
 */
import type { Messages } from "../messages";

export const conversation = {
  greeting: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
  starters: {
    cardTip: (category, prompt) => `${category} — ${prompt}`,
    cardAria: (category, prompt) => `${category}: ${prompt}`,
    dismiss: "Don't show again",
    withServices: "With your services",
    cats: {
      "follow-up": "Client follow-up",
      "contract-review": "Legal",
      "hr-review": "HR",
      memory: "Memory",
      "chat-catchup": "Messages",
      "notes-find": "Notes",
      "files-find": "Files",
    },
    prompts: {
      "follow-up": (domain) =>
        `Write a polite reminder to Camille Salvi (camille.salvi@${domain}): her invoice F-2026-114 for €4,820 has been unpaid for 30 days. Remind her of our IBAN FR76 3000 6000 0112 3456 7890 189.`,
      "contract-review": () =>
        "Flag the risky clauses in this excerpt: \"Lucane SAS, SIREN 732 829 320, 12 rue des Tanneurs, Lyon, represented by Marc Wulff, commits for 36 months with no early termination; any amount due bears interest at 15% a year.\"",
      "hr-review": () =>
        "Summarize this review in three actions: \"Annual review of Julien Moreau, born 03/14/1988, reachable at +33 6 12 34 56 78. His manager Sophie Bernard proposes a 6% raise and a training course in March.\"",
      memory: () =>
        "Remember that on the Horizon project, my client Camille Salvi (Atelier Lucane) approves the mock-ups and Marc Wulff handles invoicing.",
      "chat-catchup": (_d, service) =>
        `Summarize what I missed this week on ${service}, and list what is waiting for a reply from me.`,
      "notes-find": (_d, service) =>
        `Find the notes from my last project meeting in ${service}, and list the decisions made.`,
      "files-find": (_d, service) =>
        `Find the latest quote I received in ${service}, and pull out the amount and the key dates.`,
    },
  },

  artifact: { pane: "File preview", copy: "Copy", copied: "Copied", close: "Close" },

  browser: {
    pane: "Built-in browser",
    bookmarks: "Bookmarks",
    askAboutPage: "Ask a question about this page",
    askAboutPageLabel: "Ask about this page",
    embedded: "Built-in browser",
    unavailable: "The built-in browser is not available on this platform.",
    loading: "Loading the built-in browser…",
    offlineTitle: "The browser is off.",
    offlineSub: (brand) =>
      `Turn it on to browse the web here, and to let ${brand} search it for you.`,
    activating: "Turning on…",
    activate: "Turn on the browser",
    searchEngine: "Search engine",
    back: "Back",
    forward: "Forward",
    reload: "Reload",
    urlPlaceholder: "Search or type an address",
    urlAria: "Address or search",
    closeBrowser: "Close browser",
    close: "Close",
  },

  resizePanel: "Resize panel",
  suspendedTitle: "Access suspended by your organization",
  suspendedBody: "Sending is blocked. Contact your organization's administrator.",
  docPrep: {
    analysing: "Analyzing the document…",
    redacting: "Masking the document…",
    page: (page, total) => ` · page ${page} / ${total}`,
    pages: (total) => ` · ${total} page${total > 1 ? "s" : ""}`,
    ofCount: (idx, count) => ` (${idx}/${count})`,
  },
  chooseFolder: "Choose folder",
  folderPickFailed: "folder selection failed",
  folderGrantFailed: "authorization failed",
  slashRemember: {
    label: "Remember",
    desc: "Inserts “Remember that…”. The fact is saved to Memory, on this device.",
  },
  opening: "Opening…",
  memoryToast: "Noted in memory",
  clarify: "Clarify",

  writeConfirm: {
    alsoOtherChats: "Also in my other conversations (until I quit the app)",
  },

  skillTag: {
    show: "Show the prompt sent to the model",
    hide: "Hide prompt",
    promptEyebrow: "Prompt sent to the model",
    edit: "Edit",
    unavailable: "Prompt unavailable for this message.",
  },

  memory: {
    usedTip:
      "Memory cards included with this message, masked like the rest. Click to open Memory.",
    used: (labels) => `Memory used — ${labels}`,
    skippedTip:
      "These cards matched but were not sent with this message. Click to open the card.",
    skipped: (parts) => `Memory: ${parts}`,
    homographs: (labels, count) =>
      `${labels} not included: the name alone is too common. Write it in full.${count > 1 ? "" : ""}`,
    budget: (n) => `${n} card${n > 1 ? "s" : ""} left out: not enough room`,
    pendingTip: "Extracting. The result will appear here.",
    pending: "Saving to memory…",
    failedTip:
      "Nothing could be saved to memory. Ask “remember…” again to retry.",
    failed: "Saving to memory failed. Nothing was saved. Try again.",
    notedTip: "Saved to Memory on this device, because you asked",
    preferenceSaved: "Preference saved to memory",
    nothingDurable: "Nothing to remember here",
    undone: "Removed from memory",
    noted: (facts, profile, updatedSuffix) =>
      `${facts === 1 ? "1 fact noted" : `${facts} facts noted`}${profile ? " + profile" : ""}${updatedSuffix} in memory`,
    updatedSuffix: (n) => ` · ${n === 1 ? "1 card updated" : `${n} cards updated`}`,
    undo: "Undo",
    undoTip: "Remove from memory what this request created",
  },

  actions: {
    copy: "Copy",
    copied: "Copied",
    regenerate: "Regenerate",
    fork: "Duplicate the conversation from here",
    feedback: "Give feedback on this reply",
  },

  replyNotice: {
    failed: "Sending failed. Open the conversation to try again.",
    ready: (model) => `Reply ready · ${model}`,
    readyPlain: "Reply ready.",
  },

  bubble: {
    openAttachment: (name) => `Open ${name}`,
    plotTip: "Chart request. The computation runs on your computer.",
    plot: "Chart",
    redactionFailedTip: "The masking model failed for this message",
    redactedTip: "Replaced with a substitute before reaching the model, restored in its reply",
    protectedCount: (n) => `${n} protected`,
    protectedSee: "see",
    autoRoutedTip:
      "Auto mode: the model for this reply was chosen automatically, based on the task.",
    quotaTip: "Requests left on this model",
    reasoning: "Reasoning",
    imageWithheld: "Image withheld: it may contain a masked value",
    imageWithheldLoad: "Load",
    showAll: "Show all",
    showLess: "Show less",
  },

  docs: {
    filesCount: (n) => `${n} file${n > 1 ? "s" : ""}`,
    showFiles: "Show the files",
    generatedBy: (brand) => `Made by ${brand}`,
    clippedTag: "cut",
    clipped: (name, max) => `Only the first ${max} characters of ${name} were sent to the model.`,
    others: (n) => `${n} other${n > 1 ? "s" : ""}`,
    weight: (pct, model) =>
      `The documents in this conversation fill about ${pct}% of what ${model} can read at once. Every question sends them again.`,
    weightOver: (model) =>
      `The documents in this conversation are more than ${model} can read at once: the oldest aren't sent anymore.`,
    dropped: (names) =>
      `The model no longer reads ${names}: the conversation got too long for it.`,
    roomHint: "To keep room, pick a model that accepts longer texts, or start a new conversation.",
  },

  trace: {
    connector: "connector",
    calling: "Calling tools…",
    running: "running…",
    actionsRunning: (n) => `${n} action${n > 1 ? "s" : ""} · running…`,
    actionsDone: (n) => `${n} action${n > 1 ? "s" : ""} · done`,
    retrying: (attempt) => `retrying (attempt ${attempt})`,
    attempts: (n) => `${n} attempts`,
    failed: "failed",
    failedWith: (note) => `failed — ${note}`,
    declined: "declined",
  },

  thinking: {
    writing: "The model is writing the reply",
    reflecting: "The model is thinking",
    preparing: "The model is preparing the reply",
  },

  tokens: {
    line: (read, written) =>
      `Conversation size: about ${read} page${read === 1 ? "" : "s"} read by the model, about ${written} written`,
    tip: "The model rereads the whole conversation with every message, so this grows with each exchange. An estimate.",
  },

  mark: {
    realValue: "real value",
    seenByModel: "seen by the model",
    seenByModelTip: "Value seen by the model",
    shownAs: (token) => `On screen, this stand-in shows as ${token}`,
    realValueTip: "Real value. Sent unmasked only if you unmask it.",
    orgForced: "Enforced by your organization",
    scopeSend: "this send",
    scopeConversation: "this conversation",
    scopeMessage: "this message",
    leaveClear: (scope) => `Unmask · ${scope}`,
    leaveClearTip:
      "The model will receive the real value in your next sends. Masking again protects the next sends, not the ones already gone.",
    reMask: (scope) => `Mask again · ${scope}`,
    reMaskTip: "Mask this value again",
    revealOne: {
      conversation: "Stop masking this term in this conversation",
      send: "Send this term unmasked with this message",
    },
    revealOneTip: {
      conversation:
        "Your next messages will send the real value to the model. Messages already sent don't change.",
      send: "Only this message will send the real value to the model. The term stays masked afterwards.",
    },
    reMaskOne: "Mask this term again",
    revealKind: {
      message: (label) => `Stop masking the “${label}” category in this message`,
      document: (label) => `Send the whole “${label}” category in this document unmasked`,
    },
    revealKindTip: {
      message:
        "Values of this type found in this message will go out unmasked in your next messages. A new value of this type stays masked.",
      document: "Values of this type in this document will go out unmasked with this message.",
    },
    reMaskKind: {
      message: (label) => `Mask the “${label}” category in this message again`,
      document: (label) => `Mask the “${label}” category in this document again`,
    },
    notSensitive: "This isn't sensitive",
    notSensitiveTip:
      "For a detection mistake: the term is no longer masked, in this document and in the whole conversation. To mask it again, select it.",
    chipMasked: (category) => `${category} · masked before sending. Click to send it unmasked with this message.`,
    chipClear: (category) => `${category} · sent unmasked with this message. Click to mask it again.`,
    clearBadge: "unmasked",
    willBeReplaced: (category) => `${category} · replaced with a fake before sending`,
    reportTip: "Opens “Your feedback”, prefilled. Never paste the real value into it.",
    report: "Report a mistake",
    sheetLabel: "Masking",
  },

  struggle: {
    thisModel: "This model",
    failedTip: (tool) => (tool ? `A tool call did not go through: ${tool}` : "A tool call did not go through"),
    unknownTool: (connector, action) =>
      `${connector} has no “${action}” action.`,
    ownKeysHint: "Some actions require your own access keys.",
    ownKeysHintWithPath:
      "Open it in Settings → Connectors: some actions require your own access keys.",
    connectorError: (connector, action) =>
      `${connector} refused the action “${action}”. Switching models won't help. Most often, access to the account has expired:`,
    reconnect: "reconnect it, then ask again.",
    reconnectWithPath: "reconnect it in Settings → Connectors, then ask again.",
    noToolUsed: (who) =>
      `${who} answered without using your connectors. Models with stronger tool support (Claude, for example) use them more reliably: switch models below the message, then ask again.`,
    badCall: (who, action) =>
      `${who} could not form a valid request for “${action}”. Models with stronger tool support (Claude, for example) usually can: switch models below the message.`,
    reconnectTip: (connector) => `Open ${connector} settings to reconnect the account`,
    reconnectCta: "Reconnect",
  },
} satisfies Messages["conversation"];
