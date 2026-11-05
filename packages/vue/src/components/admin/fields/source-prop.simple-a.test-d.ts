/**
 * The first eleven display fields read a path off the ambient record, so each
 * takes `SourceProp`: `string` until an app registers its resources. They are
 * generic in their record, so a typed `record` narrows `source` and
 * `defaultValue`. A generic component is a function whose first parameter is
 * its props, so the tests read it with `Parameters`.
 */

import type { SourceProp, SourceValue } from "@chelone/core";
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

type Post = {
  id: number;
  title: string;
  published: boolean;
};

describe("display field sources", () => {
  it("the TextField source prop is SourceProp", () => {
    type Props = Parameters<typeof TextField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the NumberField source prop is SourceProp", () => {
    type Props = Parameters<typeof NumberField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the BooleanField source prop is SourceProp", () => {
    type Props = Parameters<typeof BooleanField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the DateField source prop is SourceProp", () => {
    type Props = Parameters<typeof DateField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the EmailField source prop is SourceProp", () => {
    type Props = Parameters<typeof EmailField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the UrlField source prop is SourceProp", () => {
    type Props = Parameters<typeof UrlField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the PhoneField source prop is SourceProp", () => {
    type Props = Parameters<typeof PhoneField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ColorField source prop is SourceProp", () => {
    type Props = Parameters<typeof ColorField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the CurrencyField source prop is SourceProp", () => {
    type Props = Parameters<typeof CurrencyField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the DurationField source prop is SourceProp", () => {
    type Props = Parameters<typeof DurationField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the CronField source prop is SourceProp", () => {
    type Props = Parameters<typeof CronField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("TextField with a Post record accepts a Post path and rejects another", () => {
    const post: Post = { id: 1, title: "Hello", published: true };
    type Props = Parameters<typeof TextField<Post>>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp<Post>>();
    const accepted: Props = { source: "title", record: post };
    // @ts-expect-error "missing" is not a path into Post
    const rejected: Props = { source: "missing", record: post };
    expectTypeOf(accepted).toEqualTypeOf<Props>();
    expectTypeOf(rejected).toEqualTypeOf<Props>();
  });

  it("the BooleanField defaultValue for Post is the value type of a Post path", () => {
    type Props = Parameters<typeof BooleanField<Post>>[0];
    expectTypeOf<Props["defaultValue"]>().toEqualTypeOf<
      SourceValue<Post, SourceProp<Post>> | undefined
    >();
  });
});
