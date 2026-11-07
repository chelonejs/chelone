/**
 * Type tests for every display field in this folder, used with a record typed
 * by an `interface`. An interface carries no index signature, so a `LooseRecord`
 * bound refuses one: each line here is the pin a record-bound slice earned, and
 * a field that drops its record generic loses it.
 *
 * The second test pins the other half: with no type argument a field's `source`
 * stays any string, the fallback for an app that registers no resources.
 */

import type { ChoiceRecord, LooseRecord } from "@chelone/core";
import { describe, it } from "vitest";
import type { ApiKeyFieldProps } from "./api-key-field.vue";
import type { ArrayFieldProps } from "./array-field.vue";
import type { BadgeFieldProps } from "./badge-field.vue";
import type { BooleanFieldProps } from "./boolean-field.vue";
import type { ChipFieldProps } from "./chip-field.vue";
import type { ColorFieldProps } from "./color-field.vue";
import type { CronFieldProps } from "./cron-field.vue";
import type { CurrencyFieldProps } from "./currency-field.vue";
import type { DateFieldProps } from "./date-field.vue";
import type { DiffViewerProps } from "./diff-viewer.vue";
import type { DurationFieldProps } from "./duration-field.vue";
import type { EmailFieldProps } from "./email-field.vue";
import type { FileFieldProps } from "./file-field.vue";
import type { FunctionFieldProps } from "./function-field.vue";
import type { ImageFieldProps } from "./image-field.vue";
import type { JsonFieldProps } from "./json-field.vue";
import type { NumberFieldProps } from "./number-field.vue";
import type { PhoneFieldProps } from "./phone-field.vue";
import type { RatingFieldProps } from "./rating-field.vue";
import type { RecordFieldProps } from "./record-field.vue";
import type { ReferenceArrayFieldProps } from "./reference-array-field.vue";
import type { ReferenceFieldProps } from "./reference-field.vue";
import type { ReferenceManyCountProps } from "./reference-many-count.vue";
import type { ReferenceManyFieldProps } from "./reference-many-field.vue";
import type { ReferenceOneFieldProps } from "./reference-one-field.vue";
import type { SelectFieldProps } from "./select-field.vue";
import type {
  SubscriptionPlan,
  SubscriptionPlanFieldProps,
} from "./subscription-plan-field.vue";
import type { TextArrayFieldProps } from "./text-array-field.vue";
import type { TextFieldProps } from "./text-field.vue";
import type { UrlFieldProps } from "./url-field.vue";
import type { UsageMeterFieldProps } from "./usage-meter-field.vue";
import type { WebhookEndpointFieldProps } from "./webhook-endpoint-field.vue";
import type { WrapperFieldProps } from "./wrapper-field.vue";

interface Post {
  id: number;
  title: string;
  status: string;
  views: number;
  published: boolean;
  color: string;
  schedule: string;
  price: number;
  created_at: string;
  runtime: number;
  email: string;
  phone: string;
  website: string;
  cover: string;
  attachment: string;
  api_key: string;
  scopes: string[];
  last_used_at: string;
  used: number;
  limit: number;
  rating: number;
  reviews: number;
  plan: string;
  genres: string[];
  metadata: { id: number; note: string };
  tags: { id: number; name: string }[];
  tag_ids: number[];
  author_id: number;
  endpoint: {
    url: string;
    secret: string;
    eventTypes: readonly string[];
  };
}

const post: Post = {
  id: 1,
  title: "Hello",
  status: "draft",
  views: 3,
  published: false,
  color: "#ff0000",
  schedule: "0 0 * * *",
  price: 10,
  created_at: "2026-01-01",
  runtime: 90,
  email: "hello@example.com",
  phone: "+14155552671",
  website: "https://example.com",
  cover: "https://example.com/cover.png",
  attachment: "https://example.com/file.pdf",
  api_key: "key",
  scopes: ["read"],
  last_used_at: "2026-01-01",
  used: 1,
  limit: 10,
  rating: 4,
  reviews: 2,
  plan: "free",
  genres: ["Fiction"],
  metadata: { id: 1, note: "note" },
  tags: [{ id: 1, name: "tag" }],
  tag_ids: [1],
  author_id: 2,
  endpoint: { url: "https://example.com", secret: "s", eventTypes: [] },
};

/** A record from an app that registered no schema: `LooseRecord` itself. */
const loose: LooseRecord = { id: 1 };

const plans: readonly SubscriptionPlan[] = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
];

describe("interface records", () => {
  it("every field takes an interface", () => {
    const props = [
      {
        source: "api_key",
        scopesSource: "scopes",
        lastUsedSource: "last_used_at",
        record: post,
      } satisfies ApiKeyFieldProps<Post>,
      { source: "tags", record: post } satisfies ArrayFieldProps<Post>,
      { source: "status", record: post } satisfies BadgeFieldProps<Post>,
      { source: "published", record: post } satisfies BooleanFieldProps<Post>,
      { source: "status", record: post } satisfies ChipFieldProps<Post>,
      { source: "color", record: post } satisfies ColorFieldProps<Post>,
      { source: "schedule", record: post } satisfies CronFieldProps<Post>,
      { source: "price", record: post } satisfies CurrencyFieldProps<Post>,
      { source: "created_at", record: post } satisfies DateFieldProps<Post>,
      { before: post, after: post } satisfies DiffViewerProps<Post>,
      { source: "runtime", record: post } satisfies DurationFieldProps<Post>,
      { source: "email", record: post } satisfies EmailFieldProps<Post>,
      { source: "attachment", record: post } satisfies FileFieldProps<Post>,
      { record: post } satisfies FunctionFieldProps<Post>,
      { source: "cover", record: post } satisfies ImageFieldProps<Post>,
      { source: "metadata", record: post } satisfies JsonFieldProps<Post>,
      { source: "views", record: post } satisfies NumberFieldProps<Post>,
      { source: "phone", record: post } satisfies PhoneFieldProps<Post>,
      {
        source: "rating",
        countSource: "reviews",
        record: post,
      } satisfies RatingFieldProps<Post>,
      { source: "title", record: post } satisfies RecordFieldProps<Post>,
      {
        source: "tag_ids",
        reference: "tags",
        record: post,
      } satisfies ReferenceArrayFieldProps<Post>,
      {
        source: "author_id",
        reference: "authors",
        record: post,
      } satisfies ReferenceFieldProps<Post>,
      {
        reference: "comments",
        target: "post_id",
        record: post,
      } satisfies ReferenceManyCountProps<Post>,
      {
        reference: "comments",
        target: "post_id",
        record: post,
      } satisfies ReferenceManyFieldProps<Post>,
      {
        reference: "bio",
        target: "post_id",
        record: post,
      } satisfies ReferenceOneFieldProps<Post>,
      { source: "status", record: post } satisfies SelectFieldProps<
        ChoiceRecord,
        Post
      >,
      {
        source: "plan",
        plans,
        record: post,
      } satisfies SubscriptionPlanFieldProps<Post>,
      { source: "genres", record: post } satisfies TextArrayFieldProps<Post>,
      { source: "title", record: post } satisfies TextFieldProps<Post>,
      { source: "website", record: post } satisfies UrlFieldProps<Post>,
      {
        source: "used",
        limitSource: "limit",
        record: post,
      } satisfies UsageMeterFieldProps<Post>,
      {
        source: "endpoint",
        record: post,
      } satisfies WebhookEndpointFieldProps<Post>,
      { source: "title", record: post } satisfies WrapperFieldProps<Post>,
    ];

    props.length;
  });

  it("a field with no type argument takes any source", () => {
    const props = [
      {
        source: "api_key",
        scopesSource: "scopes",
        lastUsedSource: "last_used_at",
      } satisfies ApiKeyFieldProps,
      { source: "whatever.the.app.stores" } satisfies ArrayFieldProps,
      { source: "whatever.the.app.stores" } satisfies BadgeFieldProps,
      { source: "whatever.the.app.stores" } satisfies BooleanFieldProps,
      { source: "whatever.the.app.stores" } satisfies ChipFieldProps,
      { source: "whatever.the.app.stores" } satisfies ColorFieldProps,
      { source: "whatever.the.app.stores" } satisfies CronFieldProps,
      { source: "whatever.the.app.stores" } satisfies CurrencyFieldProps,
      { source: "whatever.the.app.stores" } satisfies DateFieldProps,
      {
        before: loose,
        after: loose,
        sources: ["whatever.the.app.stores"],
      } satisfies DiffViewerProps,
      { source: "whatever.the.app.stores" } satisfies DurationFieldProps,
      { source: "whatever.the.app.stores" } satisfies EmailFieldProps,
      { source: "whatever.the.app.stores" } satisfies FileFieldProps,
      { source: "whatever.the.app.stores" } satisfies FunctionFieldProps,
      { source: "whatever.the.app.stores" } satisfies ImageFieldProps,
      { source: "whatever.the.app.stores" } satisfies JsonFieldProps,
      { source: "whatever.the.app.stores" } satisfies NumberFieldProps,
      { source: "whatever.the.app.stores" } satisfies PhoneFieldProps,
      {
        source: "whatever.the.app.stores",
        countSource: "whatever_the_app_stores",
      } satisfies RatingFieldProps,
      { source: "whatever.the.app.stores" } satisfies RecordFieldProps,
      {
        source: "whatever.the.app.stores",
        reference: "tags",
      } satisfies ReferenceArrayFieldProps,
      {
        source: "whatever.the.app.stores",
        reference: "authors",
      } satisfies ReferenceFieldProps,
      {
        reference: "comments",
        target: "post_id",
      } satisfies ReferenceManyCountProps,
      {
        reference: "comments",
        target: "post_id",
      } satisfies ReferenceManyFieldProps,
      { reference: "bio", target: "post_id" } satisfies ReferenceOneFieldProps,
      { source: "whatever.the.app.stores" } satisfies SelectFieldProps,
      {
        source: "whatever.the.app.stores",
        plans,
      } satisfies SubscriptionPlanFieldProps,
      { source: "whatever.the.app.stores" } satisfies TextArrayFieldProps,
      { source: "whatever.the.app.stores" } satisfies TextFieldProps,
      { source: "whatever.the.app.stores" } satisfies UrlFieldProps,
      {
        source: "whatever.the.app.stores",
        limitSource: "whatever_the_app_stores",
      } satisfies UsageMeterFieldProps,
      { source: "whatever.the.app.stores" } satisfies WebhookEndpointFieldProps,
      { source: "whatever.the.app.stores" } satisfies WrapperFieldProps,
    ];

    props.length;
  });

  it("an interface record narrows source to its own keys", () => {
    // @ts-expect-error "whatever" is not a key of Post
    const wrong: TextFieldProps<Post> = { source: "whatever", record: post };
    wrong.source;
  });
});
