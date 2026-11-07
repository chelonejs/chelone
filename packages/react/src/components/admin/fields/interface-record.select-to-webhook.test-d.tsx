/**
 * Type tests for the fields that read one value off the record: an app's
 * `interface Post` is a legal record for them, not a type error. A `source` is
 * still checked against the interface.
 */

import { describe, expectTypeOf, it } from "vitest";
import { SelectField } from "./select-field";
import { SubscriptionPlanField } from "./subscription-plan-field";
import { TextArrayField } from "./text-array-field";
import { TextField } from "./text-field";
import { UrlField } from "./url-field";
import { WebhookEndpointField } from "./webhook-endpoint-field";

interface Post {
  id: number;
  title: string;
  status: string;
  website: string;
  genres: string[];
  planId: string;
  endpoint: {
    url: string;
    secret: string;
    eventTypes: string[];
    lastDelivery?: { status: "ok" | "failed" | "pending"; at: string };
  };
}

const PLANS = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
] as const;

const CHOICES = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
] as const;

declare const post: Post;

describe("fields take an interface as their record", () => {
  it("each field infers the interface from its record", () => {
    expectTypeOf(<TextField source="title" record={post} />).not.toBeAny();
    expectTypeOf(
      <SelectField source="status" record={post} choices={CHOICES} />,
    ).not.toBeAny();
    expectTypeOf(
      <SubscriptionPlanField source="planId" record={post} plans={PLANS} />,
    ).not.toBeAny();
    expectTypeOf(
      <TextArrayField source="genres" record={post} />,
    ).not.toBeAny();
    expectTypeOf(<UrlField source="website" record={post} />).not.toBeAny();
    expectTypeOf(
      <WebhookEndpointField source="endpoint" record={post} />,
    ).not.toBeAny();
  });

  it("a field rejects a source its interface does not have", () => {
    // @ts-expect-error Post has no `titel`
    <TextField source="titel" record={post} />;
    // @ts-expect-error Post has no `titel`
    <SelectField source="titel" record={post} choices={CHOICES} />;
    // @ts-expect-error Post has no `titel`
    <SubscriptionPlanField source="titel" record={post} plans={PLANS} />;
    // @ts-expect-error Post has no `genres` under a non-array
    <TextArrayField source="genres[0].label" record={post} />;
    // @ts-expect-error Post has no `site`
    <UrlField source="site" record={post} />;
    // @ts-expect-error Post has no `hook`
    <WebhookEndpointField source="hook" record={post} />;
  });

  it("a field with no record still takes any source", () => {
    expectTypeOf(<TextField source="anything_at_all" />).not.toBeAny();
    expectTypeOf(<UrlField source="anything_at_all" />).not.toBeAny();
  });
});
