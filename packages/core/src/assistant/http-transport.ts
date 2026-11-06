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
      await doFetch(options.url, {
        method: "POST",
        headers,
        credentials: options.credentials,
        body: JSON.stringify({ messages, tools }),
        signal,
      });
      yield { type: "done" };
    },
  };
}
