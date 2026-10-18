import childProcess from "node:child_process";
import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

/**
 * Imported FIRST by a worker that parses what a user attaches (`../ocr/extractWorker.ts`): when
 * its parent says so (`OPENMASQ_OFFLINE=1`, a packaged app, whose OCR assets are baked and
 * pinned), the network and other programs are cut before any parser loads. Such a worker reads
 * the bytes it is handed and answers its parent; nothing in it has a reason to open a connection
 * or start a program, so a crafted file that takes over a parser finds neither.
 *
 * This holds against JavaScript. Against native code (the canvas, the inference runtime), only
 * an OS sandbox holds; this is the layer beneath it, never a substitute.
 */
export function cutOffline(): void {
  const refuse = (what: string) => () => {
    throw new Error(`${what} is off in this process`);
  };
  globalThis.fetch = (() => Promise.reject(new Error("network is off in this process"))) as typeof fetch;
  const cut = (target: object, names: string[], what: string) => {
    for (const name of names) Object.defineProperty(target, name, { value: refuse(what), writable: false, configurable: false });
  };
  cut(net, ["connect", "createConnection", "createServer"], "network");
  cut(tls, ["connect"], "network");
  cut(http, ["request", "get", "createServer"], "network");
  cut(https, ["request", "get", "createServer"], "network");
  cut(dgram, ["createSocket"], "network");
  cut(dns, ["lookup", "resolve", "resolve4", "resolve6"], "network");
  cut(childProcess, ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"], "starting a program");
}

if (process.env.OPENMASQ_OFFLINE === "1") cutOffline();
