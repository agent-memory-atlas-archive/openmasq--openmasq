import { frame, Unframer } from "../runtime/frames";

/**
 * How the extraction worker talks to main: through the utilityProcess's port, or, started as the
 * Node shipped beside the app inside a jail (`extractSandbox.ts`, `OPENMASQ_WORKER_STDIO=1`), as
 * frames on its stdin and stdout (`../runtime/frames.ts`), the one channel the jails pass. In
 * that mode stdout carries the frames: whatever a library prints goes to stderr instead.
 */
export interface WorkerPort<Req, Res> {
  on(ev: "message", cb: (e: { data: Req }) => void): void;
  postMessage(msg: Res): void;
}

export function workerPort<Req, Res>(): WorkerPort<Req, Res> {
  if (process.env.OPENMASQ_WORKER_STDIO !== "1") return (process as unknown as { parentPort: WorkerPort<Req, Res> }).parentPort;
  const toStderr = (...args: unknown[]) => process.stderr.write(`${args.map(String).join(" ")}\n`);
  console.log = console.info = console.debug = console.warn = toStderr;
  const reader = new Unframer();
  return {
    on: (_ev, cb) => process.stdin.on("data", (chunk: Buffer) => reader.push(chunk).forEach((m) => cb({ data: m as Req }))),
    postMessage: (msg) => process.stdout.write(frame(msg)),
  };
}
