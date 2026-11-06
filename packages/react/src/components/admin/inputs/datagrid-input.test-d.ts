/**
 * `<DatagridInput>` inherits `defaultValue` from `InputProps` instead of
 * redeclaring it: the member a resource hands out seeds the value its `source`
 * holds, and `DatagridInputProps` says the same on its own.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../resource/create-resource-components";
import type { InputProps } from "../input-props";
import type { DatagridInputProps } from "./datagrid-input";

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      tag_ids: z.array(z.number()),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");
type DatagridAtTags = typeof posts.DatagridInput<"tag_ids">;
declare function acceptDatagrid(props: DatagridInputProps<Post>): void;

describe("DatagridInput defaultValue", () => {
  it("posts.DatagridInput seeds the id array its source holds", () => {
    expectTypeOf<
      Parameters<DatagridAtTags>[0]["defaultValue"]
    >().not.toBeUnknown();
    posts.DatagridInput({ source: "tag_ids", defaultValue: [1, 2] });
    posts.DatagridInput({
      source: "tag_ids",
      // @ts-expect-error `tag_ids` holds numbers, not strings
      defaultValue: ["one"],
    });
  });

  it("DatagridInputProps takes the prop InputProps types", () => {
    expectTypeOf<DatagridInputProps<Post>["defaultValue"]>().toEqualTypeOf<
      InputProps<Post>["defaultValue"]
    >();
    acceptDatagrid({ source: "tag_ids", defaultValue: [1, 2] });
    // @ts-expect-error no path of a post holds an array of strings
    acceptDatagrid({ source: "title", defaultValue: ["one"] });
  });

  it("the loose component keeps an untyped default", () => {
    expectTypeOf<DatagridInputProps["defaultValue"]>().toBeUnknown();
  });
});
