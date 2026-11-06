import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../data/http-error";
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

  it("yields each chunk of a newline-delimited stream, including a line split across reads", async () => {
    const bytes = new TextEncoder().encode(
      '\n{"type":"text","delta":"café"}\r\n \n{"type":"tool-call","id":"c1","toolName":"count","args":{"n":2}}\n{"type":"done"}\n',
    );
    const accent = bytes.indexOf(0xc3);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 12));
        controller.enqueue(bytes.slice(12, accent + 1));
        controller.enqueue(bytes.slice(accent + 1));
        controller.close();
      },
    });
    const transport = httpAssistantTransport({
      url,
      fetch: async () => new Response(body),
    });

    expect(
      await collect(
        transport.send([], {}, { signal: new AbortController().signal }),
      ),
    ).toEqual([
      { type: "text", delta: "café" },
      { type: "tool-call", id: "c1", toolName: "count", args: { n: 2 } },
      { type: "done" },
    ]);
    expect(body.locked).toBe(false);
  });

  it("a status that is not ok throws an HttpError", async () => {
    const transport = httpAssistantTransport({
      url,
      fetch: async () =>
        new Response("The model is unavailable", { status: 503 }),
    });

    const result = collect(
      transport.send([], {}, { signal: new AbortController().signal }),
    );

    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toMatchObject({
      status: 503,
      body: "The model is unavailable",
    });
  });

  it("a malformed line or unknown chunk type throws naming the line", async () => {
    for (const line of [
      "not JSON",
      '{"type":"vendor-event"}',
      '{"type":"text","delta":7}',
      '{"type":"tool-call","id":"c","toolName":"count","args":[]}',
      "null",
    ]) {
      const response = new Response(
        `\n{"type":"text","delta":"OK"}\n${line}\n`,
      );
      const transport = httpAssistantTransport({
        url,
        fetch: async () => response,
      });

      const result = collect(
        transport.send([], {}, { signal: new AbortController().signal }),
      );

      await expect(result).rejects.toBeInstanceOf(Error);
      await expect(result).rejects.toThrow(/line 3\b/);
      expect(response.body?.locked).toBe(false);
    }
  });

  it("a stream with no done line ends the turn", async () => {
    for (const ending of ["", "\n", "\n \n"]) {
      const transport = httpAssistantTransport({
        url,
        fetch: async () =>
          new Response(`{"type":"text","delta":"Goodbye"}${ending}`),
      });

      expect(
        await collect(
          transport.send([], {}, { signal: new AbortController().signal }),
        ),
      ).toEqual([{ type: "text", delta: "Goodbye" }, { type: "done" }]);
    }
  });

  it("an abort stops reading and releases the reader", async () => {
    const cancel = vi.fn();
    const pull = vi.fn();
    const body = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('{"type":"text","delta":"Part"}\n'),
          );
        },
        pull,
        cancel,
      },
      { highWaterMark: 0 },
    );
    const controller = new AbortController();
    const transport = httpAssistantTransport({
      url,
      fetch: async () => new Response(body),
    });
    const iterator = transport
      .send([], {}, { signal: controller.signal })
      [Symbol.asyncIterator]();
    expect(await iterator.next()).toEqual({
      value: { type: "text", delta: "Part" },
      done: false,
    });

    const pending = iterator.next();
    await vi.waitFor(() => expect(pull).toHaveBeenCalledOnce());
    controller.abort();

    await expect(pending).resolves.toMatchObject({ done: true });
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(pull).toHaveBeenCalledOnce();
  });

  it("an abort releases the reader while the consumer is paused", async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('{"type":"text","delta":"Part"}\n'),
        );
      },
      cancel,
    });
    const controller = new AbortController();
    const transport = httpAssistantTransport({
      url,
      fetch: async () => new Response(body),
    });
    const iterator = transport
      .send([], {}, { signal: controller.signal })
      [Symbol.asyncIterator]();
    await iterator.next();

    controller.abort();

    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    await expect(iterator.next()).resolves.toMatchObject({ done: true });
  });

  it("an async headers function is read on every request", async () => {
    let token = "first";
    const headers = vi.fn(async () => ({ Authorization: `Bearer ${token}` }));
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response('{"type":"done"}\n'));
    try {
      const transport = httpAssistantTransport({ url, headers });

      await collect(
        transport.send([], {}, { signal: new AbortController().signal }),
      );
      token = "second";
      await collect(
        transport.send([], {}, { signal: new AbortController().signal }),
      );

      expect(headers).toHaveBeenCalledTimes(2);
      expect(
        fetch.mock.calls.map(([input, init]) => [
          input,
          new Headers(init?.headers).get("Authorization"),
        ]),
      ).toEqual([
        [url, "Bearer first"],
        [url, "Bearer second"],
      ]);
    } finally {
      fetch.mockRestore();
    }
  });

  it("a token from headers goes only in the header, never in the URL or a thrown error", async () => {
    const token = "Bearer a&x=1#y";
    for (const response of [
      new Response(token, { status: 401, statusText: token }),
      new Response(`${token}\n`),
      new Response(`{"type":"${token}"}\n`),
    ]) {
      const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
      const transport = httpAssistantTransport({
        url,
        fetch,
        headers: () => ({ Authorization: token }),
      });

      const result = collect(
        transport.send([], {}, { signal: new AbortController().signal }),
      );

      await expect(result).rejects.toBeInstanceOf(Error);
      await expect(result).rejects.toHaveProperty(
        "message",
        expect.not.stringContaining(token),
      );
      expect(fetch).toHaveBeenCalledOnce();
      const [input, init] = fetch.mock.calls[0] ?? [];
      expect(input).toBe(url);
      expect(init?.body).toBe('{"messages":[],"tools":{}}');
      expect(new Headers(init?.headers).get("Authorization")).toBe(token);
    }
  });
});
