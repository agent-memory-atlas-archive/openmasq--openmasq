import { useEffect, useState } from "react";
import { DEMO_REPLY, DEMO_SPANS, demoLegend, type DemoSpan } from "./demo";

import { useT } from "../../i18n";
/**
 * The promise, in motion, told ONCE: what you write, what the model receives, what you read.
 *
 * Mounted by first launch AND by « Aide » (chapter « Ce que l'app fait pour
 * vous »): a single demo, so the two can't tell two different products.
 *
 * Three beats, then it HOLDS: the request's sensitive spans flip to their fakes; the reply
 * arrives written on those fakes; it then reads with the real values back. It used to loop
 * the second beat every few seconds, so half the time « ce que le modèle reçoit » showed the
 * REAL values — read as « the model sees my data » — and the round trip, which is the
 * product, was never shown.
 *
 * Motion is a cross-fade on the values only — the sentence never reflows, so the eye stays
 * on what changed. `prefers-reduced-motion` shows the end state at once.
 */
const BEATS_MS = [1100, 2700, 4300] as const;

export function RedactionDemo() {
  const t = useT();
  const [beat, setBeat] = useState(0);
  const reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setBeat(BEATS_MS.length);
      return;
    }
    const timers = BEATS_MS.map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return (
    <div className="ob-demo">
      <div className="ob-demo-row">
        <div className="ob-demo-side">
          <div className="cv-eyebrow ob-demo-lbl">{t.leaves.demo.youWrite}</div>
          <p className="ob-demo-text">
            <Spans spans={DEMO_SPANS} show="real" />
          </p>
        </div>

        <div className="ob-demo-side">
          <div className="cv-eyebrow ob-demo-lbl">{t.leaves.demo.modelReceives}</div>
          <p className="ob-demo-text">
            <Spans spans={DEMO_SPANS} show={beat >= 1 ? "fake" : "real"} />
          </p>
        </div>
      </div>

      {/* Space kept from the start: the card must not grow when the reply arrives. */}
      <div className={`ob-demo-side ob-demo-reply${beat >= 2 ? " on" : ""}`} aria-hidden={beat < 2}>
        <div className="cv-eyebrow ob-demo-lbl">{t.leaves.demo.youRead}</div>
        <p className="ob-demo-text">
          <Spans spans={DEMO_REPLY} show={beat >= 3 ? "real" : "fake"} />
        </p>
      </div>

      <div className="ob-demo-legend">
        {demoLegend(t).map((l) => (
          <span key={l.kind} className={`ob-demo-chip hl-${l.hue}`}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A sentence whose sensitive spans show their real or their fake value, cross-faded. */
function Spans({ spans, show }: { spans: readonly DemoSpan[]; show: "real" | "fake" }) {
  return (
    <>
      {spans.map((s, i) =>
        s.fake ? (
          <mark
            key={i}
            className={`ob-demo-mark ob-demo-flip hl-${markHue(s.kind)}${show === "fake" ? " is-fake" : ""}`}
          >
            <span className="ob-demo-v ob-demo-v-real">{s.text}</span>
            <span className="ob-demo-v ob-demo-v-fake">{s.fake}</span>
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** `hueForKind` already ran in `demo.ts` for the legend; the spans re-derive it there
 *  too, so the mark and its legend chip can never wear different colours. The hue does
 *  not depend on the language, so the default catalogue serves. */
function markHue(kind: string | undefined): string {
  return demoLegend().find((l) => l.kind === kind)?.hue ?? "slate";
}
