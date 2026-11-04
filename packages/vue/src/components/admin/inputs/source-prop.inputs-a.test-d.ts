import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type BooleanInput from "./boolean-input.vue";
import type ColorInput from "./color-input.vue";
import type CronInput from "./cron-input.vue";
import type CurrencyInput from "./currency-input.vue";
import type DateInput from "./date-input.vue";
import type DateTimeInput from "./date-time-input.vue";
import type DurationInput from "./duration-input.vue";
import type NullableBooleanInput from "./nullable-boolean-input.vue";
import type NumberInput from "./number-input.vue";
import type PasswordInput from "./password-input.vue";
import type PhoneInput from "./phone-input.vue";

describe("the first eleven inputs", () => {
  it("the BooleanInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof BooleanInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the ColorInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof ColorInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the CronInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof CronInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the CurrencyInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof CurrencyInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the DateInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof DateInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the DateTimeInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof DateTimeInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the DurationInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof DurationInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the NullableBooleanInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof NullableBooleanInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the NumberInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof NumberInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the PasswordInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof PasswordInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });

  it("the PhoneInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof PhoneInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });
});
