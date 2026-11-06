import { HttpError } from "../data/http-error";
import { isJsonObject, isRecord } from "../guards";
import type { AssistantChunk, AssistantTransport } from "./types";

export interface HttpAssistantTransportOptions {
  url: string;
  /** Resolved for each request so tokens can change between turns. */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  credentials?: RequestCredentials;
  fetch?: typeof globalThis.fetch;
}

function parseChunk(line: string, lineNumber: number): AssistantChunk {
  const invalid = () =>
    new Error(`Invalid assistant chunk at line ${lineNumber}`);
  // type-escape: JSON from the endpoint must be validated before it becomes a chunk.
  let chunk: unknown;
  try {
    chunk = JSON.parse(line);
  } catch {
    throw invalid();
  }
  if (isRecord(chunk)) {
    switch (chunk.type) {
      case "text":
        if (typeof chunk.delta === "string") {
          return { type: "text", delta: chunk.delta };
        }
        break;
      case "tool-call":
        if (
          typeof chunk.id === "string" &&
          typeof chunk.toolName === "string" &&
          isJsonObject(chunk.args)
        ) {
          return {
            type: "tool-call",
            id: chunk.id,
            toolName: chunk.toolName,
            args: chunk.args,
          };
        }
        break;
      case "done":
        return { type: "done" };
    }
  }
  throw invalid();
}

/** Posts a conversation to an app endpoint that replies with NDJSON AssistantChunks. */
export function httpAssistantTransport(
  options: HttpAssistantTransportOptions,
): AssistantTransport {
  const doFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  return {
    async *send(messages, tools, { signal }): AsyncGenerator<AssistantChunk> {
      const headers = new Headers(
        typeof options.headers === "function"
          ? await options.headers()
          : options.headers,
      );
      headers.set("Content-Type", "application/json");
      const response = await doFetch(options.url, {
        method: "POST",
        headers,
        credentials: options.credentials,
        body: JSON.stringify({ messages, tools }),
        signal,
      });
      if (!response.ok) {
        throw new HttpError(
          `Assistant request failed (HTTP ${response.status})`,
          response.status,
          await response.text(),
        );
      }
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let pending = "";
        let lineNumber = 0;
        try {
          for (;;) {
            const step = await reader.read();
            if (step.done) break;
            pending += decoder.decode(step.value, { stream: true });
            let end = pending.indexOf("\n");
            while (end >= 0) {
              lineNumber++;
              const line = pending.slice(0, end).trim();
              pending = pending.slice(end + 1);
              if (line) {
                const chunk = parseChunk(line, lineNumber);
                yield chunk;
                if (chunk.type === "done") return;
              }
              end = pending.indexOf("\n");
            }
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
      yield { type: "done" };
    },
  };
}
