import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jailBaseEnv, windowsSystemEnv } from "./jailEnv";

describe("the environment a jailed run starts with", () => {
  it("on Windows carries the system's folder variables, and nothing else of the app's", () => {
    const env = { SystemRoot: "C:\\Windows", USERPROFILE: "C:\\Users\\a", LOCALAPPDATA: "C:\\Users\\a\\AppData\\Local", OPENAI_API_KEY: "sk-x", PATH: "x" };
    expect(windowsSystemEnv("win32", env)).toEqual({ SystemRoot: "C:\\Windows", USERPROFILE: "C:\\Users\\a", LOCALAPPDATA: "C:\\Users\\a\\AppData\\Local" });
    expect(windowsSystemEnv("darwin", env)).toEqual({});
  });

  it("points every temp variable into the scratch", () => {
    const env = jailBaseEnv("/scratch/tmp");
    for (const k of ["TMPDIR", "TMP", "TEMP", "SQLITE_TMPDIR"]) expect(env[k]).toBe("/scratch/tmp");
  });

  it("is what the run is spawned with (sandbox.ts)", () => {
    const src = readFileSync(new URL("./sandbox.ts", import.meta.url), "utf8");
    expect(src).toMatch(/\.\.\.jailBaseEnv\(tmpDir\)/);
  });
});
