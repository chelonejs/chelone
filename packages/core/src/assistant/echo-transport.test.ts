import { describe, expect, it } from "vitest";
import { echoAssistantTransport } from "./echo-transport";
import type { AssistantChunk } from "./types";

async function collect(iterable: AsyncIterable<AssistantChunk>) {
  const chunks: AssistantChunk[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

describe("echoAssistantTransport", () => {
  it("echoes the last user message and ends with done", async () => {
    const chunks = await collect(
      echoAssistantTransport().send(
        [
          { role: "user", content: "first" },
          { role: "assistant", content: "Echo: first" },
          { role: "user", content: "hi" },
        ],
        {},
        { signal: new AbortController().signal },
      ),
    );

    expect(chunks.slice(0, -1).every((c) => c.type === "text")).toBe(true);
    expect(chunks.slice(0, -1)).toHaveLength("Echo: hi".length);
    expect(chunks.map((c) => (c.type === "text" ? c.delta : "")).join("")).toBe(
      "Echo: hi",
    );
    expect(chunks.at(-1)).toEqual({ type: "done" });
  });

  it("stops when the signal aborts", async () => {
    const controller = new AbortController();
    const chunks: AssistantChunk[] = [];
    for await (const chunk of echoAssistantTransport({ delayMs: 1 }).send(
      [{ role: "user", content: "hello there" }],
      {},
      { signal: controller.signal },
    )) {
      chunks.push(chunk);
      if (chunks.length === 2) controller.abort();
    }

    expect(chunks).toHaveLength(2);
    expect(chunks.some((c) => c.type === "done")).toBe(false);
  });
});
