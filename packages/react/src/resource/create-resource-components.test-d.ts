/**
 * What a `posts` call site sees. `createResourceComponentsOf` takes the
 * resource map as a type argument, so these tests need no `Register`
 * augmentation, which is global to a TypeScript program.
 */
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  createResourceComponents,
  createResourceComponentsOf,
} from "./create-resource-components";

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      tags: z.array(z.object({ label: z.string() })),
    }),
  },
  comments: { schema: z.object({ body: z.string() }) },
});

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

type Props<T> = T extends (props: infer P) => unknown ? P : never;

describe("createResourceComponentsOf", () => {
  it("a posts input accepts a posts path and a bracket path", () => {
    const path: Props<typeof posts.TextInput> = { source: "title" };
    const bracket: Props<typeof posts.TextInput> = {
      source: "tags[0].label",
    };
    const field: Props<typeof posts.TextField> = { source: "title" };
    void [path, bracket, field];
  });

  it("a posts input rejects a typo and a path that only another resource has", () => {
    const typo: Props<typeof posts.TextInput> = {
      // @ts-expect-error `titel` is no path of a post
      source: "titel",
    };
    const other: Props<typeof posts.TextInput> = {
      // @ts-expect-error `body` belongs to comments
      source: "body",
    };
    const field: Props<typeof posts.TextField> = {
      // @ts-expect-error a field is checked the same way
      source: "body",
    };
    void [typo, other, field];
  });

  it("a posts view has no resource prop", () => {
    expectTypeOf<Props<typeof posts.Edit>>().not.toHaveProperty("resource");
    expectTypeOf<Props<typeof posts.Create>>().not.toHaveProperty("resource");
    expectTypeOf<Props<typeof posts.Show>>().not.toHaveProperty("resource");
    expectTypeOf<Props<typeof posts.List>>().not.toHaveProperty("resource");
    // The other props stay.
    expectTypeOf<Props<typeof posts.List>>().toHaveProperty("perPage");
    const bound: Props<typeof posts.Edit> = {
      // @ts-expect-error `resource` is bound by the factory
      resource: "comments",
    };
    void bound;
  });

  it("an optional source stays optional", () => {
    // `ReferenceManyCount`'s `source` is optional; `TextInput`'s is required.
    const optional: Props<typeof posts.ReferenceManyCount> = {
      reference: "comments",
      target: "post_id",
    };
    // @ts-expect-error a required source is still required
    const required: Props<typeof posts.TextInput> = {};
    void [optional, required];
  });

  it("rejects a name the map does not have", () => {
    // @ts-expect-error `tags` is no resource of the map
    createResourceComponentsOf<typeof resources, "tags">("tags");
  });
});

describe("createResourceComponents", () => {
  it("createResourceComponents takes any name when nothing is registered", () => {
    const anything = createResourceComponents("anything-at-all");
    const ok: Props<typeof anything.TextInput> = { source: "whatever.path" };
    void ok;
  });
});
