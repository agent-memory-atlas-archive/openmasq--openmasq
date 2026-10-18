/**
 * The Node release the extraction worker runs on inside its jail (`src/main/ocr/extractSandbox.ts`),
 * pinned twice per triple: the SHA-256 of the archive nodejs.org publishes (checked before
 * extraction) and the SHA-256 of the binary inside it. The binary is re-hashed against THIS file
 * every time it is kept, never trusted on a stamp: `build/node` may come back from a CI cache.
 *
 * Why a Node of its own: the app's binary has the `RunAsNode` fuse off, and a utilityProcess
 * cannot be put inside a jail. This Node is signed like the Python runtime beside it.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const NODE_VERSION = "24.21.0";
// https://nodejs.org/dist/v24.21.0/SHASUMS256.txt, then `sha256` of bin/node (node.exe) inside
export const NODE_PINS: Record<string, { file: string; archive: string; binary: string }> = {
  "darwin-arm64": {
    file: "node-v24.21.0-darwin-arm64.tar.gz",
    archive: "bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057",
    binary: "e4b5a3af0e05c75de2eae013904145f40fe7fc2a6e6f17510128bf45cca4e79b",
  },
  "darwin-x64": {
    file: "node-v24.21.0-darwin-x64.tar.gz",
    archive: "1462cb3b3046b815cf8ea436d3da450ec1a9f11dac7e5a46b0ada5305d7e8097",
    binary: "7abcf39bd37ab251015337ff75304d7555f0d8e88c6e0fbf04bce8ce34636f49",
  },
  "win32-x64": {
    file: "node-v24.21.0-win-x64.zip",
    archive: "158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541",
    binary: "ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32",
  },
};

export const BAKED_NODE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "node");
export const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export const nodeExe = (target: string): string => (target.startsWith("win32") ? "node.exe" : "node");

/** Why the baked binary of `target` must not ship, or null when its bytes are the pinned ones. */
export async function bakedNodeProblem(target: string, dir = BAKED_NODE_DIR, bytes?: Uint8Array): Promise<string | null> {
  const pin = NODE_PINS[target];
  if (!pin) return `${target}: no Node binary pinned`;
  const path = join(dir, target, nodeExe(target));
  const got = bytes ?? (await readFile(path).catch(() => null));
  if (!got) return `${target}: the baked Node is missing (${path})`;
  const hash = sha256(got);
  return hash === pin.binary ? null : `${target}: the baked Node is not the pinned binary (SHA-256 ${hash} instead of ${pin.binary})`;
}
