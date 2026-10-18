/**
 * The environment a jailed run starts with, beside what `sandbox.ts` sets for the run itself.
 *
 * - Every temp-dir variable, pointed INSIDE the scratch: the jail denies the system temp dirs.
 *   `SQLITE_TMPDIR` is read ahead of `TMPDIR`; set at SPAWN.
 * - On Windows, the system's own folder variables, and nothing else of the app's environment:
 *   without the profile folders (`USERPROFILE`, `LOCALAPPDATA`), Windows cannot place an
 *   AppContainer's folder and `CreateProcessW` refuses to start the run (ERROR_ENVVAR_NOT_FOUND,
 *   203), and without `SystemRoot` CPython cannot initialise its sockets and its random source.
 *   They are folder names; the jail still denies reading what they point to. `prove-jail.sh`
 *   runs the launcher with THESE variables only, as the app does.
 */
const WINDOWS_SYSTEM_ENV = ["SystemRoot", "SystemDrive", "windir", "USERPROFILE", "LOCALAPPDATA", "APPDATA"];

export function windowsSystemEnv(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Record<string, string> {
  if (platform !== "win32") return {};
  return Object.fromEntries(WINDOWS_SYSTEM_ENV.flatMap((k) => (env[k] ? [[k, env[k] as string]] : [])));
}

export function sandboxTempEnv(tmpDir: string): Record<string, string> {
  return { TMPDIR: tmpDir, TMP: tmpDir, TEMP: tmpDir, SQLITE_TMPDIR: tmpDir };
}

/** Both, for a run started on this machine. */
export function jailBaseEnv(tmpDir: string): Record<string, string> {
  return { ...windowsSystemEnv(process.platform, process.env), ...sandboxTempEnv(tmpDir) };
}
