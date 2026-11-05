/**
 * The number, boolean and file inputs keep the record and the `source` they are
 * given, so a resource's member types `defaultValue` as the value at the
 * `source` and each `parse` takes the one value its control produces.
 */

import type { FileSelection, SourceValue } from "@chelone/core";
import { defineResources } from "@chelone/core";
import type { FocusEvent } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../resource/create-resource-components";

const postSchema = z.object({
  title: z.string(),
  views: z.number(),
  published: z.boolean(),
  featured: z.boolean().nullable(),
});

const resources = defineResources({ posts: { schema: postSchema } });
type Post = z.output<typeof postSchema>;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

type NumberInputAtViews = typeof posts.NumberInput<"views">;
type BooleanInputAtPublished = typeof posts.BooleanInput<"published">;

describe("number, boolean and file inputs", () => {
  it("posts.NumberInput types defaultValue as the value at its source", () => {
    expectTypeOf<
      Parameters<NumberInputAtViews>[0]["defaultValue"]
    >().toEqualTypeOf<SourceValue<Post, "views"> | undefined>();
    posts.NumberInput({ source: "views", defaultValue: 3 });
    posts.NumberInput({
      source: "views",
      // @ts-expect-error `views` is a number, not a string
      defaultValue: "3",
    });
  });

  it("posts.BooleanInput types defaultValue as the value at its source", () => {
    expectTypeOf<
      Parameters<BooleanInputAtPublished>[0]["defaultValue"]
    >().toEqualTypeOf<SourceValue<Post, "published"> | undefined>();
    posts.BooleanInput({ source: "published", defaultValue: true });
    posts.BooleanInput({
      source: "published",
      // @ts-expect-error `published` is a boolean, not a string
      defaultValue: "yes",
    });
  });

  it("NumberInput parse takes the typed string the control produced", () => {
    posts.NumberInput({
      source: "views",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return Number(value);
      },
    });
  });

  it("BooleanInput parse takes a boolean", () => {
    posts.BooleanInput({
      source: "published",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<boolean>();
        return value;
      },
    });
  });

  it("BooleanInput format returns a boolean and onBlur takes a FocusEvent", () => {
    posts.BooleanInput({
      source: "published",
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<boolean>();
        return value;
      },
      onBlur: (event) => {
        expectTypeOf(event).toEqualTypeOf<FocusEvent | undefined>();
      },
    });
    posts.BooleanInput({
      source: "published",
      // @ts-expect-error format must return the boolean the switch reflects
      format: (value) => String(value),
    });
  });

  it("NullableBooleanInput parse takes the select's string", () => {
    posts.NullableBooleanInput({
      source: "featured",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value === "true" ? true : null;
      },
    });
  });

  it("FileInput parse takes the files the dropzone holds", () => {
    posts.FileInput({
      source: "title",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<FileSelection>();
        return "";
      },
    });
  });

  it("rejects a source the record lacks", () => {
    // @ts-expect-error `viewz` is no path of a post
    posts.NumberInput({ source: "viewz" });
    // @ts-expect-error `viewz` is no path of a post
    posts.BooleanInput({ source: "viewz" });
    // @ts-expect-error `viewz` is no path of a post
    posts.NullableBooleanInput({ source: "viewz" });
    // @ts-expect-error `viewz` is no path of a post
    posts.FileInput({ source: "viewz" });
  });
});
