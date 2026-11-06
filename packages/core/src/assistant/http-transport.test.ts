import { describe, expect, it, vi } from "vitest";
import { httpAssistantTransport } from "./http-transport";
import type { AssistantChunk, AssistantMessage } from "./types";

const url = "https://app.example/api/assistant";

async function collect(chunks: AsyncIterable<AssistantChunk>) {
  const received: AssistantChunk[] = [];
  for await (const chunk of chunks) received.push(chunk);
  return received;
}

describe("httpAssistantTransport", () => {
  it("posts the messages and tool declarations as JSON", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response('{"type":"done"}\n'),
    );
    const messages: AssistantMessage[] = [{ role: "user", content: "Hello" }];
    const tools = {
      count: { description: "Count records", parameters: { type: "object" } },
    };
    const signal = new AbortController().signal;
    const transport = httpAssistantTransport({
      url,
      fetch,
      credentials: "include",
      headers: { "X-App": "admin" },
    });

    await collect(transport.send(messages, tools, { signal }));

    expect(fetch).toHaveBeenCalledExactlyOnceWith(url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-App": "admin",
      }),
      credentials: "include",
      body: '{"messages":[{"role":"user","content":"Hello"}],"tools":{"count":{"description":"Count records","parameters":{"type":"object"}}}}',
      signal,
    });
  });
});
