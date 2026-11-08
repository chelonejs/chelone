/**
 * V2-a Task 3 — niche inputs ported from their `@chelone/react` twins:
 * `<TextArrayInput>` (string[] tags), `<CronInput>` (cron + live preview),
 * `<RatingInput>` (star rating), `<WebhookEndpointInput>` (composite object),
 * and `<ApiKeyInput>` (NOT form-bound — direct update mutation on the ambient
 * record/resource). Mounted under a real `<Admin>` exactly like
 * `inputs-v2a.test.ts`. jsdom applies no CSS: assert DOM structure/roles/values
 * + behavior, never visual styling.
 */

import {
  createI18n,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, type Mock, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import ApiKeyInput, { type ApiKeyInputProps } from "./api-key-input.vue";
import CronInput from "./cron-input.vue";
import RatingInput from "./rating-input.vue";
import TextArrayInput from "./text-array-input.vue";
import WebhookEndpointInput, {
  type WebhookEndpoint,
} from "./webhook-endpoint-input.vue";

const i18nMessages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
    "chelone.action.remove": "Remove",
  }),
};

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

interface FormValues {
  tags?: unknown;
  schedule?: unknown;
  rating?: unknown;
  endpoint?: unknown;
}

interface Captured {
  form?: UseFormReturn<FormValues>;
  values?: () => FormValues;
}

/** Mount `render()` inside `<Admin>` + a `useForm` host seeded with `record`. */
function mountInForm(
  render: () => unknown,
  { record }: { record: FormValues },
) {
  const captured: Captured = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const dataProvider = fakeDataProvider({});
  const i18n = createI18n({ locale: "en", messages: i18nMessages });

  const FormHost = defineComponent({
    setup(_, { slots }) {
      const form = useForm<FormValues>({
        record,
        onSubmit: async () => undefined,
      });
      captured.form = form;
      captured.values = () => form.values.value;
      return () => slots.default?.();
    },
  });

  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient, i18n },
          { default: () => h(FormHost, null, { default: render }) },
        );
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, captured };
}

describe("<TextArrayInput>", () => {
  it("renders a labelled input and the existing tags", async () => {
    const { wrapper } = mountInForm(
      () => h(TextArrayInput, { source: "tags" }),
      {
        record: { tags: ["a", "b"] },
      },
    );
    await flushPromises();
    expect(wrapper.find("label").text()).toContain("Tags");
    expect(wrapper.text()).toContain("a");
    expect(wrapper.text()).toContain("b");
  });

  it("adds a tag on Enter and writes the array to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextArrayInput, { source: "tags" }),
      { record: { tags: ["a"] } },
    );
    await flushPromises();
    const input = wrapper.find("input");
    await input.setValue("b");
    await input.trigger("keydown", { key: "Enter" });
    await nextTick();
    expect(wrapper.text()).toContain("b");
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().tags).toEqual(["a", "b"]);
  });

  it("removes the last tag on Backspace when the input is empty", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextArrayInput, { source: "tags" }),
      { record: { tags: ["a", "b"] } },
    );
    await flushPromises();
    const input = wrapper.find("input");
    await input.trigger("keydown", { key: "Backspace" });
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().tags).toEqual(["a"]);
  });

  it("removes a tag via its remove button", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextArrayInput, { source: "tags" }),
      { record: { tags: ["a", "b"] } },
    );
    await flushPromises();
    // The first tag's remove button removes "a".
    const removeButtons = wrapper.findAll("span button");
    await removeButtons[0]?.trigger("click");
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().tags).toEqual(["b"]);
  });

  it("renders the required marker and surfaces an error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextArrayInput, { source: "tags", validate: required() }),
      { record: { tags: null } },
    );
    await flushPromises();
    expect(wrapper.find("label").text()).toContain("*");
    expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Required");
  });
});

describe("<CronInput>", () => {
  it("renders a text input seeded with the cron value", async () => {
    const { wrapper } = mountInForm(
      () => h(CronInput, { source: "schedule" }),
      { record: { schedule: "0 9 * * *" } },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find("input").element, HTMLInputElement).value,
    ).toBe("0 9 * * *");
  });

  it("previews the human meaning of a valid expression", async () => {
    const { wrapper } = mountInForm(
      () => h(CronInput, { source: "schedule" }),
      { record: { schedule: "0 9 * * *" } },
    );
    await flushPromises();
    expect(wrapper.find("[data-cron-preview]").text()).toMatch(/09:00|9:00/);
  });

  it("shows 'Invalid cron' for an unparseable expression", async () => {
    const { wrapper } = mountInForm(
      () => h(CronInput, { source: "schedule" }),
      { record: { schedule: "not a cron" } },
    );
    await flushPromises();
    expect(wrapper.find("[data-cron-preview]").text()).toBe("Invalid cron");
  });

  it("writes typed input back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(CronInput, { source: "schedule" }),
      { record: { schedule: "" } },
    );
    await flushPromises();
    await wrapper.find("input").setValue("*/5 * * * *");
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().schedule).toBe("*/5 * * * *");
  });

  it("respects the disabled prop", async () => {
    const { wrapper } = mountInForm(
      () => h(CronInput, { source: "schedule", disabled: true }),
      { record: { schedule: "0 9 * * *" } },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find("input").element, HTMLInputElement).disabled,
    ).toBe(true);
  });
});

describe("<RatingInput>", () => {
  it("renders `max` radio stars in a radiogroup with the humanized label", async () => {
    const { wrapper } = mountInForm(
      () => h(RatingInput, { source: "rating" }),
      { record: { rating: 3 } },
    );
    await flushPromises();
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true);
    const stars = wrapper.findAll('[role="radio"]');
    expect(stars.length).toBe(5);
    expect(
      stars.filter((s) => s.attributes("aria-checked") === "true").length,
    ).toBe(3);
    expect(wrapper.find("legend").text()).toContain("Rating");
  });

  it("renders the empty state for a stored string that is no number", async () => {
    const { wrapper } = mountInForm(
      () => h(RatingInput, { source: "rating" }),
      { record: { rating: "great" } },
    );
    await flushPromises();
    const stars = wrapper.findAll('[role="radio"]');
    expect(stars.length).toBe(5);
    expect(
      stars.filter((s) => s.attributes("aria-checked") === "true").length,
    ).toBe(0);
  });

  it("renders `max` stars when max is set", async () => {
    const { wrapper } = mountInForm(
      () => h(RatingInput, { source: "rating", max: 10 }),
      { record: { rating: 7 } },
    );
    await flushPromises();
    expect(wrapper.findAll('[role="radio"]').length).toBe(10);
  });

  it("doubles the star count for half-step granularity", async () => {
    const { wrapper } = mountInForm(
      () => h(RatingInput, { source: "rating", allowHalf: true }),
      { record: { rating: 2.5 } },
    );
    await flushPromises();
    expect(wrapper.findAll('[role="radio"]').length).toBe(10);
  });

  it("writes the picked value back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(RatingInput, { source: "rating" }),
      { record: { rating: 0 } },
    );
    await flushPromises();
    const stars = wrapper.findAll('[role="radio"]');
    await stars[3]?.trigger("click");
    await nextTick();
    expect(stars[3]?.attributes("aria-checked")).toBe("true");
    expect(stars[4]?.attributes("aria-checked")).toBe("false");
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().rating).toBe(4);
  });

  it("renders the required marker and surfaces an error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(RatingInput, { source: "rating", validate: required() }),
      { record: { rating: null } },
    );
    await flushPromises();
    expect(wrapper.find("legend").text()).toContain("*");
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Required");
  });

  it("hides the label when label is false", async () => {
    const { wrapper } = mountInForm(
      () => h(RatingInput, { source: "rating", label: false }),
      { record: { rating: 4 } },
    );
    await flushPromises();
    expect(wrapper.find("legend").exists()).toBe(false);
  });

  it("respects the disabled prop (no write on click)", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(RatingInput, { source: "rating", disabled: true }),
      { record: { rating: 3 } },
    );
    await flushPromises();
    const stars = wrapper.findAll('[role="radio"]');
    expect(stars[0]?.attributes("aria-disabled")).toBe("true");
    await stars[4]?.trigger("click");
    await nextTick();
    expect(stars[4]?.attributes("aria-checked")).toBe("false");
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().rating).toBe(3);
  });
});

const EVENTS = ["order.created", "order.updated"] as const;
const seed: WebhookEndpoint = {
  url: "https://a.test/hook",
  secret: "shh",
  eventTypes: ["order.created"],
};

describe("<WebhookEndpointInput>", () => {
  it("renders url + secret inputs seeded from the value", async () => {
    const { wrapper } = mountInForm(
      () => h(WebhookEndpointInput, { source: "endpoint", eventTypes: EVENTS }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find("[data-webhook-url]").element, HTMLInputElement)
        .value,
    ).toBe("https://a.test/hook");
    expect(
      elementOf(wrapper.find("[data-webhook-secret]").element, HTMLInputElement)
        .value,
    ).toBe("shh");
  });

  it("renders a checkbox per event type and reflects subscriptions", async () => {
    const { wrapper } = mountInForm(
      () => h(WebhookEndpointInput, { source: "endpoint", eventTypes: EVENTS }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    expect(wrapper.findAll("[data-event-checkbox]").length).toBe(2);
    const created = elementOf(
      wrapper.find("#webhook-event-order\\.created").element,
      HTMLInputElement,
    );
    expect(created.checked).toBe(true);
  });

  it("writes the url patch back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(WebhookEndpointInput, { source: "endpoint", eventTypes: EVENTS }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    await wrapper.find("[data-webhook-url]").setValue("https://b.test/hook");
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().endpoint).toEqual({
      ...seed,
      url: "https://b.test/hook",
    });
  });

  it("toggles an event subscription", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(WebhookEndpointInput, { source: "endpoint", eventTypes: EVENTS }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    await wrapper.find("#webhook-event-order\\.updated").setValue(true);
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().endpoint).toEqual({
      ...seed,
      eventTypes: ["order.created", "order.updated"],
    });
  });

  it("renders the test-ping button and calls onTestPing", async () => {
    const onTestPing = vi.fn().mockResolvedValue(undefined);
    const { wrapper } = mountInForm(
      () =>
        h(WebhookEndpointInput, {
          source: "endpoint",
          eventTypes: EVENTS,
          onTestPing,
        }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    await wrapper.find("[data-test-ping-button]").trigger("click");
    await flushPromises();
    expect(onTestPing).toHaveBeenCalledWith("https://a.test/hook", "shh");
  });

  it("omits the test-ping button when no onTestPing given", async () => {
    const { wrapper } = mountInForm(
      () => h(WebhookEndpointInput, { source: "endpoint", eventTypes: EVENTS }),
      { record: { endpoint: seed } },
    );
    await flushPromises();
    expect(wrapper.find("[data-test-ping-button]").exists()).toBe(false);
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(WebhookEndpointInput, {
          source: "endpoint",
          eventTypes: EVENTS,
          validate: required(),
        }),
      { record: { endpoint: null } },
    );
    await flushPromises();
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Required");
  });
});

interface Account extends Record<string, unknown> {
  id: number;
  apiKey: string | null;
}

/** Mount `<ApiKeyInput>` under `<Admin>` with an ambient resource + record. */
function mountApiKey(
  props: ApiKeyInputProps<Account>,
  {
    record,
    resource = "accounts",
    update,
  }: {
    record?: Account;
    resource?: string;
    update?: Mock<DataProvider["update"]>;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = makeRouter();
  const base = fakeDataProvider({
    accounts: [{ id: 1, apiKey: "sk_live_abc" }],
  });
  const dataProvider = update ? { ...base, update } : base;

  const Host = defineComponent({
    setup(_, { slots }) {
      provideResourceContext(resource);
      if (record) provideRecordContext(record);
      return () => slots.default?.();
    },
  });

  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          {
            default: () =>
              h(Host, null, {
                default: () => h(ApiKeyInput<Account>, { ...props }),
              }),
          },
        );
    },
  });

  return mount(Harness, { global: { plugins: [router] } });
}

describe("<ApiKeyInput>", () => {
  it("renders a Rotate button", () => {
    const wrapper = mountApiKey(
      { source: "apiKey" },
      { record: { id: 1, apiKey: "sk_live_abc" } },
    );
    expect(wrapper.find("[data-rotate-button]").exists()).toBe(true);
  });

  it("opens a confirmation dialog on click", async () => {
    const wrapper = mountApiKey(
      { source: "apiKey" },
      { record: { id: 1, apiKey: "sk_live_abc" } },
    );
    await wrapper.find("[data-rotate-button]").trigger("click");
    await nextTick();
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Rotate API key?");
  });

  it("calls onRotate with the record on confirm when provided", async () => {
    const onRotate = vi.fn().mockResolvedValue(undefined);
    const record = { id: 1, apiKey: "sk_live_abc" };
    const wrapper = mountApiKey({ source: "apiKey", onRotate }, { record });
    await wrapper.find("[data-rotate-button]").trigger("click");
    await nextTick();
    await wrapper.find("[data-rotate-confirm]").trigger("click");
    await flushPromises();
    expect(onRotate).toHaveBeenCalledWith(record);
  });

  it("dispatches the default update mutation (id + nulled source) on confirm", async () => {
    const update = vi
      .fn<DataProvider["update"]>()
      .mockResolvedValue({ data: { id: 1, apiKey: null } });
    const wrapper = mountApiKey(
      { source: "apiKey" },
      { record: { id: 1, apiKey: "sk_live_abc" }, update },
    );
    await wrapper.find("[data-rotate-button]").trigger("click");
    await nextTick();
    await wrapper.find("[data-rotate-confirm]").trigger("click");
    await flushPromises();
    expect(update).toHaveBeenCalledWith(
      "accounts",
      expect.objectContaining({
        id: 1,
        data: { apiKey: null },
        previousData: { id: 1, apiKey: "sk_live_abc" },
      }),
    );
  });

  it("respects the disabled prop", () => {
    const wrapper = mountApiKey(
      { source: "apiKey", disabled: true },
      { record: { id: 1, apiKey: "sk_live_abc" } },
    );
    expect(
      elementOf(wrapper.find("[data-rotate-button]").element, HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
