import { describe, expect, it, vi } from "vitest";
import { createAssistantSession } from "./assistant-session";
import type {
  AssistantChunk,
  AssistantMessage,
  AssistantTool,
  AssistantToolDeclaration,
  AssistantTransport,
  JsonObject,
} from "./types";

interface Call {
  messages: readonly AssistantMessage[];
  tools: Readonly<Record<string, AssistantToolDeclaration>>;
  signal: AbortSignal;
}

/** Plays one scripted turn per `send`; a turn may be a function to throw or hang. */
function scripted(
  ...turns: Array<
    AssistantChunk[] | ((signal: AbortSignal) => AsyncIterable<AssistantChunk>)
  >
) {
  const calls: Call[] = [];
  const transport: AssistantTransport = {
    send(messages, tools, { signal }) {
      calls.push({ messages, tools, signal });
      const turn = turns[Math.min(calls.length - 1, turns.length - 1)];
      if (typeof turn === "function") return turn(signal);
      return (async function* () {
        for (const chunk of turn ?? []) yield chunk;
      })();
    },
  };
  return { transport, calls };
}

const text = (delta: string): AssistantChunk => ({ type: "text", delta });
const done: AssistantChunk = { type: "done" };
const call = (
  id: string,
  toolName: string,
  args: JsonObject = {},
): AssistantChunk => ({ type: "tool-call", id, toolName, args });

const tool = (overrides: Partial<AssistantTool> = {}): AssistantTool => ({
  description: "A tool",
  parameters: { type: "object", properties: {} },
  handler: () => "ok",
  ...overrides,
});

describe("createAssistantSession", () => {
  it("streams text deltas into one assistant message", async () => {
    const { transport } = scripted([text("Hel"), text("lo"), done]);
    const session = createAssistantSession({ transport, tools: {} });
    const seen: string[] = [];
    session.subscribe(() => {
      const last = session.getSnapshot().messages.at(-1);
      if (last?.role === "assistant") seen.push(last.content);
    });

    await session.send("hi");

    expect(session.getSnapshot()).toEqual({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello" },
      ],
      status: "idle",
      error: null,
    });
    expect(seen).toContain("Hel");
  });

  it("ignores blank text and a send while streaming", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { transport, calls } = scripted(async function* () {
      await gate;
      yield text("a");
      yield done;
    });
    const session = createAssistantSession({ transport, tools: {} });

    await session.send("   ");
    expect(calls).toHaveLength(0);
    expect(session.getSnapshot().messages).toEqual([]);

    const first = session.send("one");
    expect(session.getSnapshot().status).toBe("streaming");
    await session.send("two");
    release();
    await first;

    expect(calls).toHaveLength(1);
    expect(session.getSnapshot().messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("runs a tool call and sends its result back for a follow-up turn", async () => {
    const handler = vi.fn((args: JsonObject) => ({
      count: args.n ?? null,
    }));
    const { transport, calls } = scripted(
      [text("Looking"), call("c1", "count", { n: 3 }), done],
      [text("Three."), done],
    );
    const session = createAssistantSession({
      transport,
      tools: { count: tool({ handler }) },
    });

    await session.send("how many?");

    expect(handler).toHaveBeenCalledWith({ n: 3 });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.messages.at(-1)).toEqual({
      role: "tool",
      id: "c1",
      toolName: "count",
      result: { count: 3 },
    });
    expect(session.getSnapshot().messages).toEqual([
      { role: "user", content: "how many?" },
      {
        role: "assistant",
        content: "Looking",
        toolCalls: [{ id: "c1", toolName: "count", args: { n: 3 } }],
      },
      { role: "tool", id: "c1", toolName: "count", result: { count: 3 } },
      { role: "assistant", content: "Three." },
    ]);
    expect(session.getSnapshot().status).toBe("idle");
  });

  it("stops after maxToolRounds with an error", async () => {
    const handler = vi.fn(() => "again");
    const { transport, calls } = scripted([call("c", "loop"), done]);
    const session = createAssistantSession({
      transport,
      tools: { loop: tool({ handler }) },
      maxToolRounds: 2,
    });

    await session.send("go");

    expect(handler).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(3);
    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().error).toBeInstanceOf(Error);
    expect(session.getSnapshot().messages.length).toBeGreaterThan(1);
  });

  it("an unknown tool, or one named constructor or __proto__, becomes an error result and runs nothing", async () => {
    const handler = vi.fn();
    const { transport, calls } = scripted(
      [
        call("a", "missing"),
        call("b", "constructor"),
        call("c", "__proto__"),
        call("d", "toString"),
        done,
      ],
      [done],
    );
    const session = createAssistantSession({
      transport,
      tools: { real: tool({ handler }) },
    });

    await session.send("go");

    expect(handler).not.toHaveBeenCalled();
    const results = calls[1]?.messages.filter((m) => m.role === "tool");
    expect(results).toHaveLength(4);
    for (const result of results ?? []) {
      expect(result).toMatchObject({ error: expect.any(String) });
      expect(result).not.toHaveProperty("result");
    }
    expect(session.getSnapshot().status).toBe("idle");
  });

  it("arguments the tool schema rejects never reach the handler", async () => {
    const handler = vi.fn();
    const schema: NonNullable<AssistantTool["schema"]> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "n must be a number" }] }),
      },
    };
    const { transport, calls } = scripted(
      [call("a", "count", { n: "x" }), done],
      [done],
    );
    const session = createAssistantSession({
      transport,
      tools: { count: tool({ handler, schema }) },
    });

    await session.send("go");

    expect(handler).not.toHaveBeenCalled();
    expect(calls[1]?.messages.at(-1)).toMatchObject({
      role: "tool",
      id: "a",
      error: expect.stringContaining("n must be a number"),
    });
  });

  it("a tool with confirm runs only when confirmTool resolves true", async () => {
    const handler = vi.fn(() => "deleted");
    const run = async (answer: boolean | undefined) => {
      handler.mockClear();
      const { transport, calls } = scripted(
        [call("a", "remove", { id: 1 }), done],
        [done],
      );
      const confirmTool = vi.fn(async () => answer === true);
      const session = createAssistantSession({
        transport,
        tools: { remove: tool({ handler, confirm: true }) },
        ...(answer === undefined ? {} : { confirmTool }),
      });
      await session.send("go");
      return { confirmTool, last: calls[1]?.messages.at(-1) };
    };

    const yes = await run(true);
    expect(yes.confirmTool).toHaveBeenCalledWith({
      id: "a",
      toolName: "remove",
      args: { id: 1 },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(yes.last).toMatchObject({ result: "deleted" });

    const no = await run(false);
    expect(handler).not.toHaveBeenCalled();
    expect(no.last).toMatchObject({ role: "tool", error: expect.any(String) });

    // Without a confirmTool callback nobody agreed, so nothing runs.
    const none = await run(undefined);
    expect(handler).not.toHaveBeenCalled();
    expect(none.last).toMatchObject({ error: expect.any(String) });
  });

  it("a tool without confirm runs without asking", async () => {
    const confirmTool = vi.fn(async () => false);
    const handler = vi.fn(() => "fine");
    const { transport } = scripted([call("a", "t"), done], [done]);
    const session = createAssistantSession({
      transport,
      tools: { t: tool({ handler }) },
      confirmTool,
    });

    await session.send("go");

    expect(confirmTool).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("a throwing handler becomes an error result and the turn goes on", async () => {
    const { transport, calls } = scripted(
      [call("a", "boom"), done],
      [text("Sorry."), done],
    );
    const session = createAssistantSession({
      transport,
      tools: {
        boom: tool({
          handler: () => {
            throw new Error("kaboom");
          },
        }),
      },
    });

    await session.send("go");

    expect(calls[1]?.messages.at(-1)).toEqual({
      role: "tool",
      id: "a",
      toolName: "boom",
      error: "kaboom",
    });
    expect(session.getSnapshot().status).toBe("idle");
    expect(session.getSnapshot().messages.at(-1)).toEqual({
      role: "assistant",
      content: "Sorry.",
    });
  });

  it("a transport that throws sets the error status and keeps the messages", async () => {
    const failure = new Error("offline");
    const { transport } = scripted(async function* () {
      yield text("part");
      throw failure;
    });
    const session = createAssistantSession({ transport, tools: {} });

    await session.send("hi");

    expect(session.getSnapshot()).toEqual({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "part" },
      ],
      status: "error",
      error: failure,
    });

    // A later send starts clean.
    const retry = scripted([text("back"), done]);
    const again = createAssistantSession({
      transport: retry.transport,
      tools: {},
    });
    await again.send("hi");
    expect(again.getSnapshot().error).toBeNull();
  });

  it("a transport that rejects sets the error status", async () => {
    const transport: AssistantTransport = {
      send() {
        throw new Error("no key");
      },
    };
    const session = createAssistantSession({ transport, tools: {} });

    await session.send("hi");

    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().messages).toEqual([
      { role: "user", content: "hi" },
    ]);
  });

  it("stop aborts the signal and keeps the text so far", async () => {
    let signal!: AbortSignal;
    const { transport } = scripted(async function* (s) {
      signal = s;
      yield text("par");
      await new Promise(() => {}); // a transport that ignores the signal
    });
    const session = createAssistantSession({ transport, tools: {} });

    const running = session.send("hi");
    await vi.waitFor(() =>
      expect(session.getSnapshot().messages.at(-1)).toEqual({
        role: "assistant",
        content: "par",
      }),
    );
    session.stop();
    await running;

    expect(signal.aborted).toBe(true);
    expect(session.getSnapshot().status).toBe("idle");
    expect(session.getSnapshot().error).toBeNull();
    expect(session.getSnapshot().messages.at(-1)).toEqual({
      role: "assistant",
      content: "par",
    });
  });

  it("reset aborts and clears the messages, and the old turn writes nothing more", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signal!: AbortSignal;
    const { transport } = scripted(async function* (s) {
      signal = s;
      await gate;
      yield text("late");
    });
    const session = createAssistantSession({ transport, tools: {} });

    const running = session.send("hi");
    session.reset();
    release();
    await running;

    expect(signal.aborted).toBe(true);
    expect(session.getSnapshot()).toEqual({
      messages: [],
      status: "idle",
      error: null,
    });
  });

  it("destroy aborts the active turn, and a send afterwards does nothing", async () => {
    const handler = vi.fn(() => "ran");
    const { transport, calls } = scripted([call("c", "loop"), done]);
    const session = createAssistantSession({
      transport,
      tools: {
        loop: tool({
          handler: () => {
            session.destroy();
            return handler();
          },
        }),
      },
    });

    await session.send("go");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal.aborted).toBe(true);

    await session.send("again");
    expect(calls).toHaveLength(1);
  });

  it("stop ends a turn that is waiting on a confirmation, and a late yes runs nothing", async () => {
    let answer!: (yes: boolean) => void;
    const handler = vi.fn();
    const { transport, calls } = scripted([call("a", "remove"), done]);
    const session = createAssistantSession({
      transport,
      tools: { remove: tool({ handler, confirm: true }) },
      confirmTool: () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    });

    const running = session.send("go");
    await vi.waitFor(() => expect(answer).toBeTypeOf("function"));
    session.stop();
    await running;
    answer(true);
    await Promise.resolve();

    expect(handler).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(session.getSnapshot().status).toBe("idle");
  });

  it("stop ends a turn whose handler never settles", async () => {
    const { transport } = scripted([call("a", "hang"), done]);
    const session = createAssistantSession({
      transport,
      tools: { hang: tool({ handler: () => new Promise(() => {}) }) },
    });

    const running = session.send("go");
    await vi.waitFor(() =>
      expect(session.getSnapshot().status).toBe("streaming"),
    );
    await Promise.resolve();
    session.stop();
    await running;

    expect(session.getSnapshot().status).toBe("idle");
  });

  it("the transport gets the tool declarations without handler, schema or confirm", async () => {
    const parameters = {
      type: "object",
      properties: { n: { type: "number" } },
    };
    const { transport, calls } = scripted([done]);
    const session = createAssistantSession({
      transport,
      tools: {
        count: tool({
          description: "Counts",
          parameters,
          schema: {
            "~standard": {
              version: 1,
              vendor: "t",
              validate: () => ({ value: {} }),
            },
          },
          confirm: true,
        }),
      },
    });

    await session.send("hi");

    expect(calls[0]?.tools).toEqual({
      count: { description: "Counts", parameters },
    });
    expect(calls[0]?.tools.count?.parameters).toBe(parameters);
  });
});
