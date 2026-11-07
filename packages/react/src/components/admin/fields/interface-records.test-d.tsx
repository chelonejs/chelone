/**
 * Type tests for every display field in this folder, used with a record typed
 * by an `interface`. An interface carries no index signature, so a `LooseRecord`
 * bound refuses one: each line here is the pin a record-bound slice earned, and
 * a field that drops its record generic loses it.
 *
 * The second test pins the other half: with no type argument a field's `source`
 * stays any string, the fallback for an app that registers no resources.
 */

import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { ApiKeyField } from "./api-key-field";
import { ArrayField } from "./array-field";
import { BadgeField } from "./badge-field";
import { BooleanField } from "./boolean-field";
import { ChipField } from "./chip-field";
import { ColorField } from "./color-field";
import { CronField } from "./cron-field";
import { CurrencyField } from "./currency-field";
import { DateField } from "./date-field";
import { DiffViewer } from "./diff-viewer";
import { DurationField } from "./duration-field";
import { EmailField } from "./email-field";
import { FileField } from "./file-field";
import { FunctionField } from "./function-field";
import { ImageField } from "./image-field";
import { JsonField } from "./json-field";
import { NumberField } from "./number-field";
import { PhoneField } from "./phone-field";
import { RatingField } from "./rating-field";
import { RecordField } from "./record-field";
import { ReferenceArrayField } from "./reference-array-field";
import { ReferenceField } from "./reference-field";
import { ReferenceManyCount } from "./reference-many-count";
import { ReferenceManyField } from "./reference-many-field";
import { ReferenceOneField } from "./reference-one-field";
import { SelectField } from "./select-field";
import {
  type SubscriptionPlan,
  SubscriptionPlanField,
} from "./subscription-plan-field";
import { TextArrayField } from "./text-array-field";
import { TextField } from "./text-field";
import { UrlField } from "./url-field";
import { UsageMeterField } from "./usage-meter-field";
import { WebhookEndpointField } from "./webhook-endpoint-field";
import { WrapperField } from "./wrapper-field";

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

declare const post: Post;

/** A record from an app that registered no schema: `LooseRecord` itself. */
declare const loose: LooseRecord;

const plans: readonly SubscriptionPlan[] = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
];

describe("interface records", () => {
  it("every field takes an interface", () => {
    expectTypeOf(
      <ApiKeyField<Post>
        source="api_key"
        scopesSource="scopes"
        lastUsedSource="last_used_at"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <ArrayField<Post> source="tags" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <BadgeField<Post> source="status" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <BooleanField<Post> source="published" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <ChipField<Post> source="status" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <ColorField<Post> source="color" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <CronField<Post> source="schedule" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <CurrencyField<Post> source="price" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <DateField<Post> source="created_at" record={post} />,
    ).not.toBeAny();
    expectTypeOf(<DiffViewer<Post> before={post} after={post} />).not.toBeAny();
    expectTypeOf(
      <DurationField<Post> source="runtime" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <EmailField<Post> source="email" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <FileField<Post> source="attachment" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <FunctionField<Post> record={post} render={(r) => r.title} />,
    ).not.toBeAny();
    expectTypeOf(
      <ImageField<Post> source="cover" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <JsonField<Post> source="metadata" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <NumberField<Post> source="views" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <PhoneField<Post> source="phone" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <RatingField<Post> source="rating" countSource="reviews" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <RecordField<Post> source="title" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceArrayField<Post>
        source="tag_ids"
        reference="tags"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceField<Post>
        source="author_id"
        reference="authors"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceManyCount<Post>
        reference="comments"
        target="post_id"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceManyField<Post>
        reference="comments"
        target="post_id"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceOneField<Post>
        reference="bio"
        target="post_id"
        record={post}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <SelectField<Post> source="status" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <SubscriptionPlanField<Post> source="plan" plans={plans} record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <TextArrayField<Post> source="genres" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <TextField<Post> source="title" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <UrlField<Post> source="website" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <UsageMeterField<Post> source="used" limitSource="limit" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <WebhookEndpointField<Post> source="endpoint" record={post} />,
    ).not.toBeAny();
    expectTypeOf(
      <WrapperField<Post> source="title" record={post}>
        <TextField<Post> source="title" record={post} />
      </WrapperField>,
    ).not.toBeAny();
  });

  it("a field with no type argument takes any source", () => {
    expectTypeOf(
      <ApiKeyField
        source="api_key"
        scopesSource="scopes"
        lastUsedSource="last_used_at"
      />,
    ).not.toBeAny();
    expectTypeOf(<ArrayField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<BadgeField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <BooleanField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(<ChipField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<ColorField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<CronField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <CurrencyField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(<DateField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <DiffViewer
        before={loose}
        after={loose}
        sources={["whatever.the.app.stores"]}
      />,
    ).not.toBeAny();
    expectTypeOf(
      <DurationField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(<EmailField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<FileField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <FunctionField render={(r) => String(r.whatever_the_app_stores)} />,
    ).not.toBeAny();
    expectTypeOf(<ImageField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<JsonField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <NumberField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(<PhoneField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <RatingField
        source="whatever.the.app.stores"
        countSource="whatever_the_app_stores"
      />,
    ).not.toBeAny();
    expectTypeOf(
      <RecordField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceArrayField source="whatever.the.app.stores" reference="tags" />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceField source="whatever.the.app.stores" reference="authors" />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceManyCount reference="comments" target="post_id" />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceManyField reference="comments" target="post_id" />,
    ).not.toBeAny();
    expectTypeOf(
      <ReferenceOneField reference="bio" target="post_id" />,
    ).not.toBeAny();
    expectTypeOf(
      <SelectField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(
      <SubscriptionPlanField source="whatever.the.app.stores" plans={plans} />,
    ).not.toBeAny();
    expectTypeOf(
      <TextArrayField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(<TextField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(<UrlField source="whatever.the.app.stores" />).not.toBeAny();
    expectTypeOf(
      <UsageMeterField
        source="whatever.the.app.stores"
        limitSource="whatever_the_app_stores"
      />,
    ).not.toBeAny();
    expectTypeOf(
      <WebhookEndpointField source="whatever.the.app.stores" />,
    ).not.toBeAny();
    expectTypeOf(
      <WrapperField source="whatever.the.app.stores">
        <TextField source="whatever.the.app.stores" />
      </WrapperField>,
    ).not.toBeAny();
  });

  it("an interface record narrows source to its own keys", () => {
    // @ts-expect-error "whatever" is not a key of Post
    <TextField<Post> source="whatever" record={post} />;
  });
});
