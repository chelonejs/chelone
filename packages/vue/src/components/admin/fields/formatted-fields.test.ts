/**
 * V2-c Task 2 — the formatted / niche display FIELDS (currency, duration, cron,
 * api-key, webhook-endpoint, usage-meter, subscription-plan) plus the three
 * COMPOSITIONAL fields (function, record, wrapper). Each reads a value from the
 * ambient `RecordContext` via `useFieldValue` and renders it; the compositional
 * fields translate the React twins' `render` / `children` props to Vue scoped
 * slots. Every case mounts the REAL field SFC under a harness that provides the
 * Chelone context + a static record, and asserts the observable DOM.
 */

import { createI18n, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  type Component,
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
  type VNodeChild,
} from "vue";
import { provideCheloneContext } from "../../../context";
import { provideRecordContext } from "../../../record/record-context";
import ApiKeyField from "./api-key-field.vue";
import CronField from "./cron-field.vue";
import CurrencyField from "./currency-field.vue";
import DurationField from "./duration-field.vue";
import FunctionField from "./function-field.vue";
import RecordField from "./record-field.vue";
import SubscriptionPlanField from "./subscription-plan-field.vue";
import UsageMeterField from "./usage-meter-field.vue";
import WebhookEndpointField from "./webhook-endpoint-field.vue";
import WrapperField from "./wrapper-field.vue";

function makeContext() {
  return {
    dataProvider: fakeDataProvider({}),
    queryClient: new QueryClient(),
  };
}

/** Mount `field` (with `props` + optional `slots`) under a static `record`. */
function mountField(
  // `object` is the widest honest shape: `<FunctionField>` is generic with a
  // required scoped slot, and vue-tsc types that as a function no `h` overload
  // takes, so no Vue component type accepts every field this harness mounts.
  field: object,
  props: Record<string, unknown>,
  record:
    | Record<string, unknown>
    | undefined
    | Ref<Record<string, unknown> | undefined>,
  // `never` scope: the harness hands every slot to `h` and never calls one, so
  // each takes whatever scope the field passes it.
  slots?: Record<string, (scope: never) => VNodeChild>,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext(makeContext());
      provideRecordContext(record);
      // type-escape: every field here is a component; see the `object` note.
      return () => h(field as Component, props, slots);
    },
  });
  return mount(Harness);
}

describe("CurrencyField", () => {
  it("formats a plain number with the currency prop", () => {
    const w = mountField(
      CurrencyField,
      { source: "price", currency: "USD", displayLocale: "en-US" },
      { price: 1234.5 },
    );
    expect(w.get('[data-slot="currency-field"]').text()).toBe("$1,234.50");
  });

  it("reads the currency from a { amount, currency } value", () => {
    const w = mountField(
      CurrencyField,
      { source: "cost", displayLocale: "en-US" },
      { cost: { amount: 42, currency: "EUR" } },
    );
    expect(w.get('[data-slot="currency-field"]').text()).toContain("42");
    expect(w.get('[data-slot="currency-field"]').text()).toContain("€");
  });

  it("divides by 100 under storeAsMinorUnits", () => {
    const w = mountField(
      CurrencyField,
      {
        source: "cents",
        currency: "USD",
        displayLocale: "en-US",
        storeAsMinorUnits: true,
      },
      { cents: 1999 },
    );
    expect(w.get('[data-slot="currency-field"]').text()).toBe("$19.99");
  });

  it("CurrencyField formats with the app locale when displayLocale is absent", async () => {
    const i18n = createI18n({
      locale: "en-US",
      messages: { "en-US": {}, "de-DE": {} },
    });
    const Harness = defineComponent({
      setup() {
        provideCheloneContext({ ...makeContext(), i18n });
        provideRecordContext({ price: 1234.5 });
        return () => h(CurrencyField, { source: "price", currency: "EUR" });
      },
    });
    const w = mount(Harness);
    expect(w.get('[data-slot="currency-field"]').text()).toBe("€1,234.50");

    i18n.setLocale("de-DE");
    await nextTick();

    expect(w.get('[data-slot="currency-field"]').text()).toBe(
      "1.234,50\u00a0€",
    );
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      CurrencyField,
      { source: "price", currency: "USD", empty: "—" },
      { price: null },
    );
    expect(w.get('[data-slot="currency-field"]').text()).toBe("—");
  });

  it("renders nothing for a nullish value without empty", () => {
    const w = mountField(
      CurrencyField,
      { source: "price", currency: "USD" },
      { price: undefined },
    );
    expect(w.find('[data-slot="currency-field"]').exists()).toBe(false);
  });
});

describe("DurationField", () => {
  it("renders a compact duration by default", () => {
    const w = mountField(DurationField, { source: "d" }, { d: "PT2H30M" });
    expect(w.get('[data-slot="duration-field"]').text()).toBe("2h 30m");
  });

  it("renders a relative duration under displayFormat=relative", () => {
    const w = mountField(
      DurationField,
      { source: "d", displayFormat: "relative" },
      { d: "PT2H30M" },
    );
    expect(w.get('[data-slot="duration-field"]').text()).toBe(
      "2 hours 30 minutes",
    );
  });

  it("renders nothing for an unparseable value", () => {
    const w = mountField(DurationField, { source: "d" }, { d: "nonsense" });
    expect(w.find('[data-slot="duration-field"]').exists()).toBe(false);
  });

  it("renders the empty placeholder for an empty value", () => {
    const w = mountField(
      DurationField,
      { source: "d", empty: "n/a" },
      { d: "" },
    );
    expect(w.get('[data-slot="duration-field"]').text()).toBe("n/a");
  });
});

describe("CronField", () => {
  it("renders a human-readable phrase for a valid expression", () => {
    const w = mountField(CronField, { source: "s" }, { s: "0 9 * * 1" });
    const el = w.get('[data-slot="cron-field"]');
    expect(el.text()).toContain("09:00");
    expect(el.text()).toContain("Monday");
  });

  it("renders the raw expression under showExpression", () => {
    const w = mountField(
      CronField,
      { source: "s", showExpression: true },
      { s: "0 9 * * 1" },
    );
    expect(w.get('[data-slot="cron-field"]').text()).toContain("0 9 * * 1");
  });

  it("falls back to the raw mono string for an invalid expression", () => {
    const w = mountField(CronField, { source: "s" }, { s: "not a cron" });
    const el = w.get('[data-slot="cron-field"]');
    expect(el.text()).toBe("not a cron");
    expect(el.classes()).toContain("font-mono");
  });

  it("renders the empty placeholder for an empty value", () => {
    const w = mountField(CronField, { source: "s", empty: "unset" }, { s: "" });
    expect(w.get('[data-slot="cron-field"]').text()).toBe("unset");
  });
});

describe("ApiKeyField", () => {
  it("masks all but the last 4 chars by default", () => {
    const w = mountField(
      ApiKeyField,
      { source: "key" },
      { key: "sk_live_abcd1234" },
    );
    const el = w.get("[data-api-key]");
    expect(el.text()).toContain("1234");
    expect(el.text()).toContain("•");
    expect(el.text()).not.toContain("abcd");
  });

  it("reveals the full key on clicking the reveal button", async () => {
    const w = mountField(
      ApiKeyField,
      { source: "key" },
      { key: "sk_live_abcd1234" },
    );
    await w.get("[data-api-key-reveal]").trigger("click");
    expect(w.get("[data-api-key]").text()).toBe("sk_live_abcd1234");
  });

  it("masks the whole key under maskedFormat=full", () => {
    const w = mountField(
      ApiKeyField,
      { source: "key", maskedFormat: "full" },
      { key: "abcd" },
    );
    expect(w.get("[data-api-key]").text()).toBe("••••");
  });

  it("renders scope badges from scopesSource", () => {
    const w = mountField(
      ApiKeyField,
      { source: "key", scopesSource: "scopes" },
      { key: "abcd1234", scopes: ["read", "write"] },
    );
    const badges = w.findAll("[data-scope-badge]");
    expect(badges).toHaveLength(2);
    expect(badges[0]!.text()).toBe("read");
  });

  it("renders nothing for a nullish value", () => {
    const w = mountField(ApiKeyField, { source: "key" }, { key: null });
    expect(w.find('[data-slot="api-key-field"]').exists()).toBe(false);
  });
});

describe("WebhookEndpointField", () => {
  it("renders the url and an OK status badge", () => {
    const w = mountField(
      WebhookEndpointField,
      { source: "ep" },
      {
        ep: {
          url: "https://hooks.example.com/x",
          secret: "whsec_supersecret",
          eventTypes: ["a"],
          lastDelivery: { status: "ok", at: "2020-01-01" },
        },
      },
    );
    const el = w.get('[data-slot="webhook-endpoint-field"]');
    expect(el.text()).toContain("https://hooks.example.com/x");
    expect(w.get("[data-webhook-status]").text()).toBe("OK");
    expect(w.get("[data-webhook-status]").attributes("data-status")).toBe("ok");
  });

  it("never renders the signing secret", () => {
    const w = mountField(
      WebhookEndpointField,
      { source: "ep" },
      {
        ep: {
          url: "https://x",
          secret: "whsec_supersecret",
          eventTypes: [],
        },
      },
    );
    expect(w.text()).not.toContain("whsec_supersecret");
  });

  it("defaults the status to PENDING with no lastDelivery", () => {
    const w = mountField(
      WebhookEndpointField,
      { source: "ep" },
      { ep: { url: "https://x", secret: "s", eventTypes: [] } },
    );
    expect(w.get("[data-webhook-status]").attributes("data-status")).toBe(
      "pending",
    );
  });

  it("renders nothing for a non-object value", () => {
    const w = mountField(WebhookEndpointField, { source: "ep" }, { ep: "x" });
    expect(w.find('[data-slot="webhook-endpoint-field"]').exists()).toBe(false);
  });
});

describe("UsageMeterField", () => {
  it("renders the bare value with a unit when no limitSource", () => {
    const w = mountField(
      UsageMeterField,
      { source: "used", unit: "GB" },
      { used: 50 },
    );
    const el = w.get('[data-slot="usage-meter-field"]');
    expect(el.text()).toBe("50 GB");
    expect(el.attributes("data-usage-meter")).toBeUndefined();
  });

  it("renders a progress meter with used/limit and ok state", () => {
    const w = mountField(
      UsageMeterField,
      { source: "used", limitSource: "limit", unit: "GB" },
      { used: 50, limit: 100 },
    );
    const el = w.get("[data-usage-meter]");
    expect(el.attributes("data-state")).toBe("ok");
    expect(el.text()).toContain("50 / 100 GB");
  });

  it("shifts to warning state past the warning threshold", () => {
    const w = mountField(
      UsageMeterField,
      { source: "used", limitSource: "limit" },
      { used: 85, limit: 100 },
    );
    expect(w.get("[data-usage-meter]").attributes("data-state")).toBe(
      "warning",
    );
  });

  it("shifts to critical state at/over the limit", () => {
    const w = mountField(
      UsageMeterField,
      { source: "used", limitSource: "limit" },
      { used: 100, limit: 100 },
    );
    expect(w.get("[data-usage-meter]").attributes("data-state")).toBe(
      "critical",
    );
  });

  it("renders nothing for a nullish used value", () => {
    const w = mountField(
      UsageMeterField,
      { source: "used", limitSource: "limit" },
      { used: null, limit: 100 },
    );
    expect(w.find('[data-slot="usage-meter-field"]').exists()).toBe(false);
  });
});

describe("SubscriptionPlanField", () => {
  const PLANS = [
    {
      id: "free",
      name: "Free",
      price: 0,
      currency: "USD",
      interval: "month" as const,
    },
    {
      id: "pro",
      name: "Pro",
      price: 29,
      currency: "USD",
      interval: "month" as const,
    },
  ];

  it("renders the matched plan name and price/interval", () => {
    const w = mountField(
      SubscriptionPlanField,
      { source: "planId", plans: PLANS },
      { planId: "pro" },
    );
    const badge = w.get('[data-slot="badge"]');
    expect(badge.text()).toContain("Pro");
    expect(badge.text()).toContain("/month");
    expect(badge.text()).toContain("29");
  });

  it("renders the empty placeholder for an unmatched id", () => {
    const w = mountField(
      SubscriptionPlanField,
      { source: "planId", plans: PLANS, empty: "no plan" },
      { planId: "enterprise" },
    );
    expect(w.get('[data-slot="subscription-plan-field"]').text()).toBe(
      "no plan",
    );
  });

  it("renders nothing for an unmatched id without empty", () => {
    const w = mountField(
      SubscriptionPlanField,
      { source: "planId", plans: PLANS },
      { planId: "enterprise" },
    );
    expect(w.find('[data-slot="badge"]').exists()).toBe(false);
    expect(w.find('[data-slot="subscription-plan-field"]').exists()).toBe(
      false,
    );
  });
});

describe("FunctionField (scoped slot ↔ React render prop)", () => {
  it("renders derived content from the record via the default scoped slot", () => {
    const w = mountField(
      FunctionField,
      { source: "last" },
      { first: "Ada", last: "Lovelace" },
      {
        default: (scope: { record: Record<string, unknown> }) =>
          `${scope.record.first} ${scope.record.last}`,
      },
    );
    const el = w.get('[data-slot="function-field"]');
    expect(el.text()).toBe("Ada Lovelace");
  });

  it("passes the source to the slot", () => {
    const w = mountField(
      FunctionField,
      { source: "last" },
      { last: "Lovelace" },
      { default: (scope: { source?: string }) => scope.source ?? "" },
    );
    expect(w.get('[data-slot="function-field"]').text()).toBe("last");
  });

  it("renders nothing when there is no record", () => {
    const w = mountField(FunctionField, {}, undefined, {
      default: () => "x",
    });
    expect(w.find('[data-slot="function-field"]').exists()).toBe(false);
  });
});

describe("ambient record that lands after mount", () => {
  it("FunctionField renders once the ambient record resolves", async () => {
    const ambient = ref<Record<string, unknown> | undefined>(undefined);
    const w = mountField(FunctionField, {}, ambient, {
      default: (scope: { record: Record<string, unknown> }) =>
        `fn:${scope.record.name}`,
    });
    expect(w.find('[data-slot="function-field"]').exists()).toBe(false);
    ambient.value = { name: "Ada" };
    await nextTick();
    expect(w.get('[data-slot="function-field"]').text()).toBe("fn:Ada");
  });

  it("RecordField renders once the ambient record resolves", async () => {
    const ambient = ref<Record<string, unknown> | undefined>(undefined);
    const w = mountField(RecordField, {}, ambient, {
      default: (scope: { record: Record<string, unknown> }) =>
        `rec:${scope.record.name}`,
    });
    expect(w.text()).not.toContain("rec:");
    ambient.value = { name: "Ada" };
    await nextTick();
    expect(w.get('[data-slot="record-field"]').text()).toContain("rec:Ada");
  });
});

describe("RecordField (scoped slot / field / TextField fallback)", () => {
  it("renders a humanized label plus the default TextField value", () => {
    const w = mountField(
      RecordField,
      { source: "first_name" },
      { first_name: "Ada" },
    );
    const root = w.get('[data-slot="record-field"]');
    expect(root.text()).toContain("First Name");
    expect(root.get('[data-slot="text-field"]').text()).toBe("Ada");
  });

  it("renders the default scoped slot when provided", () => {
    const w = mountField(
      RecordField,
      { label: "Size" },
      { width: 4, height: 3 },
      {
        default: (scope: { record: Record<string, unknown> }) =>
          `${scope.record.width}x${scope.record.height}`,
      },
    );
    const root = w.get('[data-slot="record-field"]');
    expect(root.text()).toContain("Size");
    expect(root.text()).toContain("4x3");
  });

  it("lays out inline under variant=inline", () => {
    const w = mountField(
      RecordField,
      { source: "status", variant: "inline" },
      { status: "active" },
    );
    expect(w.get('[data-slot="record-field"]').classes()).toContain("flex-row");
  });

  it("hides the label under label=false", () => {
    const w = mountField(
      RecordField,
      { source: "status", label: false },
      { status: "active" },
    );
    expect(w.get('[data-slot="record-field"]').text()).toBe("active");
  });

  it("renders nothing with no source, label, slot, or field", () => {
    const w = mountField(RecordField, {}, { x: 1 });
    expect(w.find('[data-slot="record-field"]').exists()).toBe(false);
  });
});

describe("WrapperField", () => {
  it("renders its children slot verbatim (a passthrough)", () => {
    const w = mountField(
      WrapperField,
      { source: "last_name" },
      { x: 1 },
      {
        default: () => h("span", { class: "wrapped" }, "hello"),
      },
    );
    expect(w.get(".wrapped").text()).toBe("hello");
  });
});
