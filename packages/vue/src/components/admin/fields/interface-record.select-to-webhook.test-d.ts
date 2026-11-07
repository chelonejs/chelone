/**
 * Type tests for the fields that read one value off the record: an app's
 * `interface Post` is a legal record for them, not a type error. A `source` is
 * still checked against the interface.
 */

import { assertType, describe, it } from "vitest";
import type { SelectFieldProps } from "./select-field.vue";
import type { SubscriptionPlanFieldProps } from "./subscription-plan-field.vue";
import type { TextArrayFieldProps } from "./text-array-field.vue";
import type { TextFieldProps } from "./text-field.vue";
import type { UrlFieldProps } from "./url-field.vue";
import type { WebhookEndpointFieldProps } from "./webhook-endpoint-field.vue";

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

const post: Post = {
  id: 1,
  title: "x",
  status: "draft",
  website: "https://example.com",
  genres: ["a"],
  planId: "free",
  endpoint: { url: "https://example.com/hook", secret: "s", eventTypes: [] },
};

describe("fields take an interface as their record", () => {
  it("each field props takes the interface as its record", () => {
    assertType<TextFieldProps<Post>>({ source: "title", record: post });
    assertType<SelectFieldProps<(typeof CHOICES)[number], Post>>({
      source: "status",
      record: post,
      choices: CHOICES,
    });
    assertType<SubscriptionPlanFieldProps<Post>>({
      source: "planId",
      record: post,
      plans: PLANS,
    });
    assertType<TextArrayFieldProps<Post>>({ source: "genres", record: post });
    assertType<UrlFieldProps<Post>>({ source: "website", record: post });
    assertType<WebhookEndpointFieldProps<Post>>({
      source: "endpoint",
      record: post,
    });
  });

  it("a field props rejects a source its interface does not have", () => {
    assertType<TextFieldProps<Post>>({
      // @ts-expect-error Post has no `titel`
      source: "titel",
      record: post,
    });
    assertType<SelectFieldProps<(typeof CHOICES)[number], Post>>({
      // @ts-expect-error Post has no `titel`
      source: "titel",
      record: post,
      choices: CHOICES,
    });
    assertType<SubscriptionPlanFieldProps<Post>>({
      // @ts-expect-error Post has no `titel`
      source: "titel",
      record: post,
      plans: PLANS,
    });
    assertType<UrlFieldProps<Post>>({
      // @ts-expect-error Post has no `site`
      source: "site",
      record: post,
    });
    assertType<WebhookEndpointFieldProps<Post>>({
      // @ts-expect-error Post has no `hook`
      source: "hook",
      record: post,
    });
  });

  it("field props with no record still take any source", () => {
    assertType<TextFieldProps>({ source: "anything_at_all" });
    assertType<UrlFieldProps>({ source: "anything_at_all" });
  });
});
