import {
  defineResources,
  type RecordOf,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";
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
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof DateInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the DateTimeInput source prop is SourceProp", () => {
    type Props = Parameters<typeof DateTimeInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
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
    type Props = Parameters<typeof NumberInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the PasswordInput source prop is SourceProp", () => {
    type Props = Parameters<typeof PasswordInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the PhoneInput source prop is SourceProp", () => {
    expectTypeOf<
      InstanceType<typeof PhoneInput>["$props"]["source"]
    >().toEqualTypeOf<SourceProp>();
  });
});

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      views: z.number(),
      tags: z.array(z.string()),
      color: z.string(),
      id: z.number(),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

describe("the text-valued inputs of a resource", () => {
  it("posts.TextInput takes defaultValue typed by its source", () => {
    const title = posts.TextInput<"title">;
    type Props = Parameters<typeof title>[0];
    expectTypeOf<Props["defaultValue"]>().toEqualTypeOf<
      SourceValue<Post, "title"> | undefined
    >();
    posts.TextInput({ source: "title", defaultValue: "Untitled" });
  });

  it("posts.TextInput rejects a default of another type", () => {
    // @ts-expect-error `title` is a string, not a number
    posts.TextInput({ source: "title", defaultValue: 1 });
  });

  it("posts.TextInput rejects a misspelled source", () => {
    // @ts-expect-error `titel` is no path of a post
    posts.TextInput({ source: "titel" });
  });

  it("the other text-valued inputs type defaultValue by their source", () => {
    posts.ColorInput({ source: "color", defaultValue: "#fff" });
    posts.PasswordInput({ source: "title", defaultValue: "x" });
    posts.ResettableTextInput({ source: "title", defaultValue: "x" });
    posts.SearchInput({ source: "title", defaultValue: "x" });
    posts.TextArrayInput({ source: "tags", defaultValue: ["a"] });
    // @ts-expect-error `tags` holds strings
    posts.TextArrayInput({ source: "tags", defaultValue: [1] });
    // @ts-expect-error `views` is a number, not a string
    posts.CronInput({ source: "views", defaultValue: "* * * * *" });
  });
});
