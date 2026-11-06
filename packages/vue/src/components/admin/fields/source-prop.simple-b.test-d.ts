/**
 * The rating to usage-meter display fields show one record field, so their
 * `source` is a path into the record and takes `SourceProp`. The sibling
 * sources (`countSource`, `limitSource`, ...) moved to `SourceKey`: see
 * `source-prop.sibling.test-d.ts`. `SelectField`'s `optionText`/`optionValue`
 * are paths of its choices: see `../inputs/source-prop.choices-b.test-d.ts`.
 *
 * All eleven are generic in their record, and a generic SFC is a function type,
 * not a constructor, so every assertion here reads its props through
 * `Parameters<typeof X>[0]` (at the default type argument).
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type ApiKeyField from "./api-key-field.vue";
import type BadgeField from "./badge-field.vue";
import type ChipField from "./chip-field.vue";
import type FileField from "./file-field.vue";
import type ImageField from "./image-field.vue";
import type JsonField from "./json-field.vue";
import type RatingField from "./rating-field.vue";
import type SelectField from "./select-field.vue";
import type SubscriptionPlanField from "./subscription-plan-field.vue";
import type TextArrayField from "./text-array-field.vue";
import type UsageMeterField from "./usage-meter-field.vue";

type Post = {
  id: number;
  title: string;
  meta: { views: number; tags: string[] };
};

describe("rating to usage-meter field sources", () => {
  it("the RatingField source prop is SourceProp", () => {
    type Props = Parameters<typeof RatingField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the JsonField source prop is SourceProp", () => {
    type Props = Parameters<typeof JsonField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the BadgeField source prop is SourceProp", () => {
    type Props = Parameters<typeof BadgeField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ChipField source prop is SourceProp", () => {
    type Props = Parameters<typeof ChipField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SelectField source prop is SourceProp", () => {
    type Props = Parameters<typeof SelectField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TextArrayField source prop is SourceProp", () => {
    type Props = Parameters<typeof TextArrayField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the FileField source prop is SourceProp", () => {
    type Props = Parameters<typeof FileField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ImageField source prop is SourceProp", () => {
    type Props = Parameters<typeof ImageField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ApiKeyField source prop is SourceProp", () => {
    type Props = Parameters<typeof ApiKeyField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SubscriptionPlanField source prop is SourceProp", () => {
    type Props = Parameters<typeof SubscriptionPlanField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the UsageMeterField source prop is SourceProp", () => {
    type Props = Parameters<typeof UsageMeterField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("JsonField with a Post record takes Post paths only", () => {
    const post: Post = {
      id: 7,
      title: "Hello",
      meta: { views: 3, tags: ["a"] },
    };
    type JsonProps = Parameters<typeof JsonField<Post>>[0];
    expectTypeOf<JsonProps["source"]>().toEqualTypeOf<SourceProp<Post>>();
    const legal: JsonProps = { source: "meta.tags[0]", record: post };
    // @ts-expect-error "missing" is not a path into Post
    const illegal: JsonProps = { source: "missing", record: post };
    void [legal, illegal];
  });
});
