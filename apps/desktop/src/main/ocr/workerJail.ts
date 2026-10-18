/**
 * The command that starts the extraction worker shut in by the system (`extractSandbox.ts`):
 * pure, and pinned by its test, because a jail IS its argv.
 *
 * Every way runs the Node shipped beside the app under Node's own permissions (what it may read
 * and write; native addons and threads, which the OCR engines need), then:
 * - `seatbelt` (macOS): `sandbox-exec` with `workerSeatbelt` below: no network, no program
 *   started but that Node, no write outside its folder, nothing read under the home folder but
 *   what is granted;
 * - `jail` (Windows): the AppContainer launcher (`../python/winJail.ts`), granted the same
 *   folders: nothing else exists for the child, no socket at all, memory and processes capped.
 *   Node is told to take paths as given (`--preserve-symlinks*`): resolving a module's real path
 *   reads every folder above it, which the container may not.
 *
 * Unlike the Python jail's profile, which reads broadly minus the secrets it names, this one
 * denies the home folder WHOLE: the worker parses hostile bytes and needs none of it.
 */
export const SANDBOX_EXEC = "/usr/bin/sandbox-exec";

export type WorkerWay = "seatbelt" | "jail";

const quote = (s: string) => JSON.stringify(s);

/** The Seatbelt profile: everything the worker needs, nothing of the user's. */
export function workerSeatbelt(o: { read: string[]; write: string[]; exec: string; home: string }): string {
  return [
    "(version 1)",
    "(allow default)",
    "(deny network*)",
    "(deny process-fork)",
    "(deny process-exec)",
    `(allow process-exec (literal ${quote(o.exec)}))`,
    "(deny file-write*)",
    `(allow file-write* (literal "/dev/null") ${o.write.map((p) => `(subpath ${quote(p)})`).join(" ")})`,
    `(deny file-read-data (subpath ${quote(o.home)}))`,
    `(allow file-read-data ${o.read.map((p) => `(subpath ${quote(p)})`).join(" ")})`,
  ].join("\n");
}

export interface WorkerCommandOptions {
  way: WorkerWay;
  /** the Node to run, and its real path (what the sandbox lets it execute) */
  node: string;
  nodeReal: string;
  /** the Windows launcher, for `jail` */
  jail?: string;
  script: string;
  read: string[];
  write: string[];
  /** the home folder the Seatbelt profile denies */
  home: string;
  memoryMb: number;
}

export function workerCommand(o: WorkerCommandOptions): { cmd: string; args: string[] } {
  const node = [
    "--permission",
    ...o.read.map((p) => `--allow-fs-read=${p}`),
    ...o.write.map((p) => `--allow-fs-write=${p}`),
    "--allow-addons",
    "--allow-worker",
    o.script,
  ];
  if (o.way === "jail") {
    if (!o.jail) throw new Error("no jail launcher");
    const grants = [...o.read.flatMap((p) => ["--allow-read", p]), ...o.write.flatMap((p) => ["--allow-write", p])];
    return {
      cmd: o.jail,
      args: [...grants, "--memory-mb", String(o.memoryMb), "--active-processes", "8", "--", o.node, "--preserve-symlinks", "--preserve-symlinks-main", ...node],
    };
  }
  return { cmd: SANDBOX_EXEC, args: ["-p", workerSeatbelt({ read: o.read, write: o.write, exec: o.nodeReal, home: o.home }), o.nodeReal, ...node] };
}
