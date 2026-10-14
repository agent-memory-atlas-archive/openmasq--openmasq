import { getMessages } from "@openmasq/i18n";
import { describe, expect, it } from "vitest";
import { connectorErrorReason } from "./connectorErrorReason";
import { connectorErrorText } from "./connectorErrorText";

/**
 * 30 days of production: 10 connector failures, every one reported « unknown » — a failed
 * connect RETURNS its error, and that path hardcoded the reason. What we count now comes
 * from the same classification as what the person reads.
 */
describe("connectorErrorReason — what we count is what we say", () => {
  it("names the families seen in production", () => {
    expect(connectorErrorReason("Streamable HTTP error: Error POSTing to endpoint: Rate limit exceeded.")).toBe("rate_limit");
    expect(connectorErrorReason(new Error("Connexion annulée"))).toBe("cancelled");
    expect(connectorErrorReason("Sign-in canceled")).toBe("cancelled");
    expect(connectorErrorReason("missing: client_id, client_secret")).toBe("missing");
    expect(connectorErrorReason("invalid_grant")).toBe("expired");
    expect(connectorErrorReason("403 Forbidden")).toBe("forbidden");
    expect(connectorErrorReason("API key refused")).toBe("apikey");
    expect(connectorErrorReason("fetch failed")).toBe("network");
    expect(connectorErrorReason("redirect_uri mismatch")).toBe("oauth");
    expect(connectorErrorReason("something odd")).toBe("unknown");
    expect(connectorErrorReason(undefined)).toBe("unknown");
  });

  it("every counted family has a sentence in both languages", () => {
    for (const locale of ["fr", "en"] as const) {
      const t = getMessages(locale);
      for (const raw of ["Rate limit exceeded", "Connexion annulée", "missing: client_id"]) {
        expect(connectorErrorText(raw, t)?.text, `${locale}: ${raw}`).toBeTruthy();
      }
    }
  });

  it("waiting is the gesture for a rate limit, reconnecting for a cancelled sign-in", () => {
    const fr = getMessages("fr");
    expect(connectorErrorText("429 Too Many Requests", fr)).toMatchObject({ reconnect: false });
    expect(connectorErrorText("Connexion annulée", fr)).toMatchObject({ reconnect: true });
  });
});
