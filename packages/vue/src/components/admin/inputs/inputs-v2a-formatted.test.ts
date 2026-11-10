/**
 * V2-a Task 2 — date/time + formatted inputs ported from their `@chelone/react`
 * twins: `<DateInput>`, `<DateTimeInput>`, `<TimeInput>`, `<PhoneInput>`,
 * `<CurrencyInput>`, `<DurationInput>`. Mounted under a real `<Admin>` (Chelone
 * context + vue-query + router adapter) exactly like `inputs-v2a.test.ts`. jsdom
 * applies no CSS: assert DOM structure/roles/values + the value contract each
 * input round-trips (dates as strings/ISO, time as a Date, phone as E.164,
 * money as number/composite, duration as an ISO-8601 string).
 */

import {
  type AnyCheloneI18n,
  createI18n,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import CurrencyInput from "./currency-input.vue";
import DateInput from "./date-input.vue";
import DateTimeInput from "./date-time-input.vue";
import DurationInput from "./duration-input.vue";
import PhoneInput from "./phone-input.vue";
import TimeInput from "./time-input.vue";

interface FormValues {
  id?: number;
  published_at?: unknown;
  starts_at?: unknown;
  opens_at?: unknown;
  phone?: unknown;
  price?: unknown;
  money?: unknown;
  dur?: unknown;
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

interface Captured {
  form?: UseFormReturn<FormValues>;
  values?: () => FormValues;
}

function mountInForm(
  render: () => unknown,
  record: FormValues,
  i18n?: AnyCheloneI18n,
) {
  const captured: Captured = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const dataProvider = fakeDataProvider({});

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

describe("<DateInput>", () => {
  it("renders a labelled date input seeded with a bare date", async () => {
    const { wrapper } = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      { id: 1, published_at: "2021-09-11" },
    );
    await flushPromises();
    const input = wrapper.find('input[type="date"]');
    expect(input.exists()).toBe(true);
    expect(elementOf(input.element, HTMLInputElement).value).toBe("2021-09-11");
    expect(wrapper.find("label").text()).toContain("Published At");
  });

  it("formats an ISO datetime string and a Date to a bare date", async () => {
    const iso = mountInForm(() => h(DateInput, { source: "published_at" }), {
      id: 1,
      published_at: "2021-09-11T20:00:00.000Z",
    });
    await flushPromises();
    expect(
      elementOf(
        iso.wrapper.find('input[type="date"]').element,
        HTMLInputElement,
      ).value,
    ).toBe("2021-09-11");

    const dateObj = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      { id: 1, published_at: new Date(2021, 8, 11) },
    );
    await flushPromises();
    expect(
      elementOf(
        dateObj.wrapper.find('input[type="date"]').element,
        HTMLInputElement,
      ).value,
    ).toBe("2021-09-11");
  });

  it("renders empty for a stored object", async () => {
    const { wrapper } = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      { id: 1, published_at: { year: 2021 } },
    );
    await flushPromises();
    const input = elementOf(
      wrapper.find('input[type="date"]').element,
      HTMLInputElement,
    );
    expect(input.value).toBe("");
  });

  it("writes the typed date string back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      { id: 1, published_at: null },
    );
    await flushPromises();
    const input = wrapper.find('input[type="date"]');
    await input.setValue("2021-10-20");
    await nextTick();
    expect(captured.values?.().published_at).toBe("2021-10-20");
  });

  it("clears the form value when emptied on blur", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      { id: 1, published_at: "2021-09-11" },
    );
    await flushPromises();
    const input = wrapper.find('input[type="date"]');
    await input.setValue("");
    await input.trigger("blur");
    await nextTick();
    expect(captured.values?.().published_at).toBeNull();
  });

  it("renders the required marker and no label when label is false", async () => {
    const req = mountInForm(
      () => h(DateInput, { source: "published_at", validate: required() }),
      { id: 1 },
    );
    await flushPromises();
    expect(req.wrapper.find("label").text()).toContain("*");

    const noLabel = mountInForm(
      () => h(DateInput, { source: "published_at", label: false }),
      { id: 1 },
    );
    await flushPromises();
    expect(noLabel.wrapper.find("label").exists()).toBe(false);
  });

  it("surfaces a validation error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(DateInput, {
          source: "published_at",
          validate: required("Required"),
        }),
      { id: 1 },
    );
    await flushPromises();
    await wrapper.find('input[type="date"]').trigger("blur");
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Required");
  });
});

describe("<DateTimeInput>", () => {
  it("formats an ISO string to the local datetime-local value", async () => {
    const { wrapper } = mountInForm(
      () => h(DateTimeInput, { source: "starts_at" }),
      { id: 1, starts_at: new Date(2021, 8, 11, 10, 30) },
    );
    await flushPromises();
    const input = wrapper.find('input[type="datetime-local"]');
    expect(input.exists()).toBe(true);
    expect(elementOf(input.element, HTMLInputElement).value).toBe(
      "2021-09-11T10:30",
    );
  });

  it("renders empty for a stored object", async () => {
    const { wrapper } = mountInForm(
      () => h(DateTimeInput, { source: "starts_at" }),
      { id: 1, starts_at: { year: 2021 } },
    );
    await flushPromises();
    const input = elementOf(
      wrapper.find('input[type="datetime-local"]').element,
      HTMLInputElement,
    );
    expect(input.value).toBe("");
  });

  it("writes an ISO string back to the form when typed", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DateTimeInput, { source: "starts_at" }),
      { id: 1, starts_at: null },
    );
    await flushPromises();
    const input = wrapper.find('input[type="datetime-local"]');
    await input.setValue("2021-10-20T14:30");
    await nextTick();
    const written = captured.values?.().starts_at;
    expect(typeof written).toBe("string");
    if (typeof written !== "string") throw new Error("Expected a string");
    expect(Number.isNaN(new Date(written).getTime())).toBe(false);
  });

  it("surfaces a validation error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(DateTimeInput, {
          source: "starts_at",
          validate: required("Required"),
        }),
      { id: 1 },
    );
    await flushPromises();
    await wrapper.find('input[type="datetime-local"]').trigger("blur");
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-slot="field-error"]').text()).toContain(
      "Required",
    );
  });
});

describe("<TimeInput>", () => {
  it("formats a Date to a local HH:mm string", async () => {
    const { wrapper } = mountInForm(
      () => h(TimeInput, { source: "opens_at" }),
      {
        id: 1,
        opens_at: new Date(2021, 8, 11, 8, 30),
      },
    );
    await flushPromises();
    const input = wrapper.find('input[type="time"]');
    expect(elementOf(input.element, HTMLInputElement).value).toBe("08:30");
  });

  it("renders empty for a stored object", async () => {
    const { wrapper } = mountInForm(
      () => h(TimeInput, { source: "opens_at" }),
      { id: 1, opens_at: { year: 2021 } },
    );
    await flushPromises();
    const input = elementOf(
      wrapper.find('input[type="time"]').element,
      HTMLInputElement,
    );
    expect(input.value).toBe("");
  });

  it("writes a parsed Date back to the form when typed", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TimeInput, { source: "opens_at" }),
      { id: 1, opens_at: null },
    );
    await flushPromises();
    await wrapper.find('input[type="time"]').setValue("09:45");
    await nextTick();
    const written = captured.values?.().opens_at;
    expect(written).toBeInstanceOf(Date);
    if (!(written instanceof Date)) throw new Error("Expected a Date");
    expect(written.getHours()).toBe(9);
    expect(written.getMinutes()).toBe(45);
  });

  it("accepts a custom parse returning the raw string", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(TimeInput, {
          source: "opens_at",
          parse: (v: unknown) => v,
        }),
      { id: 1, opens_at: null },
    );
    await flushPromises();
    await wrapper.find('input[type="time"]').setValue("09:45");
    await nextTick();
    expect(captured.values?.().opens_at).toBe("09:45");
  });

  it("surfaces a validation error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(TimeInput, { source: "opens_at", validate: required("Required") }),
      { id: 1 },
    );
    await flushPromises();
    await wrapper.find('input[type="time"]').trigger("blur");
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-slot="field-error"]').text()).toContain(
      "Required",
    );
  });
});

describe("<PhoneInput>", () => {
  it("renders a national-format value and infers the country from stored E.164", async () => {
    const { wrapper } = mountInForm(() => h(PhoneInput, { source: "phone" }), {
      id: 1,
      phone: "+14155552671",
    });
    await flushPromises();
    const input = wrapper.find('input[type="tel"]');
    expect(input.exists()).toBe(true);
    expect(elementOf(input.element, HTMLInputElement).value).toContain("415");
    const select = wrapper.find("select[data-country-select]");
    expect(elementOf(select.element, HTMLSelectElement).value).toBe("US");
  });

  it("stores E.164 on typing a national number", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(PhoneInput, { source: "phone", defaultCountry: "US" }),
      { id: 1, phone: "" },
    );
    await flushPromises();
    await wrapper.find('input[type="tel"]').setValue("4155552671");
    await nextTick();
    expect(captured.values?.().phone).toBe("+14155552671");
  });

  it("writes E.164 for the country the selector picks", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(PhoneInput, {
          source: "phone",
          allowedCountries: ["US", "CA"],
          defaultCountry: "US",
        }),
      { id: 1, phone: "" },
    );
    await flushPromises();
    await wrapper.find('input[type="tel"]').setValue("4165550123");
    await nextTick();
    await wrapper.find("select[data-country-select]").setValue("CA");
    await nextTick();
    expect(
      elementOf(
        wrapper.find("select[data-country-select]").element,
        HTMLSelectElement,
      ).value,
    ).toBe("CA");
    expect(captured.values?.().phone).toBe("+14165550123");
  });

  it("keeps the stored number and its country showing when the selector hands a value outside its countries", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(PhoneInput, { source: "phone", allowedCountries: ["US", "CA"] }),
      { id: 1, phone: "+14155552671" },
    );
    await flushPromises();
    const select = wrapper.find("select[data-country-select]");
    await select.setValue("");
    await nextTick();
    expect(captured.values?.().phone).toBe("+14155552671");
    expect(elementOf(select.element, HTMLSelectElement).value).toBe("US");
  });

  it("limits the country selector to allowedCountries", async () => {
    const { wrapper } = mountInForm(
      () => h(PhoneInput, { source: "phone", allowedCountries: ["US", "CA"] }),
      { id: 1, phone: "" },
    );
    await flushPromises();
    expect(
      wrapper.find("select[data-country-select]").findAll("option").length,
    ).toBe(2);
  });

  it("respects the disabled prop", async () => {
    const { wrapper } = mountInForm(
      () => h(PhoneInput, { source: "phone", disabled: true }),
      { id: 1, phone: "+14155552671" },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find('input[type="tel"]').element, HTMLInputElement)
        .disabled,
    ).toBe(true);
  });
});

describe("<CurrencyInput>", () => {
  it("renders a number input seeded with the value and the USD symbol", async () => {
    const { wrapper } = mountInForm(
      () => h(CurrencyInput, { source: "price", currency: "USD" }),
      { id: 1, price: 1234.5 },
    );
    await flushPromises();
    const input = wrapper.find('input[type="number"]');
    expect(elementOf(input.element, HTMLInputElement).value).toBe("1234.5");
    expect(wrapper.text()).toContain("$");
  });

  it("writes the parsed number back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(CurrencyInput, { source: "price", currency: "USD" }),
      { id: 1, price: 10 },
    );
    await flushPromises();
    await wrapper.find('input[type="number"]').setValue("42.5");
    await nextTick();
    expect(captured.values?.().price).toBe(42.5);
  });

  it("renders and writes a composite value in multi-currency mode", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CurrencyInput, {
          source: "money",
          currencies: ["EUR", "USD"],
        }),
      { id: 1, money: { amount: 5000, currency: "EUR" } },
    );
    await flushPromises();
    const select = wrapper.find("select[data-currency-select]");
    expect(elementOf(select.element, HTMLSelectElement).value).toBe("EUR");

    await wrapper.find('input[type="number"]').setValue("99");
    await nextTick();
    expect(captured.values?.().money).toEqual({ amount: 99, currency: "EUR" });
  });

  it("keeps a stored amount that has no currency when one is picked", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CurrencyInput, {
          source: "money",
          currencies: ["EUR", "USD"],
        }),
      { id: 1, money: { amount: 500 } },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find('input[type="number"]').element, HTMLInputElement)
        .value,
    ).toBe("500");

    await wrapper.find("select[data-currency-select]").setValue("USD");
    await nextTick();
    expect(captured.values?.().money).toEqual({ amount: 500, currency: "USD" });
  });

  it("divides and multiplies by 100 when storeAsMinorUnits", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CurrencyInput, {
          source: "price",
          currency: "USD",
          storeAsMinorUnits: true,
        }),
      { id: 1, price: 12345 },
    );
    await flushPromises();
    expect(
      elementOf(wrapper.find('input[type="number"]').element, HTMLInputElement)
        .value,
    ).toBe("123.45");

    await wrapper.find('input[type="number"]').setValue("99.99");
    await nextTick();
    expect(captured.values?.().price).toBe(9999);
  });

  it("uses displayLocale to format the currency symbol", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(CurrencyInput, {
          source: "price",
          currency: "EUR",
          displayLocale: "de-DE",
        }),
      { id: 1, price: 10 },
    );
    await flushPromises();
    expect(wrapper.text()).toContain("€");
  });

  it("CurrencyInput follows the app locale after setLocale", async () => {
    const i18n = createI18n({
      locale: "en-US",
      messages: { "en-US": {}, "ar-AE": {} },
    });
    const { wrapper } = mountInForm(
      () => h(CurrencyInput, { source: "price", currency: "AED" }),
      { id: 1, price: 10 },
      i18n,
    );
    await flushPromises();
    expect(wrapper.text()).toContain("AED");

    i18n.setLocale("ar-AE");
    await nextTick();

    expect(wrapper.text()).toContain("د.إ.");
  });

  it("surfaces a validation error after submit", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CurrencyInput, {
          source: "price",
          currency: "USD",
          validate: required("Required"),
        }),
      { id: 1 },
    );
    await flushPromises();
    await wrapper.find('input[type="number"]').trigger("blur");
    await captured.form?.submit();
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-slot="field-error"]').text()).toContain(
      "Required",
    );
  });
});

describe("<DurationInput>", () => {
  it("renders per-unit inputs seeded from an ISO duration", async () => {
    const { wrapper } = mountInForm(() => h(DurationInput, { source: "dur" }), {
      id: 1,
      dur: "P1DT2H30M45S",
    });
    await flushPromises();
    const val = (label: string) =>
      elementOf(
        wrapper.find(`input[aria-label="${label}"]`).element,
        HTMLInputElement,
      ).value;
    expect(val("days")).toBe("1");
    expect(val("hours")).toBe("2");
    expect(val("minutes")).toBe("30");
    expect(val("seconds")).toBe("45");
  });

  it("writes back an ISO duration when units change", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DurationInput, { source: "dur" }),
      { id: 1, dur: "" },
    );
    await flushPromises();
    await wrapper.find('input[aria-label="hours"]').setValue("2");
    await nextTick();
    await wrapper.find('input[aria-label="minutes"]').setValue("30");
    await nextTick();
    expect(captured.values?.().dur).toBe("PT2H30M");
  });

  it("writes a day part with the T separator", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DurationInput, { source: "dur" }),
      { id: 1, dur: "" },
    );
    await flushPromises();
    await wrapper.find('input[aria-label="days"]').setValue("1");
    await nextTick();
    await wrapper.find('input[aria-label="hours"]').setValue("4");
    await nextTick();
    expect(captured.values?.().dur).toBe("P1DT4H");
  });

  it("writes null when all units are cleared", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DurationInput, { source: "dur" }),
      { id: 1, dur: "PT2H" },
    );
    await flushPromises();
    await wrapper.find('input[aria-label="hours"]').setValue("");
    await nextTick();
    expect(captured.values?.().dur).toBeNull();
  });

  it("only renders the requested units", async () => {
    const { wrapper } = mountInForm(
      () => h(DurationInput, { source: "dur", units: ["h"] }),
      { id: 1, dur: "" },
    );
    await flushPromises();
    expect(wrapper.find('input[aria-label="days"]').exists()).toBe(false);
    expect(wrapper.find('input[aria-label="seconds"]').exists()).toBe(false);
    expect(wrapper.find('input[aria-label="hours"]').exists()).toBe(true);
  });

  it("respects the disabled prop", async () => {
    const { wrapper } = mountInForm(
      () => h(DurationInput, { source: "dur", disabled: true }),
      { id: 1, dur: "PT2H" },
    );
    await flushPromises();
    expect(
      elementOf(
        wrapper.find('input[aria-label="hours"]').element,
        HTMLInputElement,
      ).disabled,
    ).toBe(true);
  });
});
