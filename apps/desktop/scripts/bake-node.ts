/**
 * Lay down the Node the extraction worker runs on inside its jail: `build/node/<triple>/node[.exe]`,
 * shipped by `electron-builder.cjs` (`extraResources` → `node/`) for every triple this platform
 * ships (`shippedTriples.ts`). The official release from nodejs.org: the archive checked against
 * its SHA-256, then the extracted binary against its own (`nodePins.ts`), before it is kept.
 * Idempotent: a kept binary is re-hashed, never trusted on a stamp.
 *
 * Run: `pnpm --filter @openmasq/desktop bake:node` (part of `pnpm bake`).
 */
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { BAKED_NODE_DIR, bakedNodeProblem, NODE_PINS, NODE_VERSION, nodeExe, sha256 } from "./nodePins";
import { currentBlock, shippedTriples } from "./shippedTriples";

const log = (m: string): void => console.log(`[bake:node] ${m}`);

async function bake(target: string): Promise<void> {
  const pin = NODE_PINS[target];
  if (!pin) throw new Error(`${target}: no Node archive pinned (nodePins.ts)`);
  const dest = join(BAKED_NODE_DIR, target, nodeExe(target));
  const kept = await bakedNodeProblem(target);
  if (!kept) return log(`${target} ✓ already there (binary SHA-256 checked)`);
  if ((await readFile(dest).catch(() => null)) !== null) log(`${kept}: baking it again`);
  const res = await fetch(`https://nodejs.org/dist/v${NODE_VERSION}/${pin.file}`);
  if (!res.ok) throw new Error(`${pin.file}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const got = sha256(bytes);
  if (got !== pin.archive) throw new Error(`${pin.file}: unexpected SHA-256 (${got} instead of ${pin.archive}), nothing kept`);
  await mkdir(dirname(dest), { recursive: true });
  const inner = pin.file.replace(/\.(tar\.gz|zip)$/, "");
  if (pin.file.endsWith(".zip")) {
    // in JavaScript: a Windows runner's git-bash `tar` reads no zip
    const exe = unzipSync(bytes, { filter: (f) => f.name === `${inner}/node.exe` })[`${inner}/node.exe`];
    if (!exe) throw new Error(`${pin.file}: no ${inner}/node.exe inside`);
    await writeFile(dest, exe);
  } else {
    const work = await mkdtemp(join(tmpdir(), "omq-node-"));
    try {
      await writeFile(join(work, pin.file), bytes);
      const r = spawnSync("tar", ["-xzf", join(work, pin.file), "-C", work, `${inner}/bin/node`], { stdio: "inherit" });
      if (r.status !== 0) throw new Error(`${pin.file}: tar failed`);
      await copyFile(join(work, inner, "bin", "node"), dest);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
  await chmod(dest, 0o755);
  const problem = await bakedNodeProblem(target);
  if (problem) {
    await rm(dest, { force: true });
    throw new Error(`${problem}, nothing kept`);
  }
  log(`${target} ✓ Node ${NODE_VERSION}`);
}

async function main(): Promise<void> {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : shippedTriples(currentBlock());
  for (const t of targets) await bake(t);
}

main().catch((e) => {
  console.error(`[bake:node] ✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
