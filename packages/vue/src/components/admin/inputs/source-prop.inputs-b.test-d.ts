/**
 * The rating to subscription-plan inputs bind one record field, so their
 * `source` is a path into the record and takes `SourceProp`.
 */

import {
  defineResources,
  type RecordOf,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";
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
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof TextInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TimeInput source prop is SourceProp", () => {
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof TimeInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the TextArrayInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof TextArrayInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the FileInput source prop is SourceProp", () => {
    type Props = Parameters<typeof FileInput>[0];
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

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      price: z.number().nullable(),
      rating: z.number(),
      length: z.string().nullable(),
      plan: z.string(),
      hook: z.object({
        url: z.string(),
        secret: z.string(),
        eventTypes: z.array(z.string()),
      }),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

const posts = createResourceComponentsOf<typeof resources, "posts">("posts");

describe("the posts members of the currency, rating, duration, plan and webhook inputs", () => {
  it("type defaultValue as the value at source", () => {
    const currency = posts.CurrencyInput<"price">;
    const rating = posts.RatingInput<"rating">;
    const duration = posts.DurationInput<"length">;
    const plan = posts.SubscriptionPlanPicker<"plan">;
    const webhook = posts.WebhookEndpointInput<"hook">;
    expectTypeOf<
      NonNullable<Parameters<typeof currency>[0]["defaultValue"]>
    >().toEqualTypeOf<NonNullable<SourceValue<Post, "price">>>();
    expectTypeOf<
      NonNullable<Parameters<typeof rating>[0]["defaultValue"]>
    >().toEqualTypeOf<SourceValue<Post, "rating">>();
    expectTypeOf<
      NonNullable<Parameters<typeof duration>[0]["defaultValue"]>
    >().toEqualTypeOf<NonNullable<SourceValue<Post, "length">>>();
    expectTypeOf<
      NonNullable<Parameters<typeof plan>[0]["defaultValue"]>
    >().toEqualTypeOf<SourceValue<Post, "plan">>();
    expectTypeOf<
      NonNullable<Parameters<typeof webhook>[0]["defaultValue"]>
    >().toEqualTypeOf<SourceValue<Post, "hook">>();
  });

  it("accept a source of the record and a default of its value", () => {
    posts.CurrencyInput({ source: "price", defaultValue: 5 });
    posts.RatingInput({ source: "rating", defaultValue: 3 });
    posts.DurationInput({ source: "length", defaultValue: "PT1H" });
    posts.SubscriptionPlanPicker({
      source: "plan",
      plans: [],
      defaultValue: "pro",
    });
    posts.WebhookEndpointInput({
      source: "hook",
      eventTypes: [],
      defaultValue: { url: "", secret: "", eventTypes: [] },
    });
  });

  it("reject a default that is not the value at source", () => {
    // @ts-expect-error a rating default is a number
    posts.RatingInput({ source: "rating", defaultValue: "three" });
    posts.SubscriptionPlanPicker({
      source: "plan",
      plans: [],
      // @ts-expect-error a plan id is a string
      defaultValue: 1,
    });
  });

  it("reject a source that is no path of the record", () => {
    // @ts-expect-error `prise` is no path of a post
    posts.CurrencyInput({ source: "prise" });
    // @ts-expect-error `raiting` is no path of a post
    posts.RatingInput({ source: "raiting" });
    // @ts-expect-error `lenght` is no path of a post
    posts.DurationInput({ source: "lenght" });
    // @ts-expect-error `plna` is no path of a post
    posts.SubscriptionPlanPicker({ source: "plna", plans: [] });
    // @ts-expect-error `hok` is no path of a post
    posts.WebhookEndpointInput({ source: "hok", eventTypes: [] });
  });
});
