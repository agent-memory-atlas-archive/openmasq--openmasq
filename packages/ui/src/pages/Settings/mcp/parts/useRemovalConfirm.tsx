import { useState } from "react";
import { ConfirmDialog } from "../../../../components/feedback/ConfirmDialog";

import { useT } from "../../../../i18n";

export type RemovalKind = "disconnect" | "forget";

/**
 * « Déconnecter » and « Supprimer ce connecteur » ASK FIRST, in the app's own dialog
 * (`ConfirmDialog`, the pattern every other destructive gesture uses). Both drop the
 * account's sign-in: one click on the wrong row used to cost a full reconnection, with
 * nothing to undo it. The host call stays the caller's (`run`); this only holds WHICH
 * removal is pending and renders the question.
 *
 * The dialog is rendered by the caller BESIDE the connector sheet, never inside it: the
 * sheet's panel is transformed while it animates, which would trap a nested fixed scrim.
 */
export function useRemovalConfirm(run: (kind: RemovalKind, serverId: string) => void) {
  const t = useT();
  const [pending, setPending] = useState<{ kind: RemovalKind; serverId: string; name: string } | null>(
    null,
  );

  const copy = pending?.kind === "forget" ? t.mcpTab.confirmForget : t.mcpTab.confirmDisconnect;
  const dialog = pending ? (
    <ConfirmDialog
      title={copy.title(pending.name)}
      message={copy.body}
      confirmLabel={copy.cta}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        setPending(null);
        run(pending.kind, pending.serverId);
      }}
    />
  ) : null;

  return {
    ask: (kind: RemovalKind, serverId: string, name: string) => setPending({ kind, serverId, name }),
    dialog,
  };
}
