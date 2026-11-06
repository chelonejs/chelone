/**
 * `<DatagridInput>` under a resource: `defaultValue` is the value its `source`
 * holds, which is what the React twin's `DatagridInput` now types it as.
 * `createResourceComponentsOf` takes the map as a type argument, so no
 * `Register` augmentation is needed.
 */

import {
  defineResources,
  type RecordOf,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";
import type { DatagridInputProps } from "./datagrid-input.vue";

// A `type`, not an `interface`: only a type alias satisfies `ChoiceRecord`.
type Author = { id: number; name: string };

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      tagIds: z.array(z.number()),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

const choices: Author[] = [{ id: 1, name: "Ada" }];

type DatagridAtTagIds = typeof posts.DatagridInput<"tagIds", Author>;

describe("DatagridInput defaultValue", () => {
  it("posts.DatagridInput seeds the id array its source holds", () => {
    expectTypeOf<
      Parameters<DatagridAtTagIds>[0]["defaultValue"]
    >().not.toBeUnknown();
    posts.DatagridInput({ source: "tagIds", choices, defaultValue: [1, 2] });
    posts.DatagridInput({
      source: "tagIds",
      choices,
      // @ts-expect-error `tagIds` holds numbers, not strings
      defaultValue: ["one"],
    });
  });

  it("DatagridInputProps types defaultValue as the value at its source", () => {
    expectTypeOf<
      DatagridInputProps<Post, "tagIds">["defaultValue"]
    >().toEqualTypeOf<SourceValue<Post, "tagIds"> | undefined>();
    const wrong: DatagridInputProps<Post, "tagIds"> = {
      source: "tagIds",
      choices,
      // @ts-expect-error `tagIds` holds numbers, not strings
      defaultValue: ["one"],
    };
    void wrong;
  });

  it("the member rejects a source the record lacks", () => {
    // @ts-expect-error `tagz` is no path of a post
    posts.DatagridInput({ source: "tagz", choices });
  });

  it("the loose component keeps an untyped default", () => {
    expectTypeOf<DatagridInputProps["defaultValue"]>().toBeUnknown();
  });
});
