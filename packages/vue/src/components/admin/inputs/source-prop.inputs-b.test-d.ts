/**
 * The rating to subscription-plan inputs bind one record field, so their
 * `source` is a path into the record and takes `SourceProp`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type FileInput from "./file-input.vue";
import type RatingInput from "./rating-input.vue";
import type ResettableTextInput from "./resettable-text-input.vue";
import type SubscriptionPlanPicker from "./subscription-plan-picker.vue";
import type TextArrayInput from "./text-array-input.vue";
import type TextInput from "./text-input.vue";
import type TimeInput from "./time-input.vue";

describe("rating to subscription-plan input sources", () => {
  it("the RatingInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof RatingInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TextInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof TextInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TimeInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof TimeInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TextArrayInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof TextArrayInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the FileInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof FileInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ResettableTextInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof ResettableTextInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SubscriptionPlanPicker source prop is SourceProp", () => {
    type Props = InstanceType<typeof SubscriptionPlanPicker>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });
});
