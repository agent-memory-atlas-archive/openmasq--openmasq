import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./index.js";

/** The broker serves loopback callers only, and no browser page may read a reply. */
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let port = 0;

beforeAll(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", () => r()));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

function get(path: string, headers: Record<string, string>) {
  return new Promise<{ status: number; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      res.resume();
      resolve({ status: res.statusCode ?? 0, headers: res.headers });
    });
    req.on("error", reject);
    req.end();
  });
}

describe("createApp — loopback by name, no CORS", () => {
  it("answers a loopback-addressed caller, without any CORS grant", async () => {
    const r = await get("/healthz", { host: `127.0.0.1:${port}` });
    expect(r.status).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("REFUSES a DNS-rebound Host and a cross-origin page", async () => {
    expect((await get("/healthz", { host: `attacker.example:${port}` })).status).toBe(403);
    expect((await get("/platforms", { host: `127.0.0.1:${port}`, origin: "https://attacker.example" })).status).toBe(403);
  });
});
