/**
 * `<MdxInput>` inherits `defaultValue` from `InputProps` rather than declaring
 * its own: it is the value the record holds, never an `unknown` an app can hand
 * anything to.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { InputProps } from "../admin/input-props";
import type { MdxInputProps } from "./mdx-input";

const resources = defineResources({
  notes: {
    schema: z.object({
      body: z.string(),
      meta: z.object({ pinned: z.boolean() }),
    }),
  },
});

type Note = RecordOf<typeof resources, "notes">;
declare function acceptMdx(props: MdxInputProps<Note>): void;

describe("MdxInput defaultValue", () => {
  it("MdxInputProps<Note> takes the prop InputProps types", () => {
    expectTypeOf<MdxInputProps<Note>["defaultValue"]>().toEqualTypeOf<
      InputProps<Note>["defaultValue"]
    >();
    expectTypeOf<MdxInputProps<Note>["defaultValue"]>().not.toBeUnknown();
    acceptMdx({ source: "body", defaultValue: "Untitled" });
    acceptMdx({ source: "meta", defaultValue: { pinned: true } });
    // @ts-expect-error no path of a note holds a number
    acceptMdx({ source: "body", defaultValue: 3 });
  });

  it("a note the app never registered keeps the default open", () => {
    expectTypeOf<MdxInputProps["defaultValue"]>().toBeUnknown();
  });
});
