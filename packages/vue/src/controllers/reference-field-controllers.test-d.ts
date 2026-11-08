import {
  defineResources,
  type LooseRecord,
  type RecordOf,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { computed, type MaybeRefOrGetter, ref } from "vue";
import { z } from "zod";
import type { RecordValue } from "../record/record-context";
import {
  type UseReferenceManyFieldControllerOptions,
  type UseReferenceOneFieldControllerOptions,
  useReferenceManyFieldController,
  useReferenceOneFieldController,
} from "./index";

const registry = defineResources({
  authors: {
    schema: z.object({ id: z.number(), name: z.string(), slug: z.string() }),
  },
  reviews: {
    schema: z.object({
      id: z.number(),
      author_id: z.number(),
      stars: z.number(),
    }),
  },
});
type Author = RecordOf<typeof registry, "authors">;
type Review = RecordOf<typeof registry, "reviews">;

const named: Author = { id: 4, name: "Ada", slug: "ada" };
const ambient = ref<RecordValue<Author>>(named);
const late = computed(() => (ambient.value ? named : undefined));

describe("the reference composables' target and source props", () => {
  it("target is the referenced record's own keys", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions<
        "reviews",
        Author,
        Review
      >["target"]
    >().toEqualTypeOf<SourceKey<Review>>();
    expectTypeOf<
      UseReferenceOneFieldControllerOptions<"reviews", Author, Review>["target"]
    >().toEqualTypeOf<"id" | "author_id" | "stars">();
  });

  it("source is a path of the record the composable reads", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions<
        "reviews",
        Author,
        Review
      >["source"]
    >().toEqualTypeOf<SourceProp<Author> | undefined>();
    expectTypeOf<
      UseReferenceOneFieldControllerOptions<"reviews", Author, Review>["source"]
    >().toEqualTypeOf<SourceProp<Author> | undefined>();
  });

  it("a target the referenced record does not have is a type error", () => {
    useReferenceManyFieldController<typeof registry, "reviews">({
      reference: "reviews",
      // @ts-expect-error "authorid" is not a key of Review
      target: "authorid",
    });
    useReferenceOneFieldController<typeof registry, "reviews">({
      reference: "reviews",
      // @ts-expect-error "authorid" is not a key of Review
      target: "authorid",
    });
  });

  it("a source the current record does not have is a type error", () => {
    useReferenceManyFieldController<typeof registry, "reviews", Author>({
      reference: "reviews",
      target: "author_id",
      record: named,
      // @ts-expect-error "nmae" is not a path of Author
      source: "nmae",
    });
    useReferenceOneFieldController<typeof registry, "reviews", Author>({
      reference: "reviews",
      target: "author_id",
      record: () => named,
      // @ts-expect-error "slugg" is not a path of Author
      source: "slugg",
    });
  });

  it("record stays a ref, a getter or a bare value", () => {
    useReferenceManyFieldController<typeof registry, "reviews", Author>({
      reference: "reviews",
      target: "author_id",
      source: "slug",
      record: ambient,
    });
    useReferenceOneFieldController<typeof registry, "reviews", Author>({
      reference: "reviews",
      target: "author_id",
      source: "slug",
      record: late,
    });
    expectTypeOf<
      UseReferenceManyFieldControllerOptions<
        "reviews",
        Author,
        Review
      >["record"]
    >().toEqualTypeOf<MaybeRefOrGetter<RecordValue<Author>> | undefined>();
  });

  it("with nothing registered both props are any string", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerOptions["target"]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      UseReferenceOneFieldControllerOptions["target"]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      UseReferenceManyFieldControllerOptions["source"]
    >().toEqualTypeOf<SourceProp<LooseRecord> | undefined>();
    useReferenceManyFieldController({
      reference: "reviews",
      target: "whatever",
      source: "some.deep[0].path",
    });
    useReferenceOneFieldController({
      reference: "reviews",
      target: "whatever",
      source: "some.deep[0].path",
    });
  });
});
