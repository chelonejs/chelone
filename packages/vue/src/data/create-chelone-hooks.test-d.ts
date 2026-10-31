import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createCheloneHooks } from "./create-chelone-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});
type R = typeof resources;

describe("createCheloneHooks", () => {
  it("data infers from the registry and an unknown resource name is a type error", () => {
    const hooks = createCheloneHooks<R>();

    expectTypeOf(hooks.useGetList("posts").data.value?.data).toEqualTypeOf<
      { id: number; title: string }[] | undefined
    >();
    expectTypeOf(
      hooks.useGetOne("comments", { id: 1 }).data.value,
    ).toEqualTypeOf<
      { id: number; post_id: number; body: string } | undefined
    >();
    expectTypeOf(hooks.useCreate("posts").mutateAsync)
      .parameter(0)
      .toHaveProperty("data");

    // Reactive params stay reactive.
    hooks.useGetList("posts", () => ({ pagination: { page: 1, perPage: 5 } }));

    // @ts-expect-error unknown resource name rejected by the bound hooks
    hooks.useGetList("nope");
    // @ts-expect-error unknown resource name rejected by the bound hooks
    hooks.useCreate("nope");
    // @ts-expect-error unknown resource name rejected by the bound hooks
    hooks.useUpdateMany("nope");
  });
});
