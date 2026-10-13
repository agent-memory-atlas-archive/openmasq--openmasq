import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { isWithin, isWithinDenied } from "./pathScope";

describe("pathScope — the deny comparison", () => {
  const ssh = join("/", "Users", "u", ".ssh");
  const upper = join("/", "Users", "u", ".SSH", "id_ed25519");

  it("folds case on the platforms whose default volume ignores it", () => {
    expect(isWithinDenied(ssh, upper, "darwin")).toBe(true);
    expect(isWithinDenied(ssh, upper, "win32")).toBe(true);
  });

  it("stays exact where the filesystem is case-sensitive", () => {
    expect(isWithinDenied(ssh, upper, "linux")).toBe(false);
  });

  it("is segment-aware in both forms (`/a/bc` is not under `/a/b`)", () => {
    expect(isWithin(join("/", "a", "b"), join("/", "a", "bc"))).toBe(false);
    expect(isWithinDenied(join("/", "a", "b"), join("/", "A", "BC"), "darwin")).toBe(false);
    expect(isWithinDenied(join("/", "a", "b"), join("/", "A", "B"), "darwin")).toBe(true);
  });
});
