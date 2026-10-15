import { connectorErrorText } from "../connectorErrorText";

import { useT } from "../../../../i18n";
/**
 * A connector failure in the modal: the plain sentence (`connectorErrorText`), and the raw
 * message folded behind « Détail technique » — out of the way, never lost. The ONE renderer
 * of a failure inside the sheet (the head error and each account row), so they cannot
 * disagree on what the user reads.
 */
export function McpErrorText({ raw, className }: { raw: string; className: string }) {
  const t = useT();
  const err = connectorErrorText(raw, t);
  if (!err) return null;
  return (
    <div className={className}>
      {err.text}
      {err.detail && (
        <details className="mcp-error-detail">
          <summary>{t.mcpTab.technicalDetail}</summary>
          <code>{err.detail}</code>
        </details>
      )}
    </div>
  );
}
