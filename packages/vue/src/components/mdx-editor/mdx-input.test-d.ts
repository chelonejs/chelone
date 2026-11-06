/**
 * `<MdxInput>` is generic in its record and its `source`, so `defaultValue` is
 * the value at that `source` and not an `unknown` an app can hand anything to.
 * The Vue twin of `@chelone/react`'s `mdx-editor/mdx-input.tsx`.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { MdxInputProps } from "./mdx-input.vue";

const resources = defineResources({
  notes: {
    schema: z.object({
      body: z.string(),
      words: z.number(),
    }),
  },
});

type Note = RecordOf<typeof resources, "notes">;
declare function acceptMdx(props: MdxInputProps<Note, "body">): void;

describe("the Vue MdxInput defaultValue", () => {
  it("the props type holds the source literal and the value at it", () => {
    expectTypeOf<
      MdxInputProps<Note, "body">["source"]
    >().toEqualTypeOf<"body">();
    expectTypeOf<
      MdxInputProps<Note, "body">["defaultValue"]
    >().not.toBeUnknown();
    acceptMdx({ source: "body", defaultValue: "Untitled" });
    // @ts-expect-error `body` holds a string
    acceptMdx({ source: "body", defaultValue: 3 });
  });

  it("the source is a path of the record the props name", () => {
    // @ts-expect-error `wordz` is no path of a note
    acceptMdx({ source: "wordz", defaultValue: "x" });
  });

  it("the loose component keeps an untyped default", () => {
    expectTypeOf<MdxInputProps["defaultValue"]>().toBeUnknown();
  });
});
