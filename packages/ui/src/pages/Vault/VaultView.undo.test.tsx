// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { mount } from "../../testKit";
import { VaultView } from "./VaultView";
import type { VaultTerm } from "../../types";

/**
 * The Coffre's « Annuler » is DEFERRED, never delete-then-restore: while the toast
 * lives, the term is still in the coffre (so still masked on every send) and
 * `onRemove` has not been called. Only the toast's expiry — or leaving the page —
 * commits the deletion.
 */
const TERMS: VaultTerm[] = [
  { id: "a", value: "Projet Northwind", token: "ORG" } as VaultTerm,
  { id: "b", value: "Jeanne Martin", token: "NAME" } as VaultTerm,
];

function render(onRemove: (id: string) => void) {
  return mount(
    <VaultView coffre={TERMS} conversations={[]} onAdd={() => {}} onRemove={onRemove} onOpenConversation={() => {}} />,
  );
}

describe("VaultView — suppression annulable", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ne retire rien du coffre pendant la fenêtre d'annulation", async () => {
    const onRemove = vi.fn();
    const ui = await render(onRemove);
    await ui.click(ui.findAll(".om-vault-del")[0]!);
    expect(onRemove).not.toHaveBeenCalled();
    expect(ui.findAll(".om-vault-row")).toHaveLength(1);
    expect(ui.maybe(".om-toast-act")?.textContent).toBe("Annuler");
    await ui.unmount();
  });

  it("« Annuler » : la suppression n'a jamais lieu", async () => {
    const onRemove = vi.fn();
    const ui = await render(onRemove);
    await ui.click(ui.findAll(".om-vault-del")[0]!);
    await ui.click(".om-toast-act");
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onRemove).not.toHaveBeenCalled();
    expect(ui.findAll(".om-vault-row")).toHaveLength(2);
    expect(ui.maybe(".om-toast")).toBeNull();
    await ui.unmount();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("à l'expiration du toast, le terme est supprimé, une seule fois", async () => {
    const onRemove = vi.fn();
    const ui = await render(onRemove);
    await ui.click(ui.findAll(".om-vault-del")[0]!);
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("a");
    await ui.unmount();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("quitter la page pendant la fenêtre confirme la suppression demandée", async () => {
    const onRemove = vi.fn();
    const ui = await render(onRemove);
    await ui.click(ui.findAll(".om-vault-del")[1]!);
    await ui.unmount();
    expect(onRemove).toHaveBeenCalledWith("b");
  });

  it("une deuxième suppression confirme la première", async () => {
    const onRemove = vi.fn();
    const ui = await render(onRemove);
    await ui.click(ui.findAll(".om-vault-del")[0]!);
    await ui.click(ui.findAll(".om-vault-del")[0]!);
    expect(onRemove).toHaveBeenCalledWith("a");
    expect(onRemove).not.toHaveBeenCalledWith("b");
    await ui.unmount();
  });
});
