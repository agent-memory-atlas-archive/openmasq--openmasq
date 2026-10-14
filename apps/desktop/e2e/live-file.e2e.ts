import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchApp } from "./helpers";
import { supabaseAuthStorageKey } from "./supabaseAuthKey";
import { stubSupabaseAuth } from "./supabaseStub";

/**
 * "The model writes, the user sees" — end to end, on the built app.
 *
 * The write here is done from OUTSIDE the renderer, exactly as the assistant's filesystem
 * tools do it (main → worker → disk). Nothing in the UI is clicked to refresh: if the panel
 * shows the new text, the watcher → IPC → panel chain works for a model write too.
 *
 * No API call, no cost. The folder grant goes through the REAL gate (audit M-4: a root is
 * only accepted if the NATIVE picker returned it), so the dialog is stubbed in MAIN — the
 * rest of the chain runs for real.
 */
// Temporary folder of THE executing machine, never a committed absolute path:
// the previous one named the personal directory of whoever had written it.
const SCRATCH = join(tmpdir(), "openmasq-e2e-live");
const ROOT = `${SCRATCH}/live-test`;
const FILE = `${ROOT}/notes.txt`;

const BEFORE = "Première version du document.";
const AFTER = "Version réécrite par l assistant.";

test("un fichier modifié sur le disque se recharge tout seul dans le panneau", async () => {
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(ROOT, { recursive: true });
  writeFileSync(FILE, BEFORE, "utf8");

  // A FRESH profile per run (the model-switch pattern): the machine's default profile keeps
  // its own state (an onboarding not done, a session), which outranks what the test seeds.
  const profile = join(SCRATCH, `profile-${process.pid}`);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  process.env.OPENMASQ_USER_DATA_DIR = profile;
  const { app, page } = await launchApp();
  await page.waitForLoadState("domcontentloaded");
  // A CONFIGURED build would refresh the fake token against the real project, be refused and
  // purge the session (`supabaseStub.ts`): neutralise it before seeding, as model-switch does.
  await stubSupabaseAuth(page);
  await page.evaluate((authKey) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(
      authKey,
      JSON.stringify({
        access_token: "fake",
        refresh_token: "fake",
        token_type: "bearer",
        expires_in: 999999,
        expires_at: now + 999999,
        user: { id: "u1", email: "e2e@acme.test", aud: "authenticated", role: "authenticated" },
      }),
    );
    // Both keys: a build with no auth service has no user, and reads the unscoped one.
    const settings = JSON.stringify({ onboarded: true, redactRulesSeen: true });
    for (const k of ["openmasq.settings", "openmasq.settings:u1"]) localStorage.setItem(k, settings);
    localStorage.setItem("openmasq.conversations:u1", "[]");
  }, supabaseAuthStorageKey());
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector(".rail-btn, .side-nav-item", { timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  // A test cannot click a native dialog — stub it in MAIN so `pickDir → notePickedDir →
  // addStdio → connect` runs for real against the real grant gate.
  await app.evaluate(({ dialog }, root) => {
    (dialog as unknown as { showOpenDialog: unknown }).showOpenDialog = async () => ({
      canceled: false,
      filePaths: [root],
    });
  }, ROOT);

  const granted = await page.evaluate(async (root) => {
    const api = (window as unknown as { openmasq: unknown }).openmasq as {
      mcp: {
        pickDir(): Promise<string | undefined>;
        addStdio(id: string, env: unknown, params: unknown): Promise<{ id?: string }>;
        connect(id: string): Promise<{ connected: boolean }>;
        remove(id: string): Promise<void>;
      };
      localFs?: { roots(): Promise<{ available: boolean; roots: string[] }> };
    };
    // The profile is REUSED between runs, so a previous test's grant is still installed and
    // `addStdio` would leave it in place — the browser would then open someone else's
    // folder. Start from nothing.
    await api.mcp.remove("local-filesystem").catch(() => undefined);
    await api.mcp.pickDir().catch(() => undefined);
    const added = await api.mcp.addStdio("filesystem", {}, { root: [root] }).catch(() => ({}));
    // `addStdio` MINTS the instance id (`local-<catalogId>`).
    await api.mcp.connect(added.id || "local-filesystem").catch(() => ({ connected: false }));
    return api.localFs?.roots();
  }, ROOT);
  // Assert OUR root, not merely "something is granted" — a stale grant from a previous run
  // would otherwise satisfy a weaker check and the test would browse the wrong folder.
  expect(granted?.roots, "notre dossier doit être accordé").toContain(ROOT);

  await page.getByRole("button", { name: "Bibliothèque", exact: true }).first().click().catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  await page.getByRole("button", { name: "live-test", exact: true }).first().click().catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  await page.getByRole("button", { name: "notes.txt", exact: true }).first().click().catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  // The file viewer shows the text itself (there is no edit mode to enter first).
  await expect(page.getByText(BEFORE)).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: `${SCRATCH}/live-01-before.png` });

  // THE point of the test: a write from outside, and NOTHING clicked afterwards.
  writeFileSync(FILE, AFTER, "utf8");
  await expect(page.getByText(AFTER)).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: `${SCRATCH}/live-02-after.png` });

  await app.close();
});
