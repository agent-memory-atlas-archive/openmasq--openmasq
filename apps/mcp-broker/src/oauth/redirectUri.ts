/**
 * redirect_uri validation. Per RFC 8252 §7.3, native apps use a loopback
 * (127.0.0.1 / ::1 / localhost) redirect on an **ephemeral port** — our desktop
 * client picks a fresh port each login — so loopback URIs are matched ignoring the
 * port. The broker is a LOCAL sidecar whose only client is the app on this machine:
 * a redirect that is not loopback is never legitimate, so it is refused at
 * registration (`isRegistrableRedirect`) AND at authorization — an authorization code
 * never leaves the machine.
 */

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function isLoopback(u: URL): boolean {
  return (
    (u.protocol === "http:" || u.protocol === "https:") &&
    LOOPBACK_HOSTS.has(u.hostname.replace(/^\[|\]$/g, ""))
  );
}

/** May a client REGISTER this redirect? Loopback http(s), no credentials, no query/fragment. */
export function isRegistrableRedirect(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  return isLoopback(u) && !u.username && !u.password && u.search === "" && u.hash === "";
}

/** Compare two redirect URIs, treating loopback as port-insensitive. */
export function redirectUriMatches(candidate: string, registered: string): boolean {
  let a: URL;
  let b: URL;
  try {
    a = new URL(candidate);
    b = new URL(registered);
  } catch {
    return false;
  }
  if (isLoopback(a) && isLoopback(b)) {
    // Same scheme + host + path; PORT intentionally ignored. Query/hash must be absent.
    return (
      a.protocol === b.protocol &&
      a.hostname === b.hostname &&
      a.pathname === b.pathname &&
      a.search === "" &&
      a.hash === ""
    );
  }
  // Non-loopback: never (see the header).
  return false;
}

/** True iff `candidate` matches at least one of the client's registered URIs. */
export function isAllowedRedirect(candidate: string, registered: string[]): boolean {
  return registered.some((r) => redirectUriMatches(candidate, r));
}
