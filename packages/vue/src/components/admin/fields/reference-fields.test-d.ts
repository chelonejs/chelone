/**
 * `reference` and `target` on the Vue reference components, typed against a
 * resource map. The map is a type argument, as in `createResourceComponentsOf`,
 * so these tests need no `Register` augmentation, which is global to a TypeScript
 * program. Each case is a props object: the SFCs are generic, so their props are
 * read through the exported props interfaces.
 */

import {
  defineResources,
  type RecordOf,
  type ReferenceTargetOf,
  type RegisteredResourceName,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { ReferenceArrayInputProps } from "../inputs/reference-array-input.vue";
import type { ReferenceInputProps } from "../inputs/reference-input.vue";
import type { ReferenceArrayFieldProps } from "./reference-array-field.vue";
import type { ReferenceFieldProps } from "./reference-field.vue";
import type { ReferenceManyFieldProps } from "./reference-many-field.vue";
import type { ReferenceOneFieldProps } from "./reference-one-field.vue";

const catalog = defineResources({
  authors: { schema: z.object({ id: z.number(), name: z.string() }) },
  reviews: {
    schema: z.object({
      id: z.number(),
      author_id: z.number(),
      stars: z.number(),
      body: z.string().optional(),
    }),
  },
  badges: { schema: z.object({ id: z.string(), label: z.string() }) },
});

type Author = RecordOf<typeof catalog, "authors">;
type Review = RecordOf<typeof catalog, "reviews">;
type ReviewTarget = ReferenceTargetOf<typeof catalog, "reviews">;

const author: Author = { id: 4, name: "Ada" };

/**
 * What an app with `Register` augmented sees: the map is fixed by the app and
 * only the name is inferred, so `target` follows the name with no type argument
 * written at the call.
 */
declare function reviewPropsOf<TName extends keyof typeof catalog & string>(
  props: ReferenceManyFieldProps<Author, typeof catalog, TName>,
): void;

describe("the loose components", () => {
  it("with no augmentation reference is RegisteredResourceName", () => {
    expectTypeOf<
      ReferenceFieldProps["reference"]
    >().toEqualTypeOf<RegisteredResourceName>();
    expectTypeOf<ReferenceOneFieldProps["target"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceArrayInputProps["reference"]
    >().toEqualTypeOf<RegisteredResourceName>();
  });

  it("source keeps its own record typing", () => {
    expectTypeOf<ReferenceFieldProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<ReferenceManyFieldProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("an unregistered app passes any name and any column", () => {
    const field: ReferenceFieldProps = {
      source: "author_id",
      reference: "whoever",
    };
    const one: ReferenceOneFieldProps = {
      reference: "whoever",
      target: "some_column",
    };
    const array: ReferenceArrayFieldProps = {
      source: "tag_ids",
      reference: "whoever",
    };
    const picker: ReferenceInputProps = {
      source: "company_id",
      reference: "whoever",
    };
    const multi: ReferenceArrayInputProps = {
      source: "tag_ids",
      reference: "whoever",
    };
    void [field, one, array, picker, multi];
  });
});

describe("the components under a resource map", () => {
  it("reference takes only the map's names", () => {
    const field: ReferenceFieldProps<Author, typeof catalog> = {
      source: "id",
      reference: "reviews",
    };
    const picker: ReferenceInputProps<typeof catalog> = {
      source: "author_id",
      reference: "badges",
    };
    const badField: ReferenceFieldProps<Author, typeof catalog> = {
      source: "id",
      // @ts-expect-error "tags" is no resource of the catalog
      reference: "tags",
    };
    const badPicker: ReferenceInputProps<typeof catalog> = {
      source: "author_id",
      // @ts-expect-error "reviews" is a resource, "review" is not
      reference: "review",
    };
    void [field, picker, badField, badPicker];
  });

  it("target takes only a key of the referenced record", () => {
    expectTypeOf<ReviewTarget>().toEqualTypeOf<SourceKey<Review>>();
    expectTypeOf<ReviewTarget>().toEqualTypeOf<
      "id" | "author_id" | "stars" | "body"
    >();
    const many: ReferenceManyFieldProps<Author, typeof catalog, "reviews"> = {
      reference: "reviews",
      target: "author_id",
    };
    const badMany: ReferenceManyFieldProps<Author, typeof catalog, "reviews"> =
      {
        reference: "reviews",
        // @ts-expect-error "authorid" is no key of a review
        target: "authorid",
      };
    const badOne: ReferenceOneFieldProps<Author, typeof catalog, "reviews"> = {
      reference: "reviews",
      // @ts-expect-error "name" is a key of an author, not of a review
      target: "name",
    };
    void [many, badMany, badOne];
  });

  it("the name follows the reference prop", () => {
    reviewPropsOf({ reference: "reviews", target: "stars" });
    reviewPropsOf({
      reference: "reviews",
      // @ts-expect-error "stars" is a key of a review, "star" is not
      target: "star",
    });
    reviewPropsOf({
      // @ts-expect-error "rewiews" is no resource of the catalog
      reference: "rewiews",
      target: "id",
    });
  });

  it("source stays a path of the record it reads", () => {
    expectTypeOf<ReferenceFieldProps<Author>["source"]>().toEqualTypeOf<
      SourceProp<Author>
    >();
    const field: ReferenceFieldProps<Author, typeof catalog, "badges"> = {
      source: "name",
      reference: "badges",
      record: author,
    };
    const badField: ReferenceFieldProps<Author, typeof catalog, "badges"> = {
      // @ts-expect-error "nmae" is no path of an author
      source: "nmae",
      reference: "badges",
      record: author,
    };
    const badArray: ReferenceArrayFieldProps<Author, typeof catalog, "badges"> =
      {
        // @ts-expect-error "idz" is no path of an author
        source: "idz",
        reference: "badges",
        record: author,
      };
    void [field, badField, badArray];
  });
});
