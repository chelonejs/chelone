import type { AssistantChunk, AssistantTransport } from "./types";

export interface EchoAssistantTransportOptions {
  /** Waits this long before each character. */
  delayMs?: number;
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });

/** Replies `Echo: <last user text>` one character at a time, with no model behind it. */
export function echoAssistantTransport({
  delayMs = 0,
}: EchoAssistantTransportOptions = {}): AssistantTransport {
  return {
    async *send(messages, _tools, { signal }): AsyncGenerator<AssistantChunk> {
      let said = "";
      for (const message of messages) {
        if (message.role === "user") said = message.content;
      }
      const reply = `Echo: ${said}`;
      for (const delta of reply) {
        if (delayMs > 0) await wait(delayMs, signal);
        if (signal.aborted) return;
        yield { type: "text", delta };
      }
      yield { type: "done" };
    },
  };
}
