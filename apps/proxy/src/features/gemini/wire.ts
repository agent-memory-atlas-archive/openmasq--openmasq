// The Gemini wire (`/v1beta/models/<model>:generateContent`, `:streamGenerateContent`). OUT:
// `systemInstruction` and every `contents[].parts[]` the model reads — text, the
// `functionResponse` a tool returned, and code execution (the code, and what it printed).
// A `functionCall` already in the history (the model's own earlier request, executed on real
// values) is masked too. BACK: text parts restored for the reader, `functionCall.args` for
// the executor.
import { isRecord, mapStrings, mapStringsSync } from "../../lib/json.js";
import type { MaskFn, RestoreFns } from "../openai/wire.js";

async function maskParts(parts: unknown, mask: MaskFn): Promise<unknown> {
  if (!Array.isArray(parts)) return parts;
  const out: unknown[] = [];
  for (const p of parts) {
    if (!isRecord(p)) {
      out.push(p);
      continue;
    }
    if (typeof p.text === "string") out.push({ ...p, text: await mask(p.text) });
    else if (isRecord(p.functionResponse))
      out.push({
        ...p,
        functionResponse: {
          ...p.functionResponse,
          response: await mapStrings(p.functionResponse.response, mask),
        },
      });
    else if (isRecord(p.functionCall))
      out.push({
        ...p,
        functionCall: { ...p.functionCall, args: await mapStrings(p.functionCall.args, mask) },
      });
    else if (isRecord(p.executableCode) && typeof p.executableCode.code === "string")
      out.push({
        ...p,
        executableCode: { ...p.executableCode, code: await mask(p.executableCode.code) },
      });
    else if (isRecord(p.codeExecutionResult) && typeof p.codeExecutionResult.output === "string")
      out.push({
        ...p,
        codeExecutionResult: {
          ...p.codeExecutionResult,
          output: await mask(p.codeExecutionResult.output),
        },
      });
    else out.push(p); // inlineData, fileData: bytes or a reference — see README « Security »
  }
  return out;
}

async function maskContent(content: unknown, mask: MaskFn): Promise<unknown> {
  return isRecord(content) ? { ...content, parts: await maskParts(content.parts, mask) } : content;
}

export async function maskGenerateRequest(
  body: Record<string, unknown>,
  mask: MaskFn,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...body };
  for (const key of ["systemInstruction", "system_instruction"]) {
    if (body[key] !== undefined) out[key] = await maskContent(body[key], mask);
  }
  if (Array.isArray(body.contents)) {
    const contents: unknown[] = [];
    for (const c of body.contents) contents.push(await maskContent(c, mask));
    out.contents = contents;
  }
  return out;
}

/** Restore the parts of one candidate's content. Exported for the stream rewriter. */
export function restoreParts(parts: unknown, fns: RestoreFns): unknown {
  if (!Array.isArray(parts)) return parts;
  return parts.map((p) => {
    if (!isRecord(p)) return p;
    if (typeof p.text === "string") return { ...p, text: fns.reply(p.text) };
    if (isRecord(p.functionCall))
      return {
        ...p,
        functionCall: { ...p.functionCall, args: mapStringsSync(p.functionCall.args, fns.args) },
      };
    return p;
  });
}

export function restoreGenerateResponse(
  body: Record<string, unknown>,
  fns: RestoreFns,
): Record<string, unknown> {
  if (!Array.isArray(body.candidates)) return body;
  const candidates = body.candidates.map((c) =>
    isRecord(c) && isRecord(c.content)
      ? { ...c, content: { ...c.content, parts: restoreParts(c.content.parts, fns) } }
      : c,
  );
  return { ...body, candidates };
}
