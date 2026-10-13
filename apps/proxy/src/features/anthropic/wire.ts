// The Anthropic Messages wire (`/v1/messages`). OUT: `system` (string or text blocks) and
// every message block the model reads — text, tool results, text documents, search results
// (nested in a tool result too), and the `input` of the tool uses already in the history.
// BACK: text blocks restored for the reader, tool-use inputs for the executor
// (`restoreArgs`, every string leaf).
import { isRecord, mapStrings, mapStringsSync } from "../../lib/json.js";
import type { MaskFn, RestoreFns } from "../openai/wire.js";

async function maskBlocks(content: unknown, mask: MaskFn): Promise<unknown> {
  if (typeof content === "string") return mask(content);
  if (!Array.isArray(content)) return content;
  const out: unknown[] = [];
  for (const b of content) {
    if (!isRecord(b)) {
      out.push(b);
      continue;
    }
    switch (b.type) {
      case "text":
        out.push(typeof b.text === "string" ? { ...b, text: await mask(b.text) } : b);
        break;
      case "tool_result":
        out.push({ ...b, content: await maskBlocks(b.content, mask) });
        break;
      case "tool_use":
        out.push({ ...b, input: await mapStrings(b.input, mask) });
        break;
      case "document":
        out.push(await maskDocument(b, mask));
        break;
      case "search_result":
        out.push({
          ...b,
          ...(await maskStringFields(b, ["source", "title"], mask)),
          content: await maskBlocks(b.content, mask),
        });
        break;
      default:
        out.push(b); // image, thinking (signed), server tool blocks: bytes or the model's own
    }
  }
  return out;
}

async function maskStringFields(
  b: Record<string, unknown>,
  keys: string[],
  mask: MaskFn,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (typeof b[k] === "string") out[k] = await mask(b[k] as string);
  return out;
}

/** A `document` is TEXT when its source says so: plain (`text`, its `data`) or a list of
 *  content blocks (`content`). Its `title` and `context` are read by the model too. A
 *  `base64`/`url`/`file` source is bytes or a reference — see README « Limits ». */
async function maskDocument(b: Record<string, unknown>, mask: MaskFn): Promise<unknown> {
  const named = await maskStringFields(b, ["title", "context"], mask);
  const out: Record<string, unknown> = { ...b, ...named };
  const src = b.source;
  if (isRecord(src) && src.type === "text" && typeof src.data === "string")
    out.source = { ...src, data: await mask(src.data) };
  else if (isRecord(src) && src.type === "content")
    out.source = { ...src, content: await maskBlocks(src.content, mask) };
  return out;
}

export async function maskMessagesRequest(
  body: Record<string, unknown>,
  mask: MaskFn,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...body };
  if (body.system !== undefined) out.system = await maskBlocks(body.system, mask);
  if (Array.isArray(body.messages)) {
    const messages: unknown[] = [];
    for (const m of body.messages) {
      messages.push(isRecord(m) ? { ...m, content: await maskBlocks(m.content, mask) } : m);
    }
    out.messages = messages;
  }
  return out;
}

/** Messages response (non-streaming): `content[]` text and tool_use blocks. */
export function restoreMessagesResponse(
  body: Record<string, unknown>,
  fns: RestoreFns,
): Record<string, unknown> {
  if (!Array.isArray(body.content)) return body;
  const content = body.content.map((b) => {
    if (!isRecord(b)) return b;
    if (b.type === "text" && typeof b.text === "string") return { ...b, text: fns.reply(b.text) };
    if (b.type === "tool_use") return { ...b, input: mapStringsSync(b.input, fns.args) };
    return b;
  });
  return { ...body, content };
}
