import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hostOf, isLoopbackHost, isLoopbackOrigin, loopbackOnly } from "./loopbackOnly.js";

/**
 * The loopback-name guard lives in TWO apps that cannot import each other (rule 9): the
 * proxy's and this one. This pins the two copies to the SAME code — everything from the
 * host-name set down — so a fix on one side that misses the other fails here.
 */
const PROXY = join(__dirname, "../../../proxy/src/lib/localOnly.ts");
const OURS = join(__dirname, "loopbackOnly.ts");

/** The executable part: from the host-name set to the end, comments and blank lines dropped. */
function codeOf(file: string): string {
  const src = readFileSync(file, "utf8");
  return src
    .slice(src.indexOf("const LOOPBACK_HOSTS"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("/**"))
    .join("\n");
}

const run = (headers: Record<string, string | undefined>) => {
  let status = 0;
  let passed = false;
  const req = { headers } as never as Parameters<ReturnType<typeof loopbackOnly>>[0];
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    end() {},
  } as never as Parameters<ReturnType<typeof loopbackOnly>>[1];
  loopbackOnly("127.0.0.1")(req, res, () => {
    passed = true;
  });
  return { status, passed };
};

describe("broker loopbackOnly — same guard as the proxy", () => {
  it("is the proxy's code, line for line", () => {
    expect(codeOf(OURS)).toBe(codeOf(PROXY));
  });

  it("serves a caller that addressed us by a loopback name, with no Origin (main's Node client)", () => {
    expect(hostOf("[::1]:8787")).toBe("[::1]");
    for (const host of ["127.0.0.1:51234", "localhost:51234", "[::1]:51234"]) {
      expect(run({ host }).passed, host).toBe(true);
    }
  });

  it("REFUSES a rebound name and a cross-origin page", () => {
    const rebound = run({ host: "attacker.example:51234" });
    expect(rebound).toEqual({ status: 403, passed: false });
    expect(run({ host: "127.0.0.1:51234", origin: "https://attacker.example" })).toEqual({ status: 403, passed: false });
    expect(run({ host: "127.0.0.1:51234", origin: "null" }).passed).toBe(false);
    expect(run({}).passed).toBe(false);
    expect(isLoopbackHost("127.0.0.1", "127.0.0.1")).toBe(true);
    expect(isLoopbackOrigin("http://localhost:3000", "127.0.0.1")).toBe(true);
  });
});
