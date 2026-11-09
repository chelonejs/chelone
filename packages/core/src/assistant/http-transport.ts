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
  // type-escape: json: the endpoint's line must be validated before it becomes a chunk.
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
      try {
        if (signal.aborted) return;
        const headers = new Headers(
          typeof options.headers === "function"
            ? await options.headers()
            : options.headers,
        );
        if (signal.aborted) return;
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
          let released = false;
          const release = () => {
            if (released) return;
            released = true;
            void reader.cancel().catch(() => {});
            reader.releaseLock();
          };
          signal.addEventListener("abort", release, { once: true });
          try {
            for (;;) {
              if (signal.aborted) return;
              const step = await reader.read();
              if (signal.aborted) return;
              pending += decoder.decode(step.value, { stream: !step.done });
              // EOF also completes a line without a trailing newline.
              if (step.done) pending += "\n";
              let end = pending.indexOf("\n");
              while (end >= 0) {
                if (signal.aborted) return;
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
              if (step.done) break;
            }
          } finally {
            signal.removeEventListener("abort", release);
            release();
          }
        }
        if (signal.aborted) return;
        yield { type: "done" };
      } catch (error) {
        if (!signal.aborted) throw error;
      }
    },
  };
}
