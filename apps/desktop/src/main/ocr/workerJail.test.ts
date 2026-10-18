import { describe, expect, it } from "vitest";
import { workerCommand, workerSeatbelt } from "./workerJail";

const base = { node: "/r/node/node", nodeReal: "/real/node", script: "/r/sandboxed/extractWorker.mjs", read: ["/r/sandboxed", "/r/node"], write: ["/tmp/x"], home: "/Users/a", memoryMb: 4096 };

describe("the extraction worker's jail", () => {
  it("macOS: no network, no other program, no write but its folder, nothing of home but the grants", () => {
    const p = workerSeatbelt({ read: ["/r"], write: ["/tmp/x"], exec: "/real/node", home: "/Users/a" });
    expect(p).toContain("(deny network*)");
    expect(p).toContain("(deny process-exec)");
    expect(p).toContain('(allow process-exec (literal "/real/node"))');
    expect(p).toContain('(allow file-write* (literal "/dev/null") (subpath "/tmp/x"))');
    expect(p).toContain('(deny file-read-data (subpath "/Users/a"))');
    expect(p.indexOf("(deny file-read-data")).toBeLessThan(p.indexOf("(allow file-read-data"));
  });

  it("macOS: sandbox-exec runs the real Node under Node's permissions", () => {
    const c = workerCommand({ ...base, way: "seatbelt" });
    expect(c.cmd).toBe("/usr/bin/sandbox-exec");
    expect(c.args.slice(2, 4)).toEqual(["/real/node", "--permission"]);
    expect(c.args).toContain("--allow-fs-read=/r/sandboxed");
    expect(c.args).toContain("--allow-fs-write=/tmp/x");
    expect(c.args.at(-1)).toBe("/r/sandboxed/extractWorker.mjs");
  });

  it("Windows: the launcher grants the same folders, caps memory, and Node takes paths as given", () => {
    const c = workerCommand({ ...base, way: "jail", jail: "C:/r/win-jail/x-jail.exe" });
    const dash = c.args.indexOf("--");
    expect(c.args.slice(0, dash)).toEqual(["--allow-read", "/r/sandboxed", "--allow-read", "/r/node", "--allow-write", "/tmp/x", "--memory-mb", "4096", "--active-processes", "8"]);
    expect(c.args.slice(dash + 1, dash + 5)).toEqual(["/r/node/node", "--preserve-symlinks", "--preserve-symlinks-main", "--permission"]);
    expect(() => workerCommand({ ...base, way: "jail" })).toThrow();
  });
});
