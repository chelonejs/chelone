import { createAssistantSession, fakeDataProvider } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { demoAssistantTools, demoAssistantTransport } from "./assistant";
import { seedData } from "./seed";

function ask(
  question: string,
  adjust?: (seed: ReturnType<typeof seedData>) => void,
) {
  const seed = seedData();
  adjust?.(seed);
  const session = createAssistantSession({
    transport: demoAssistantTransport(),
    tools: demoAssistantTools(fakeDataProvider(seed)),
  });
  return session.send(question).then(() => ({
    seed,
    messages: session.getSnapshot().messages,
  }));
}

describe("the demo assistant", () => {
  it("counts the posts of a status with the count_posts tool", async () => {
    const { seed, messages } = await ask("How many published posts are there?");
    const published = seed.posts.filter(
      (post) => post.status === "published",
    ).length;

    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(messages.at(-1)).toMatchObject({
      role: "assistant",
      content: `There are ${published} published posts.`,
    });
  });

  it("counts every post when no status is named", async () => {
    const { seed, messages } = await ask("How many posts are there?");

    expect(messages.at(-1)).toMatchObject({
      content: `There are ${seed.posts.length} posts.`,
    });
  });

  it("uses the singular when the count is one", async () => {
    const { messages } = await ask(
      "How many in review posts are there?",
      (seed) => {
        let kept = false;
        seed.posts = seed.posts.filter((post) => {
          if (post.status !== "in_review") return true;
          const keep = !kept;
          kept = true;
          return keep;
        });
      },
    );

    expect(messages.at(-1)).toMatchObject({
      content: "There is 1 in review post.",
    });
  });

  it("does not take unpublished for published", async () => {
    const { messages } = await ask("How many unpublished posts are there?");

    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(messages.at(-1)).toMatchObject({
      content: expect.stringContaining("How many posts are there?"),
    });
  });

  it("says what it can do when the question is not about posts", async () => {
    const { messages } = await ask("What is the weather?");

    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(messages.at(-1)).toMatchObject({
      content: expect.stringContaining("How many posts are there?"),
    });
  });
});
