/**
 * The first eleven display fields read a path off the ambient record, so each
 * takes `SourceProp`: `string` until an app registers its resources.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type BooleanField from "./boolean-field.vue";
import type ColorField from "./color-field.vue";
import type CronField from "./cron-field.vue";
import type CurrencyField from "./currency-field.vue";
import type DateField from "./date-field.vue";
import type DurationField from "./duration-field.vue";
import type EmailField from "./email-field.vue";
import type NumberField from "./number-field.vue";
import type PhoneField from "./phone-field.vue";
import type TextField from "./text-field.vue";
import type UrlField from "./url-field.vue";

describe("display field sources", () => {
  it("the TextField source prop is SourceProp", () => {
    type Props = InstanceType<typeof TextField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the NumberField source prop is SourceProp", () => {
    type Props = InstanceType<typeof NumberField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the BooleanField source prop is SourceProp", () => {
    type Props = InstanceType<typeof BooleanField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the DateField source prop is SourceProp", () => {
    type Props = InstanceType<typeof DateField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the EmailField source prop is SourceProp", () => {
    type Props = InstanceType<typeof EmailField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the UrlField source prop is SourceProp", () => {
    type Props = InstanceType<typeof UrlField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the PhoneField source prop is SourceProp", () => {
    type Props = InstanceType<typeof PhoneField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ColorField source prop is SourceProp", () => {
    type Props = InstanceType<typeof ColorField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the CurrencyField source prop is SourceProp", () => {
    type Props = InstanceType<typeof CurrencyField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the DurationField source prop is SourceProp", () => {
    type Props = InstanceType<typeof DurationField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the CronField source prop is SourceProp", () => {
    type Props = InstanceType<typeof CronField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });
});
