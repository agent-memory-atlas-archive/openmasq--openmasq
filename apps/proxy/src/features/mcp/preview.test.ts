import { describe, expect, it } from "vitest";
import { argsPreview } from "./preview";

describe("argsPreview — the line a write is approved on", () => {
  it("shows the recipient even when the model wrote it after a long body", () => {
    const line = argsPreview({ body: "x".repeat(1000), subject: "hi", to: "boss@corp.example" });
    expect(line).toContain('"to":"boss@corp.example"');
    expect(line.indexOf('"to"')).toBeLessThan(line.indexOf('"body"'));
  });

  it("puts destination fields first at every depth", () => {
    const line = argsPreview({ message: { text: "y".repeat(500), Recipient_Id: "U42" } });
    expect(line).toContain('"Recipient_Id":"U42"');
  });

  it("says out loud that it cut, and how much", () => {
    const line = argsPreview({ body: "z".repeat(500) }, 100);
    expect(line).toMatch(/… \[cut: \d+ more chars not shown\]$/);
    expect(argsPreview({ a: 1 })).toBe('{"a":1}');
  });

  it("keeps the values intact otherwise", () => {
    expect(JSON.parse(argsPreview({ b: 2, url: "https://x.example", a: [1] }))).toEqual({
      url: "https://x.example",
      b: 2,
      a: [1],
    });
  });
});
