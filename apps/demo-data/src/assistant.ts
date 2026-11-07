import type {
  AssistantChunk,
  AssistantMessage,
  AssistantTool,
  AssistantTransport,
  DataProvider,
} from "@chelone/core";
import type { PostStatus } from "./seed";

const STATUSES: Record<string, PostStatus> = {
  draft: "draft",
  published: "published",
  "in review": "in_review",
};

const HELP =
  "I can count posts. Try: How many posts are there? Or: How many published posts are there?";

function statusIn(text: string): PostStatus | undefined {
  const lower = text.toLowerCase();
  return Object.entries(STATUSES).find(([word]) => lower.includes(word))?.[1];
}

function lastUserText(messages: readonly AssistantMessage[]): string {
  const user = messages.filter((message) => message.role === "user").at(-1);
  return user?.content ?? "";
}

function say(text: string): AssistantChunk[] {
  return [{ type: "text", delta: text }, { type: "done" }];
}

/**
 * The tools the demo's assistant may call. `count_posts` only reads, so it
 * needs no confirmation.
 */
export function demoAssistantTools(
  dataProvider: DataProvider,
): Record<string, AssistantTool> {
  return {
    count_posts: {
      description: "Counts posts, optionally only those with one status",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: Object.values(STATUSES) },
        },
      },
      async handler({ status }) {
        const { total } = await dataProvider.getList("posts", {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "id", order: "ASC" },
          filter: typeof status === "string" ? { status } : {},
        });
        return total;
      },
    },
  };
}

/**
 * A scripted stand-in for a model, so the demo needs no server: a question
 * about posts becomes a `count_posts` call, and the result becomes the reply.
 */
export function demoAssistantTransport(): AssistantTransport {
  return {
    async *send(messages) {
      const question = lastUserText(messages);
      const status = statusIn(question);
      const last = messages.at(-1);
      if (last?.role === "tool") {
        const noun = status ? `${status.replace("_", " ")} posts` : "posts";
        const verb = last.result === 1 ? "is" : "are";
        yield* say(last.error ?? `There ${verb} ${last.result} ${noun}.`);
      } else if (/\bposts?\b/i.test(question)) {
        yield {
          type: "tool-call",
          id: `count-${messages.length}`,
          toolName: "count_posts",
          args: status ? { status } : {},
        };
        yield { type: "done" };
      } else {
        yield* say(HELP);
      }
    },
  };
}
