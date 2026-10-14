// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, useRef } from "react";
import { mount } from "../../testKit";
import { RedactionInlineReveal } from "./RedactionInlineReveal";

/**
 * « Vu par le modèle » sat above « [PERSON1] » while the model had received « Léa Dumont »:
 * the label described the on-screen token, not what left. The card now shows the pseudonym
 * the model got, and the token beneath it for what it is.
 */
function Harness({ tokens }: { tokens?: Map<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <mark className="redaction-mark" data-real="Camille Martin" data-fake="Léa Dumont" data-kind="name" data-tone="violet">
        Camille Martin
      </mark>
      <RedactionInlineReveal containerRef={ref} displayTokens={tokens} readOnly />
    </div>
  );
}

const hover = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
};

describe("RedactionInlineReveal — what the model saw", () => {
  it("names the pseudonym the model received, and the token as a display", async () => {
    const m = await mount(<Harness tokens={new Map([["Camille Martin", "[PERSON1]"]])} />);
    await hover(m.find(".redaction-mark"));
    // The card is portalled to <body>.
    expect(document.querySelector(".rmark-pop-val")?.textContent).toBe("Léa Dumont");
    expect(document.querySelector(".rmark-pop-token")?.textContent).toContain("[PERSON1]");
    await m.unmount();
  });

  it("without tokens, shows the pseudonym alone", async () => {
    const m = await mount(<Harness />);
    await hover(m.find(".redaction-mark"));
    expect(document.querySelector(".rmark-pop-val")?.textContent).toBe("Léa Dumont");
    expect(document.querySelector(".rmark-pop-token")).toBeNull();
    await m.unmount();
  });
});
