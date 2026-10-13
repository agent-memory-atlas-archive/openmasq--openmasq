import express from "express";
import { config, brokerUrl } from "./config.js";
import { discoveryRouter } from "./oauth/discovery.js";
import { oauthRouter } from "./oauth/router.js";
import { mcpRouter } from "./mcp/endpoint.js";
import { availablePlatforms } from "./platforms/registry.js";
import { loopbackOnly } from "./util/loopbackOnly.js";

/** The only interface the broker listens on. */
const LISTEN_HOST = "127.0.0.1";

/**
 * MCP broker entrypoint. Mounts the OAuth AS (discovery + /oauth), the per-platform
 * MCP endpoints, and a small public catalogue. The desktop app adds an HTTP MCP
 * server with URL `${PUBLIC_URL}/<platform>/mcp` and the existing OAuth connector
 * flow does the rest.
 */
export function createApp(): express.Express {
  const app = express();

  // Loopback callers only, by NAME as well as by bind (`util/loopbackOnly.ts`), FIRST so it
  // covers every route. No CORS header at all: no browser page is a client of the broker —
  // main calls it from Node, the browser only ever NAVIGATES to it (OAuth), and a
  // cross-origin page must not read a reply.
  app.use(loopbackOnly(LISTEN_HOST));
  // Conservative defaults: no sniffing, deny framing, no referrer.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.get("/platforms", (_req, res) =>
    res.json(
      availablePlatforms().map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.desc,
        mcpUrl: brokerUrl(`/${p.id}/mcp`),
      })),
    ),
  );

  app.use(discoveryRouter);
  app.use("/oauth", oauthRouter);
  app.use(mcpRouter);
  return app;
}

// Listen when run directly (tests/smoke import createApp without binding). The
// desktop sidecar sets BROKER_FORCE_LISTEN=1 so it never depends on argv matching.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain || process.env.BROKER_FORCE_LISTEN) {
  // Bind loopback only: a local sidecar must never be reachable off-machine.
  createApp().listen(config.port, LISTEN_HOST, () => {
    const ids = availablePlatforms().map((p) => p.id).join(", ");
    console.log(`[broker] listening on ${config.publicUrl}  platforms: ${ids}`);
  });
}
