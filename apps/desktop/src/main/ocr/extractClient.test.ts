import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Main parses a file in process ONLY when the worker cannot be born. A job the FILE made
 * fail (crash, OOM, stall) leaves that file in error and the worker path in place; a stalled
 * job is killed, so the next file gets a fresh worker instead of queueing behind it.
 */

class FakeChild extends EventEmitter {
  posted: unknown[] = [];
  killed = false;
  stderr = null;
  postMessage(m: unknown) {
    this.posted.push(m);
  }
  kill() {
    this.killed = true;
    return true;
  }
}

const children: FakeChild[] = [];
let onFork: (c: FakeChild) => void = () => {};

vi.mock("electron", () => ({
  app: { isPackaged: false },
  utilityProcess: {
    fork: () => {
      const c = new FakeChild();
      children.push(c);
      onFork(c);
      return c;
    },
  },
}));
vi.mock("node:fs", async (orig) => ({ ...(await orig<typeof import("node:fs")>()), existsSync: () => true }));
vi.mock("../runtime/errorReport", () => ({ reportMainError: vi.fn() }));
vi.mock("@openmasq/redact", () => ({ extractTimeoutMs: (pages: number) => 6 * 60_000 + pages * 60_000 }));
vi.mock("./extractStream", () => ({ checkStreamMessage: () => null }));
vi.mock("../runtime/quitState", () => ({ isAppQuitting: () => false }));

const req = { kind: "bytes" as const, data: "", name: "x.xlsx", locale: "fr" };
const fileOk = { name: "x.xlsx", kind: "xlsx", text: "ok", chars: 2 };

async function client() {
  vi.resetModules();
  return import("./extractClient");
}

beforeEach(() => {
  children.length = 0;
  onFork = () => {};
});
afterEach(() => vi.useRealTimers());

describe("in-process fallback only for a worker that cannot be born", () => {
  it("a worker that dies DURING a job (after ready) fails the file — main never parses it", async () => {
    const { runInWorker, workerOrInProcess } = await client();
    onFork = (c) => {
      queueMicrotask(() => {
        c.emit("message", { ready: true });
        c.emit("exit", 9); // the file crashed it
      });
    };
    const inProcess = vi.fn(async () => fileOk as never);
    await expect(workerOrInProcess(() => runInWorker(req), inProcess)).rejects.toThrow(/arrêté/);
    expect(inProcess).not.toHaveBeenCalled();
    // The next file still goes to a (new) worker.
    onFork = (c) => {
      queueMicrotask(() => {
        c.emit("message", { ready: true });
        c.emit("message", { id: 2, ok: true, file: fileOk });
      });
    };
    await expect(workerOrInProcess(() => runInWorker(req), inProcess)).resolves.toEqual(fileOk);
    expect(inProcess).not.toHaveBeenCalled();
    expect(children).toHaveLength(2);
  });

  it("a job that answers an error is the file's error, not a fallback", async () => {
    const { runInWorker, workerOrInProcess } = await client();
    onFork = (c) => {
      queueMicrotask(() => {
        c.emit("message", { ready: true });
        c.emit("message", { id: 1, ok: false, error: "out of memory" });
      });
    };
    const inProcess = vi.fn(async () => fileOk as never);
    await expect(workerOrInProcess(() => runInWorker(req), inProcess)).rejects.toThrow(/out of memory/);
    expect(inProcess).not.toHaveBeenCalled();
  });

  it("a child that exits BEFORE ready was never born: in process, for the session", async () => {
    const { runInWorker, workerOrInProcess, WorkerUnbornError } = await client();
    onFork = (c) => queueMicrotask(() => c.emit("exit", 1));
    const inProcess = vi.fn(async () => fileOk as never);
    await expect(workerOrInProcess(() => runInWorker(req), inProcess)).resolves.toEqual(fileOk);
    expect(inProcess).toHaveBeenCalledTimes(1);
    expect(new WorkerUnbornError("x")).toBeInstanceOf(Error);
  });
});

describe("a job past its deadline is killed with its worker", () => {
  it("rejects, kills the spinning child, and the next job forks a fresh one", async () => {
    vi.useFakeTimers();
    const { runInWorker } = await client();
    onFork = (c) => queueMicrotask(() => c.emit("message", { ready: true }));
    const stuck = runInWorker(req);
    const settled = expect(stuck).rejects.toThrow(/délai dépassé/);
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    await settled;
    expect(children[0]!.killed).toBe(true);
    void runInWorker(req).catch(() => {});
    expect(children).toHaveLength(2);
  });
});
