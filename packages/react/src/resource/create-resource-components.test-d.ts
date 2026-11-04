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
      views: z.number(),
      publishedAt: z.date().nullable(),
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

describe("format, parse and transform", () => {
  it("a posts input's format receives the value type at its source", () => {
    posts.NumberInput({
      source: "views",
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        return String(value);
      },
    });
    posts.TextInput({
      source: "title",
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value;
      },
    });
    posts.TextInput({
      source: "tags[0].label",
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value;
      },
    });
  });

  it("a posts input's parse must return the value type at its source", () => {
    posts.TextInput({ source: "title", parse: (value) => String(value) });
    posts.TextInput({
      source: "title",
      // @ts-expect-error `title` is a string, not a number
      parse: (value) => Number(value),
    });
  });

  it("a posts date field's transform receives the value type at its source", () => {
    posts.DateField({
      source: "publishedAt",
      transform: (value) => {
        expectTypeOf(value).toEqualTypeOf<Date | null>();
        return value ?? undefined;
      },
    });
    posts.NumberField({
      source: "views",
      transform: (value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        return value;
      },
    });
  });

  it("a member with no format, parse or transform keeps its props", () => {
    const count: Props<typeof posts.ReferenceManyCount> = {
      reference: "comments",
      target: "post_id",
    };
    posts.TextField({ source: "title" });
    // @ts-expect-error a typo is still rejected by a member with a value callback
    posts.TextInput({ source: "titel" });
    void count;
  });
});

describe("createResourceComponents", () => {
  it("createResourceComponents takes any name when nothing is registered", () => {
    const anything = createResourceComponents("anything-at-all");
    const ok: Props<typeof anything.TextInput> = { source: "whatever.path" };
    void ok;
  });
});
