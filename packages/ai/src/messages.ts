import type { Context, ImageContent, TextContent, UserMessage } from "@earendil-works/pi-ai/compat";

/** Text part of a prompt message. */
export type TextPart = { type: "text"; text: string };

/** Image part. `data` is base64, a data: URL, or raw bytes. */
export type ImagePart = {
  type: "image";
  data: string | URL | Uint8Array | ArrayBuffer;
  mimeType?: string;
};

/**
 * Document part (e.g. PDF). pi-ai models attachments as base64 blocks —
 * documents are sent as an `image` block with a document mimeType, which
 * document-capable models (Claude, Gemini, GPT) accept.
 */
export type FilePart = {
  type: "file";
  data: string | URL | Uint8Array | ArrayBuffer;
  mimeType: string;
};

export type PromptContent = string | Array<TextPart | ImagePart | FilePart>;

export type PromptMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: PromptContent };

function toBase64(data: string | URL | Uint8Array | ArrayBuffer): string {
  if (typeof data === "string") {
    // Strip a data: URL prefix if present; otherwise assume raw base64.
    const match = data.match(/^data:[^;]*;base64,(.*)$/s);
    return match ? match[1] : data;
  }
  if (data instanceof URL) {
    const match = data.toString().match(/^data:[^;]*;base64,(.*)$/s);
    if (!match) {
      throw new Error(
        "Only data: URLs are supported as prompt attachments — pass base64 or bytes instead.",
      );
    }
    return match[1];
  }
  return Buffer.from(data).toString("base64");
}

/**
 * Convert simple prompt messages into a pi-ai Context.
 *
 * System messages are merged into a single system prompt (appended after an
 * explicit `systemPrompt`). User attachments are normalized to pi-ai's base64
 * content blocks.
 */
export function toPiContext(messages: PromptMessage[], systemPrompt?: string): Context {
  const systemParts: string[] = [];
  if (systemPrompt) systemParts.push(systemPrompt);

  const out: UserMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
      continue;
    }
    if (typeof msg.content === "string") {
      out.push({ role: "user", content: msg.content, timestamp: Date.now() });
      continue;
    }
    const content: (TextContent | ImageContent)[] = msg.content.map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text };
      }
      return {
        type: "image",
        data: toBase64(part.data),
        mimeType: part.type === "file" ? part.mimeType : (part.mimeType ?? "image/png"),
      };
    });
    out.push({ role: "user", content, timestamp: Date.now() });
  }

  return {
    ...(systemParts.length > 0 ? { systemPrompt: systemParts.join("\n\n") } : {}),
    messages: out,
  };
}
