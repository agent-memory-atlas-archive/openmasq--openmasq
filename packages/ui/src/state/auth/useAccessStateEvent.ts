import { useEffect, useRef } from "react";
import { captureEvent } from "../../analytics";
import { modelAccess, type ModelAccess, type ModelAccessInput } from "./modelAccess";

/**
 * `access_state`, ONCE per launch: the road to a model this install has. It waits for
 * every answer it reads — the account's key store, and the probe of each CLI that is
 * switched on — because an unanswered read is "not known yet", never "none". Only an
 * onboarded install reports it: before, the onboarding holds the person on the access step.
 * Returns the same verdict, so the shell can SAY it (`known` = every answer is in).
 */
export function useAccessStateEvent(
  i: ModelAccessInput & { onboarded: boolean; keysKnown: boolean },
): { access: ModelAccess; known: boolean } {
  const sent = useRef(false);
  const probesAnswered = i.agents.every((a) => !a.enabled || a.detected !== null);
  const ready = i.onboarded && i.keysKnown && probesAnswered;
  const access = modelAccess(i);
  useEffect(() => {
    if (!ready || sent.current) return;
    sent.current = true;
    captureEvent({ name: "access_state", access });
  }, [ready, access]);
  return { access, known: ready };
}
