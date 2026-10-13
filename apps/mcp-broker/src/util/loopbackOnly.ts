// The broker binds loopback, and loopback is where its callers are (main's MCP client, the
// user's browser during an OAuth round trip). This middleware makes the SERVER say so too.
//
// A browser resolves the name IT was given, not the address it reaches: a page on
// `attacker.example` whose DNS answers `127.0.0.1` talks to this process believing it is the
// same origin. The `Host` line carries the name the browser used; a name that is not loopback
// is a caller that did not mean to reach US. `Origin`, when present, must be loopback too —
// main's Node client sends none, a top-level OAuth navigation sends none, a cross-origin page
// does. Fail-CLOSED, 403 with no body.
//
// The proxy app holds the same guard (`apps/proxy/src/lib/localOnly.ts`); apps cannot import
// each other, so `loopbackOnly.parity.test.ts` pins the two copies to the same code.
import type { NextFunction, Request, Response } from "express";

/** The host NAMES a caller may legitimately use to reach a loopback-bound server. */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1", "0:0:0:0:0:0:0:1"]);

/** `host:port` → the host alone, keeping an IPv6 literal's brackets (`[::1]:8787` → `[::1]`). */
export function hostOf(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.startsWith("[")) return v.slice(0, v.indexOf("]") + 1) || v;
  const colon = v.lastIndexOf(":");
  return colon > 0 ? v.slice(0, colon) : v;
}

/** Is `value` (a `Host` line or a URL's authority) one of the loopback names? */
export const isLoopbackHost = (value: string | undefined, bound: string): boolean => {
  if (!value) return false;
  const host = hostOf(value);
  return LOOPBACK_HOSTS.has(host) || host === bound.toLowerCase();
};

/** Is `origin` a loopback ORIGIN — `http://127.0.0.1:8787`, `http://localhost`? */
export function isLoopbackOrigin(origin: string, bound: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return isLoopbackHost(u.host, bound);
  } catch {
    return false;
  }
}

/**
 * Refuse a request that did not address this process by a loopback name. Mounted FIRST, so it
 * covers every route — OAuth, the MCP endpoints, `/healthz` alike.
 */
export function loopbackOnly(bound: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isLoopbackHost(req.headers.host, bound)) {
      res.status(403).end();
      return;
    }
    const origin = req.headers.origin;
    // `null` is what a sandboxed/file origin sends — not one of ours either.
    if (typeof origin === "string" && origin !== "" && !isLoopbackOrigin(origin, bound)) {
      res.status(403).end();
      return;
    }
    next();
  };
}
