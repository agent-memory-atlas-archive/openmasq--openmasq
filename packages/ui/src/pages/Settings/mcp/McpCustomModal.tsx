import { useState } from "react";
import { ModalShell, ModalTitle } from "../../../containers/modals";
import { Btn } from "./McpBtn";
import { McpCustomWarning } from "./parts/McpCustomWarning";
import { McpErrorText } from "./parts/McpErrorText";

import { useT } from "../../../i18n";
/**
 * "Ajouter un serveur MCP" — the form for a server the app has NOT vetted.
 *
 * The risk is stated in `McpCustomWarning` and acknowledged with a checkbox that GATES
 * the submit: adding one is a deliberate act, not a slip. Everything the form collects
 * is re-decided in main (`mcp/server/customSpec.ts` + the SSRF guard) — the id is minted
 * there and the endpoint validated there, so this component validates only enough to
 * keep the button honest, and shows main's refusal in plain words (raw text folded).
 */
export function McpCustomModal({
  busy,
  onClose,
  onAdd,
}: {
  busy: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success (the caller then closes). */
  onAdd: (input: { name: string; url: string; apiKey?: string }) => Promise<string | null>;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !!name.trim() && !!url.trim() && understood && !busy;

  const submit = async () => {
    if (!ready) return;
    setError(null);
    const message = await onAdd({
      name: name.trim(),
      url: url.trim(),
      apiKey: apiKey.trim() || undefined,
    });
    if (message) setError(message);
    else onClose();
  };

  return (
    <ModalShell onClose={onClose} width="560px">
      {/* Same frame as the connector window: a padded head, then `.mcp-modal-body`. */}
      <div className="px-[22px] pt-[22px] pb-[14px]">
        <ModalTitle>{t.mcpTab.customTitle}</ModalTitle>
        <p className="mcp-modal-sub line-clamp-none">{t.mcpTab.customSub}</p>
      </div>
      <div className="mcp-modal-body">
        <McpCustomWarning />

        <label className="mcp-field-label" htmlFor="mcp-custom-name">
          {t.mcpTab.customName}
        </label>
        <input
          id="mcp-custom-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.mcpTab.customNamePlaceholder}
          className="mcp-url-input"
          autoComplete="off"
        />

        <label className="mcp-field-label" htmlFor="mcp-custom-url">
          {t.mcpTab.customUrl}
        </label>
        <input
          id="mcp-custom-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.mcpTab.customUrlPlaceholder}
          className="mcp-url-input"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="mcp-custom-url-hint"
        />
        <p id="mcp-custom-url-hint" className="mcp-field-hint">
          {t.mcpTab.customUrlHint}
        </p>

        <label className="mcp-field-label" htmlFor="mcp-custom-key">
          {t.mcpTab.customKey} <span className="mcp-field-opt">{t.mcpTab.optional}</span>
        </label>
        <input
          id="mcp-custom-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t.mcpTab.customKeyPlaceholder}
          className="mcp-url-input"
          autoComplete="off"
        />

        <label className="mcp-custom-ack">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
          <span>{t.mcpTab.customUnderstood}</span>
        </label>

        {/* Main's refusal, in the user's words (`connectorErrorText`), raw text folded. */}
        {error && <McpErrorText raw={error} className="mcp-custom-error" />}

        <div className="mcp-modal-actions">
          <Btn label={t.mcpTab.cancel} onClick={onClose} subtle disabled={busy} />
          <Btn
            label={busy ? t.mcpTab.adding : t.mcpTab.addAndConnect}
            onClick={() => void submit()}
            disabled={!ready}
            loading={busy}
          />
        </div>
      </div>
    </ModalShell>
  );
}
