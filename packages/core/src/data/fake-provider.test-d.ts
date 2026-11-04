import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  users: { schema: z.object({ id: z.string(), name: z.string() }) },
});

describe("fakeDataProvider types", () => {
  it("returns the schema's record type for a typed seed", () => {
    const dp = fakeDataProvider<typeof resources>({
      posts: [{ id: 1, title: "a" }],
      users: [{ id: "u1", name: "Ada" }],
    });
    expectTypeOf(dp.getOne("posts", { id: 1 })).resolves.toEqualTypeOf<{
      data: { id: number; title: string };
    }>();
    expectTypeOf(dp.getOne("users", { id: "u1" })).resolves.toEqualTypeOf<{
      data: { id: string; name: string };
    }>();
  });

  it("rejects a seed row with a wrong field type", () => {
    fakeDataProvider<typeof resources>({
      posts: [
        // @ts-expect-error title is a string
        { id: 1, title: 2 },
      ],
    });
  });

  it("rejects a seed for an unknown resource", () => {
    fakeDataProvider<typeof resources>({
      // @ts-expect-error no such resource
      comments: [],
    });
  });
});
