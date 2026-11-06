/**
 * V2-c FIELDS PROBE — end-to-end verification of the V2-c display-field wave,
 * driven ENTIRELY through the package barrel (`@chelone/vue`'s `src/index.ts`),
 * never a deep `./*.vue` path. That import discipline is itself the test for
 * requirement (4): every new display field AND its exported `*Props` type must
 * resolve from the public barrel, or this file fails to type-check / run.
 *
 * Coverage:
 *   (1) SIMPLE — over an ambient `RecordContext`, boolean (icon per true/false),
 *       number (locale-formatted), date, email (mailto), url (safe anchor), and
 *       rating (filled/empty stars) render the record value; an absent source
 *       renders the `empty` placeholder (or nothing).
 *   (2) SELECT / REFERENCE — <SelectField> renders the choice LABEL, never the
 *       raw id; <ReferenceArrayField> resolves an FK array through the data
 *       hooks and lists the referenced record representations (author names).
 *   (3) COMPOSITIONAL — <FunctionField> renders derived content from the record
 *       via its scoped slot; <RecordField> / <WrapperField> wrap a child field.
 *   (4) BARREL — a completeness block asserts every V2-c field resolves from the
 *       barrel, plus a type-level probe pins every `*Props` type.
 *
 * jsdom applies no CSS: assert DOM structure / attributes / values + behavior,
 * never visual styling.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
// --- BARREL IMPORTS ONLY (requirement 4) ----------------------------------
import {
  Admin,
  type ApiKeyFieldProps,
  type ArrayFieldProps,
  BadgeField,
  type BadgeFieldProps,
  BooleanField,
  type BooleanFieldProps,
  ChipField,
  type ChipFieldProps,
  ColorField,
  type ColorFieldProps,
  type CronFieldProps,
  type CurrencyFieldProps,
  DateField,
  type DateFieldProps,
  type DurationFieldProps,
  EmailField,
  type EmailFieldProps,
  type FileFieldProps,
  FunctionField,
  type FunctionFieldProps,
  type ImageFieldProps,
  NumberField,
  type NumberFieldProps,
  PhoneField,
  type PhoneFieldProps,
  provideCheloneContext,
  provideRecordContext,
  RatingField,
  type RatingFieldProps,
  RecordField,
  type RecordFieldProps,
  ReferenceArrayField,
  type ReferenceArrayFieldProps,
  ReferenceManyField,
  type ReferenceManyFieldProps,
  ReferenceOneField,
  type ReferenceOneFieldProps,
  SelectField,
  type SelectFieldProps,
  type SubscriptionPlanFieldProps,
  type TextArrayFieldProps,
  TextField,
  UrlField,
  type UrlFieldProps,
  type UsageMeterFieldProps,
  useListContext,
  type WebhookEndpointFieldProps,
  WrapperField,
  type WrapperFieldProps,
} from "../../../index";

// --- light harness (no fetching) ------------------------------------------

function makeContext() {
  return { dataProvider: fakeDataProvider({}), queryClient: new QueryClient() };
}

/** Mount `field` (with `props` + optional `slots`) under a static `record`. */
function mountField(
  // `object` is the widest honest shape: `<FunctionField>` is generic with a
  // required scoped slot, and vue-tsc types that as a function no `h` overload
  // takes, so no Vue component type accepts every field this harness mounts.
  field: object,
  props: Record<string, unknown>,
  record: Record<string, unknown> | undefined,
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

/** A list consumer that renders each `useListContext().data` row as an <li>. */
const RowConsumer = defineComponent({
  props: { textKey: { type: String, default: "id" } },
  setup(props) {
    const list = useListContext();
    return () =>
      h(
        "ul",
        (list.data ?? []).map((row) =>
          h("li", { "aria-label": String(row.id) }, String(row[props.textKey])),
        ),
      );
  },
});

// --- (4a) barrel completeness ---------------------------------------------
describe("barrel exports (requirement 4)", () => {
  it("resolves every V2-c display field from @chelone/vue", () => {
    for (const cmp of [
      BooleanField,
      NumberField,
      DateField,
      EmailField,
      UrlField,
      RatingField,
      ChipField,
      BadgeField,
      ColorField,
      PhoneField,
      SelectField,
      ReferenceArrayField,
      ReferenceManyField,
      ReferenceOneField,
      FunctionField,
      RecordField,
      WrapperField,
      TextField,
    ]) {
      expect(cmp).toBeDefined();
    }
  });

  it("resolves every V2-c *Props type from @chelone/vue (type-level)", () => {
    // Purely type-level: each imported Props type annotates a slot here, so if
    // any were missing from the barrel the `--typecheck` run would fail.
    const probes: {
      apiKey?: ApiKeyFieldProps;
      array?: ArrayFieldProps;
      badge?: BadgeFieldProps;
      boolean?: BooleanFieldProps;
      chip?: ChipFieldProps;
      color?: ColorFieldProps;
      cron?: CronFieldProps;
      currency?: CurrencyFieldProps;
      date?: DateFieldProps;
      duration?: DurationFieldProps;
      email?: EmailFieldProps;
      file?: FileFieldProps;
      fn?: FunctionFieldProps;
      image?: ImageFieldProps;
      number?: NumberFieldProps;
      phone?: PhoneFieldProps;
      rating?: RatingFieldProps;
      record?: RecordFieldProps;
      referenceArray?: ReferenceArrayFieldProps;
      referenceMany?: ReferenceManyFieldProps;
      referenceOne?: ReferenceOneFieldProps;
      select?: SelectFieldProps;
      subscriptionPlan?: SubscriptionPlanFieldProps;
      textArray?: TextArrayFieldProps;
      url?: UrlFieldProps;
      usageMeter?: UsageMeterFieldProps;
      webhook?: WebhookEndpointFieldProps;
      wrapper?: WrapperFieldProps;
    } = {};
    expect(probes).toBeDefined();
  });
});

// --- (1) SIMPLE display fields --------------------------------------------
describe("simple display fields (requirement 1)", () => {
  it("<BooleanField> renders the true icon then the false icon", () => {
    const t = mountField(BooleanField, { source: "on" }, { on: true });
    expect(t.get('[data-slot="boolean-field"]').attributes("data-value")).toBe(
      "true",
    );
    const f = mountField(BooleanField, { source: "on" }, { on: false });
    expect(f.get('[data-slot="boolean-field"]').attributes("data-value")).toBe(
      "false",
    );
  });

  it("<NumberField> locale-formats the record value", () => {
    const w = mountField(
      NumberField,
      { source: "price", locales: "en-US" },
      { price: 1234.5 },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("1,234.5");
  });

  it("<DateField> formats a date-only string in UTC", () => {
    const w = mountField(
      DateField,
      { source: "at", locales: "en-US" },
      { at: "2022-02-15" },
    );
    expect(w.get('[data-slot="date-field"]').text()).toBe("2/15/2022");
  });

  it("<EmailField> renders a mailto link", () => {
    const w = mountField(EmailField, { source: "email" }, { email: "a@b.com" });
    const a = w.get('[data-slot="email-field"]');
    expect(a.attributes("href")).toBe("mailto:a@b.com");
    expect(a.text()).toBe("a@b.com");
  });

  it("<UrlField> renders a safe anchor", () => {
    const w = mountField(
      UrlField,
      { source: "site" },
      { site: "https://example.com" },
    );
    const a = w.get('[data-slot="url-field"]');
    expect(a.element.tagName).toBe("A");
    expect(a.attributes("href")).toBe("https://example.com");
  });

  it("<RatingField> renders filled + empty stars for an integer rating", () => {
    const w = mountField(RatingField, { source: "rating" }, { rating: 3 });
    const stars = w.findAll("[data-rating-star]");
    expect(stars).toHaveLength(5);
    expect(
      stars.filter((s) => s.attributes("data-rating-star") === "filled"),
    ).toHaveLength(3);
  });

  it("renders the empty placeholder for an absent source", () => {
    const w = mountField(
      NumberField,
      { source: "price", empty: "—" },
      { price: null },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("—");
  });

  it("renders nothing for an absent source without empty", () => {
    const w = mountField(EmailField, { source: "email" }, { email: null });
    expect(w.find('[data-slot="email-field"]').exists()).toBe(false);
  });
});

// --- (2) SELECT / REFERENCE -----------------------------------------------

const choices = [
  { id: "M", name: "Male" },
  { id: "F", name: "Female" },
];

describe("select / reference fields (requirement 2)", () => {
  it("<SelectField> renders the choice label, not the raw id", () => {
    const w = mountField(
      SelectField,
      { source: "gender", choices },
      { gender: "F" },
    );
    expect(w.get('[data-slot="select-field"]').text()).toBe("Female");
    // and never leaks the raw id.
    expect(w.get('[data-slot="select-field"]').text()).not.toBe("F");
  });

  const resources = defineResources({
    posts: {
      schema: z.object({ id: z.number(), tag_ids: z.array(z.number()) }),
    },
    tags: { schema: z.object({ id: z.number(), name: z.string() }) },
  });
  type Resources = typeof resources;

  const tags = [
    { id: 1, name: "Tech" },
    { id: 2, name: "News" },
    { id: 3, name: "Lifestyle" },
  ];

  function makeRouter(): Router {
    return createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { render: () => null } }],
    });
  }

  function mountAdmin(render: () => unknown) {
    const dataProvider = fakeDataProvider<Resources>({
      posts: [],
      tags: structuredClone(tags),
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Harness = defineComponent({
      setup() {
        return () =>
          h(Admin, { dataProvider, queryClient }, { default: render });
      },
    });
    return mount(Harness, { global: { plugins: [makeRouter()] } });
  }

  it("<ReferenceArrayField> resolves an FK array to the referenced names", async () => {
    const w = mountAdmin(() =>
      h(
        defineComponent({
          setup() {
            provideRecordContext({ id: 10, tag_ids: [1, 3] });
            return () =>
              h(
                ReferenceArrayField,
                { source: "tag_ids", reference: "tags" },
                { default: () => h(RowConsumer, { textKey: "name" }) },
              );
          },
        }),
      ),
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Tech");
      expect(w.text()).toContain("Lifestyle");
    });
    expect(w.text()).not.toContain("News");
  });
});

// --- (3) COMPOSITIONAL ----------------------------------------------------
describe("compositional fields (requirement 3)", () => {
  it("<FunctionField> renders derived content from the record via a slot", () => {
    const w = mountField(
      FunctionField,
      { source: "last" },
      { first: "Ada", last: "Lovelace" },
      {
        default: (scope: { record: Record<string, unknown> }) =>
          `${scope.record.first} ${scope.record.last}`,
      },
    );
    expect(w.get('[data-slot="function-field"]').text()).toBe("Ada Lovelace");
  });

  it("<RecordField> wraps a child field (default TextField fallback)", () => {
    const w = mountField(
      RecordField,
      { source: "first_name" },
      { first_name: "Ada" },
    );
    const root = w.get('[data-slot="record-field"]');
    expect(root.text()).toContain("First Name");
    expect(root.get('[data-slot="text-field"]').text()).toBe("Ada");
  });

  it("<WrapperField> renders its child slot verbatim (a passthrough)", () => {
    const w = mountField(
      WrapperField,
      { source: "last_name" },
      { x: 1 },
      { default: () => h("span", { class: "wrapped" }, "hello") },
    );
    expect(w.get(".wrapped").text()).toBe("hello");
  });
});
