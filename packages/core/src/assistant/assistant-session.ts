import { createMicroStore, type MicroStore } from "../store/micro-store";
import type {
  AssistantChunk,
  AssistantMessage,
  AssistantTool,
  AssistantToolCall,
  AssistantToolDeclaration,
  AssistantTransport,
} from "./types";

export interface AssistantSessionState {
  messages: AssistantMessage[];
  status: "idle" | "streaming" | "error";
  error: Error | null;
}

export interface CreateAssistantSessionOptions {
  transport: AssistantTransport;
  tools: Record<string, AssistantTool>;
  /** Follow-up turns after tool calls before the session gives up. Default 5. */
  maxToolRounds?: number;
  /** Answers for tools that set `confirm`. Without it they never run. */
  confirmTool?: (call: AssistantToolCall) => boolean | Promise<boolean>;
}

export interface AssistantSession extends MicroStore<AssistantSessionState> {
  /** Resolves when the turn, with its tool rounds, ends. */
  send(text: string): Promise<void>;
  /**
   * After an error, runs the last user message again: whatever the failed
   * turn added after it is dropped and no second user message is added.
   * Does nothing unless the status is `error`.
   */
  retry(): Promise<void>;
  stop(): void;
  reset(): void;
}

type ToolMessage = Extract<AssistantMessage, { role: "tool" }>;

// type-escape: server: a caught value is unknown until it is checked.
const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const issuesText = (issues: ReadonlyArray<{ readonly message: string }>) =>
  issues.map((issue) => issue.message).join("; ");

/** Resolves with `undefined` when the signal aborts before the promise settles. */
function raceAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const onAbort = () => resolve(undefined);
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

export function createAssistantSession({
  transport,
  tools,
  maxToolRounds = 5,
  confirmTool,
}: CreateAssistantSessionOptions): AssistantSession {
  const store = createMicroStore<AssistantSessionState>({
    messages: [],
    status: "idle",
    error: null,
  });
  const declarations: Record<string, AssistantToolDeclaration> =
    Object.fromEntries(
      Object.entries(tools).map(([name, { description, parameters }]) => [
        name,
        { description, parameters },
      ]),
    );
  let active: AbortController | null = null;
  let destroyed = false;
  // An adapter destroys the session on unmount: end the turn so no tool runs after.
  store.onDestroy(() => {
    destroyed = true;
    active?.abort();
    active = null;
  });

  async function runTool(
    call: AssistantToolCall,
    signal: AbortSignal,
  ): Promise<ToolMessage> {
    const base = {
      role: "tool",
      id: call.id,
      toolName: call.toolName,
    } as const;
    // hasOwn, because a model can name `constructor` or `__proto__`.
    const definition = Object.hasOwn(tools, call.toolName)
      ? tools[call.toolName]
      : undefined;
    if (!definition) {
      return { ...base, error: `Unknown tool: ${call.toolName}` };
    }
    const stopped = { ...base, error: "Stopped" };
    try {
      let args = call.args;
      if (definition.schema) {
        const outcome = await definition.schema["~standard"].validate(args);
        if (signal.aborted) return stopped;
        if (outcome.issues) {
          return {
            ...base,
            error: `Invalid arguments: ${issuesText(outcome.issues)}`,
          };
        }
        args = outcome.value;
      }
      if (definition.confirm) {
        const answer = await confirmTool?.(call);
        // A stop while the dialog is open must not let a late "yes" run the tool.
        if (signal.aborted) return stopped;
        if (!answer) {
          return { ...base, error: "The user declined to run this tool" };
        }
      }
      return { ...base, result: await definition.handler(args) };
    } catch (error) {
      return { ...base, error: toError(error).message };
    }
  }

  async function run(controller: AbortController): Promise<void> {
    const { signal } = controller;
    // Whatever stop() or reset() did, this turn writes nothing after it.
    const update = (
      patch: (s: AssistantSessionState) => Partial<AssistantSessionState>,
    ) => {
      if (!signal.aborted) store.setState(patch);
    };

    for (let round = 0; ; round++) {
      let content = "";
      let index = -1;
      const calls: AssistantToolCall[] = [];
      let iterator: AsyncIterator<AssistantChunk> | undefined;
      try {
        iterator = transport
          .send(store.getSnapshot().messages, declarations, { signal })
          [Symbol.asyncIterator]();
        for (;;) {
          const step = await raceAbort(iterator.next(), signal);
          if (!step || step.done || signal.aborted) break;
          const chunk = step.value;
          if (chunk.type === "done") break;
          if (chunk.type === "tool-call") {
            const { id, toolName, args } = chunk;
            calls.push({ id, toolName, args });
            continue;
          }
          content += chunk.delta;
          const text = content;
          if (index < 0) {
            index = store.getSnapshot().messages.length;
            update((s) => ({
              messages: [...s.messages, { role: "assistant", content: text }],
            }));
          } else {
            update((s) => ({
              messages: s.messages.map((m, i) =>
                i === index ? { role: "assistant", content: text } : m,
              ),
            }));
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          update(() => ({ status: "error", error: toError(error) }));
        }
        return;
      } finally {
        // Let a generator release what it holds; its failure is not ours.
        iterator?.return?.().catch(() => {});
      }
      if (signal.aborted) return;
      if (calls.length === 0) break;
      if (round >= maxToolRounds) {
        update(() => ({
          status: "error",
          error: new Error(
            `The assistant kept calling tools after ${maxToolRounds} rounds`,
          ),
        }));
        return;
      }

      const results: ToolMessage[] = [];
      for (const call of calls) {
        // A tool that never settles must not hold the turn after a stop.
        const result = await raceAbort(runTool(call, signal), signal);
        if (!result) return;
        results.push(result);
        if (signal.aborted) return;
      }
      // Calls join the assistant message only with their results, so a stop
      // never leaves a call that no tool message answers.
      const assistant: AssistantMessage = {
        role: "assistant",
        content,
        toolCalls: calls,
      };
      update((s) => ({
        messages:
          index < 0
            ? [...s.messages, assistant, ...results]
            : [
                ...s.messages.map((m, i) => (i === index ? assistant : m)),
                ...results,
              ],
      }));
    }
    update(() => ({ status: "idle" }));
  }

  async function start(controller: AbortController): Promise<void> {
    active = controller;
    try {
      await run(controller);
    } finally {
      if (active === controller) active = null;
    }
  }

  return {
    ...store,
    async send(text) {
      if (destroyed) return;
      if (!text.trim() || store.getSnapshot().status === "streaming") return;
      store.setState((s) => ({
        messages: [...s.messages, { role: "user", content: text }],
        status: "streaming",
        error: null,
      }));
      await start(new AbortController());
    },
    async retry() {
      if (destroyed || store.getSnapshot().status !== "error") return;
      const { messages } = store.getSnapshot();
      let last = messages.length - 1;
      while (last >= 0 && messages[last]?.role !== "user") last--;
      if (last < 0) return;
      store.setState({
        messages: messages.slice(0, last + 1),
        status: "streaming",
        error: null,
      });
      await start(new AbortController());
    },
    stop() {
      if (!active) return;
      active.abort();
      active = null;
      store.setState({ status: "idle" });
    },
    reset() {
      active?.abort();
      active = null;
      store.setState({ messages: [], status: "idle", error: null });
    },
  };
}
