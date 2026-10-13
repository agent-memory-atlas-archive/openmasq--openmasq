// WHERE the app's own UI lives — the ONE definition the top-frame navigation guard
// (`window.ts`) and the IPC sender gate (`ipc/senderGate.ts`) both compare against.
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { devOnly } from "./security/devOnly";

/** The packaged renderer entry, next to the bundled main (`out/main` → `out/renderer`). */
export const APP_INDEX_HTML = join(__dirname, "../renderer/index.html");

/**
 * Is `url` the app's own page? Packaged (and any run without a dev server): EXACTLY the
 * bundled `index.html` (query and fragment ignored) — never "any `file://`", which would
 * include a downloaded HTML file holding `window.openmasq`. Dev: the dev server's ORIGIN.
 * Pure on its inputs so `appPage.test.ts` pins it without Electron.
 */
export function isAppPageUrl(
  url: string,
  indexHtml: string = APP_INDEX_HTML,
  devServer: string | undefined = devOnly(process.env["ELECTRON_RENDERER_URL"]),
  platform: NodeJS.Platform = process.platform,
): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (devServer) {
    try {
      return u.origin === new URL(devServer).origin && u.origin !== "null";
    } catch {
      return false;
    }
  }
  if (u.protocol !== "file:" || (u.host !== "" && u.host !== "localhost")) return false;
  let path: string;
  try {
    u.search = "";
    u.hash = "";
    path = resolve(fileURLToPath(u));
  } catch {
    return false;
  }
  const want = resolve(indexHtml);
  return platform === "win32" ? path.toLowerCase() === want.toLowerCase() : path === want;
}
