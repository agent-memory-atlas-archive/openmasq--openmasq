import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import {
  AGENT_NONCE_ENV,
  agentChildEnv,
  agentLaunchAuthenticated,
  mintAgentNonce,
  readLineSync,
} from "./agentLaunch";

/** A reader over fixed bytes; `eagain` leading reads throw EAGAIN first. */
function reader(bytes: string, eagain = 0) {
  let i = 0;
  let pending = eagain;
  return (buf: Buffer) => {
    if (pending-- > 0) throw Object.assign(new Error("again"), { code: "EAGAIN" });
    if (i >= bytes.length) return 0;
    buf[0] = bytes.charCodeAt(i++);
    return 1;
  };
}

describe("launch handshake — the env flag alone never starts the agent browser", () => {
  const nonce = mintAgentNonce();
  const env = { OPENMASQ_AGENT_BROWSER: "1", [AGENT_NONCE_ENV]: nonce };

  it("runs when the stdin line matches the env nonce", () => {
    expect(agentLaunchAuthenticated(env, () => readLineSync(reader(`${nonce}\n{"type":"show"}\n`)))).toBe(true);
  });

  it("REFUSES a preset environment with no launcher on stdin (EOF, as from /dev/null)", () => {
    expect(agentLaunchAuthenticated(env, () => readLineSync(reader("")))).toBe(false);
  });

  it("REFUSES a flag with no nonce, or a malformed one", () => {
    expect(agentLaunchAuthenticated({ OPENMASQ_AGENT_BROWSER: "1" }, () => nonce)).toBe(false);
    expect(agentLaunchAuthenticated({ [AGENT_NONCE_ENV]: "1" }, () => "1")).toBe(false);
  });

  it("REFUSES a stdin line that differs from the env nonce", () => {
    expect(agentLaunchAuthenticated(env, () => mintAgentNonce())).toBe(false);
  });

  it("reads ONE line and nothing past it (the control channel continues)", () => {
    const r = reader(`${nonce}\nNEXT`);
    expect(readLineSync(r)).toBe(nonce);
    const b = Buffer.alloc(1);
    r(b);
    expect(b.toString()).toBe("N");
  });

  it("waits through EAGAIN, refuses an overlong line and a timeout", () => {
    expect(readLineSync(reader(`${nonce}\n`, 3))).toBe(nonce);
    expect(readLineSync(reader("x".repeat(500)))).toBeNull();
    let t = 0;
    expect(readLineSync(reader("", 1e9), 50, () => (t += 20))).toBeNull();
  });

  it("works on a REAL pipe: a child reads the nonce synchronously from fd 0", () => {
    const script = `
      const { readSync } = require("node:fs");
      const b = Buffer.alloc(1); let s = "";
      while (readSync(0, b, 0, 1, null) === 1 && b[0] !== 10) s += String.fromCharCode(b[0]);
      process.stdout.write(s === process.env.N ? "ok" : "ko");`;
    const res = spawnSync(process.execPath, ["-e", script], { input: `${nonce}\n`, env: { N: nonce } });
    expect(res.stdout.toString()).toBe("ok");
  });
});

describe("agentChildEnv — an allow-list, not inheritance", () => {
  const source = {
    HOME: "/home/u",
    PATH: "/bin",
    HTTPS_PROXY: "http://proxy:3128",
    NO_PROXY: "localhost",
    LANG: "fr_FR.UTF-8",
    TMPDIR: "/tmp/x",
    DISPLAY: ":0",
    WAYLAND_DISPLAY: "wayland-0",
    AWS_SECRET_ACCESS_KEY: "nope",
    GITHUB_TOKEN: "nope",
    OPENMASQ_AGENT_BROWSER: "preset",
    ELECTRON_RENDERER_URL: "http://localhost:5173",
  };

  it("keeps proxies, locale, temp and display; drops every secret and the dev-server URL", () => {
    const env = agentChildEnv({ OPENMASQ_AGENT_BROWSER: "1" }, source);
    expect(env).toMatchObject({
      HOME: "/home/u",
      HTTPS_PROXY: "http://proxy:3128",
      NO_PROXY: "localhost",
      LANG: "fr_FR.UTF-8",
      TMPDIR: "/tmp/x",
      DISPLAY: ":0",
      WAYLAND_DISPLAY: "wayland-0",
      OPENMASQ_AGENT_BROWSER: "1",
    });
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.ELECTRON_RENDERER_URL).toBeUndefined();
  });
});
