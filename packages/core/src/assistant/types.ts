import type { StandardSchemaV1 } from "@tanstack/form-core";

/** A tool call the model asked for. `id` ties the result back to it. */
export interface AssistantToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
}

export type AssistantMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      /** Present once the calls ran and their results follow as tool messages. */
      toolCalls?: AssistantToolCall[];
    }
  | {
      role: "tool";
      /** The `id` of the call this answers. */
      id: string;
      toolName: string;
      /** What the handler returned; absent when `error` is set. */
      result?: unknown;
      error?: string;
    };

export type AssistantChunk =
  | { type: "text"; delta: string }
  | ({ type: "tool-call" } & AssistantToolCall)
  | { type: "done" };

export interface AssistantTool {
  description: string;
  /** A JSON Schema object, handed to the transport as is. */
  parameters: Record<string, unknown>;
  /** Method syntax keeps a handler with narrower `args` assignable. */
  handler(args: Record<string, unknown>): unknown;
  /** Checks the arguments before `handler` runs; its output reaches `handler`. */
  schema?: StandardSchemaV1;
  /** Ask the user through the session's `confirmTool` before this tool runs. */
  confirm?: boolean;
}

/** What a transport learns about a tool: no handler, schema or confirm. */
export interface AssistantToolDeclaration {
  description: string;
  parameters: Record<string, unknown>;
}

export interface AssistantTransport {
  send(
    messages: readonly AssistantMessage[],
    tools: Readonly<Record<string, AssistantToolDeclaration>>,
    options: { signal: AbortSignal },
  ): AsyncIterable<AssistantChunk>;
}
