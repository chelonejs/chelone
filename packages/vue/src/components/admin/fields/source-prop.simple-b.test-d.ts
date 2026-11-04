/**
 * The rating to usage-meter display fields show one record field, so their
 * `source` is a path into the record and takes `SourceProp`. Sibling sources
 * (`countSource`, `limitSource`, ...) stay `string`; `SelectField`'s
 * `optionText`/`optionValue` are paths of its choices, tested in
 * `../inputs/source-prop.choices-b.test-d.ts`.
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
import type { SelectFieldProps } from "./select-field.vue";
import type SubscriptionPlanField from "./subscription-plan-field.vue";
import type TextArrayField from "./text-array-field.vue";
import type UsageMeterField from "./usage-meter-field.vue";

describe("rating to usage-meter field sources", () => {
  it("the RatingField source prop is SourceProp", () => {
    type Props = InstanceType<typeof RatingField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the JsonField source prop is SourceProp", () => {
    type Props = InstanceType<typeof JsonField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the BadgeField source prop is SourceProp", () => {
    type Props = InstanceType<typeof BadgeField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ChipField source prop is SourceProp", () => {
    type Props = InstanceType<typeof ChipField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SelectField source prop is SourceProp", () => {
    // `SelectField` is generic in its choices, so `InstanceType` of the SFC
    // does not apply; the props interface it exports defaults to the loose
    // choice, where `source` is still `SourceProp`.
    expectTypeOf<SelectFieldProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TextArrayField source prop is SourceProp", () => {
    type Props = InstanceType<typeof TextArrayField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the FileField source prop is SourceProp", () => {
    type Props = InstanceType<typeof FileField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ImageField source prop is SourceProp", () => {
    type Props = InstanceType<typeof ImageField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ApiKeyField source prop is SourceProp", () => {
    type Props = InstanceType<typeof ApiKeyField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SubscriptionPlanField source prop is SourceProp", () => {
    type Props = InstanceType<typeof SubscriptionPlanField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the UsageMeterField source prop is SourceProp", () => {
    type Props = InstanceType<typeof UsageMeterField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });
});
