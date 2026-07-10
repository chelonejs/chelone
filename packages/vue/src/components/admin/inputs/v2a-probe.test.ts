/**
 * V2-a INPUTS PROBE — end-to-end verification of the V2-a input wave, driven
 * ENTIRELY through the package barrel (`@chelone/vue`'s `src/index.ts`), never a
 * deep `./*.vue` path. That import discipline is itself the test for requirement
 * (3): every new input component + its exported `*Props` type must resolve from
 * the public barrel, or this file fails to type-check / run.
 *
 * Coverage:
 *   (1) the null-coercion papercut — a cleared required `<TextInput>` bound to a
 *       `z.string().min(1, "…")` schema surfaces the FRIENDLY message, not zod's
 *       "Expected string, received null" type error, and save is blocked.
 *   (2) a sample of the new inputs render + two-way bind through `useInput`:
 *       password (masks + reveal), nullable-boolean (tri-state null/true/false),
 *       date (ISO round-trip), phone (E.164), text-array (add/remove rows),
 *       rating (star pick). Each asserts the value round-trips into the form.
 *   (3) barrel completeness — every V2-a input + its Props is imported below
 *       from `@chelone/vue` and asserted defined (components) / type-used (Props).
 *
 * Mounted under a real `<Admin>` (Chelone context + vue-query + router adapter)
 * like the sibling `inputs-v2a*.test.ts`. jsdom applies no CSS: assert DOM
 * structure/roles/values + behavior, never visual styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
// --- BARREL IMPORTS ONLY (requirement 3) ----------------------------------
// Admin + form composable off the public surface.
import {
  Admin,
  // every V2-a input component
  ApiKeyInput,
  // every V2-a exported Props type
  type ApiKeyInputProps,
  ColorInput,
  CronInput,
  type CronInputProps,
  CurrencyInput,
  DateInput,
  DateTimeInput,
  DurationInput,
  NullableBooleanInput,
  PasswordInput,
  PhoneInput,
  RatingInput,
  type RatingInputProps,
  ResettableTextInput,
  SearchInput,
  TextArrayInput,
  type TextArrayInputProps,
  TextInput,
  TimeInput,
  type UseFormReturn,
  useForm,
  type WebhookEndpoint,
  WebhookEndpointInput,
  type WebhookEndpointInputProps,
} from "../../../index";

const postSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  author_id: z.number(),
  views: z.number(),
});

interface FormValues {
  id?: number;
  title?: unknown;
  author_id?: number;
  views?: number;
  password?: unknown;
  is_published?: unknown;
  published_at?: unknown;
  phone?: unknown;
  tags?: unknown;
  rating?: unknown;
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

interface Captured {
  form?: UseFormReturn<FormValues>;
  values?: () => Record<string, unknown>;
  /** Every payload `onSubmit` actually received — empty ⇒ save was blocked. */
  saves: unknown[];
}

function mountInForm(
  render: () => unknown,
  { record, schema }: { record: FormValues; schema?: typeof postSchema },
) {
  const captured: Captured = { saves: [] };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const dataProvider = fakeDataProvider({});

  const FormHost = defineComponent({
    setup(_, { slots }) {
      const form = useForm<FormValues>({
        record,
        schema: schema as never,
        // Records reaching `onSubmit` means validation passed and save fired.
        onSubmit: async (data) => {
          captured.saves.push(data);
          return undefined;
        },
      });
      captured.form = form;
      captured.values = () => form.values.value as Record<string, unknown>;
      return () => slots.default?.();
    },
  });

  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          { default: () => h(FormHost, null, { default: render }) },
        );
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, captured };
}

// --- (3) barrel completeness ----------------------------------------------
describe("barrel exports (requirement 3)", () => {
  it("resolves every V2-a input component from @chelone/vue", () => {
    for (const cmp of [
      TextInput,
      PasswordInput,
      ResettableTextInput,
      SearchInput,
      ColorInput,
      NullableBooleanInput,
      DateInput,
      DateTimeInput,
      TimeInput,
      PhoneInput,
      CurrencyInput,
      DurationInput,
      TextArrayInput,
      CronInput,
      RatingInput,
      WebhookEndpointInput,
      ApiKeyInput,
    ]) {
      expect(cmp).toBeDefined();
    }
  });

  it("resolves every V2-a Props type from @chelone/vue (type-level)", () => {
    // Purely type-level usage: each imported Props type annotates a slot here, so
    // if any were missing from the barrel the `--typecheck` run would fail.
    const probes: {
      apiKey?: ApiKeyInputProps;
      cron?: CronInputProps;
      rating?: RatingInputProps;
      textArray?: TextArrayInputProps;
      webhookInput?: WebhookEndpointInputProps;
      webhook?: WebhookEndpoint;
    } = {};
    expect(probes).toBeDefined();
  });
});

// --- (1) the coercion papercut --------------------------------------------
describe("null-coercion papercut (requirement 1)", () => {
  it("a cleared required text input surfaces the custom .min(1) message, not the zod type error, and blocks save", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextInput, { source: "title" }),
      {
        record: { id: 1, title: "seed", author_id: 10, views: 0 },
        schema: postSchema,
      },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("");
    await input.trigger("blur");
    await nextTick();

    await captured.form?.submit();
    await flushPromises();
    await nextTick();

    // Stored value is the empty STRING (identity parse), so zod's `.min(1)`
    // string refinement runs and yields the FRIENDLY message.
    expect(captured.values?.().title).toBe("");
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Title is required");
    expect(error.text()).not.toContain("Expected string");
    expect(error.text()).not.toContain("received null");

    // Save is blocked: an invalid submit never reaches `onSubmit`.
    expect(captured.saves).toHaveLength(0);
  });

  it("save proceeds once the required field is filled with a valid string", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextInput, { source: "title" }),
      {
        record: { id: 1, title: "seed", author_id: 10, views: 0 },
        schema: postSchema,
      },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("A real title");
    await input.trigger("blur");
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    await nextTick();

    expect(captured.values?.().title).toBe("A real title");
    expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    // Save proceeds: a valid submit reaches `onSubmit` exactly once.
    expect(captured.saves).toHaveLength(1);
  });
});

// --- (2) sample inputs render + two-way bind ------------------------------
describe("sample inputs round-trip through useInput (requirement 2)", () => {
  it("<PasswordInput> masks the value and toggles reveal", async () => {
    const { wrapper } = mountInForm(
      () => h(PasswordInput, { source: "password" }),
      { record: { id: 1, password: "s3cret", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find("input");
    expect(input.attributes("type")).toBe("password");
    expect((input.element as HTMLInputElement).value).toBe("s3cret");

    const toggle = wrapper.find("button");
    await toggle.trigger("click");
    await nextTick();
    expect(wrapper.find("input").attributes("type")).toBe("text");
    await toggle.trigger("click");
    await nextTick();
    expect(wrapper.find("input").attributes("type")).toBe("password");
  });

  it("<NullableBooleanInput> maps the tri-state select to null/true/false", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(NullableBooleanInput, { source: "is_published" }),
      { record: { id: 1, is_published: null, author_id: 10, views: 0 } },
    );
    await flushPromises();

    const select = wrapper.find("select");
    expect((select.element as HTMLSelectElement).value).toBe("");

    await select.setValue("true");
    await nextTick();
    expect(captured.values?.().is_published).toBe(true);

    await select.setValue("false");
    await nextTick();
    expect(captured.values?.().is_published).toBe(false);

    await select.setValue("");
    await nextTick();
    expect(captured.values?.().is_published).toBeNull();
  });

  it("<DateInput> round-trips an ISO/bare date string", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(DateInput, { source: "published_at" }),
      {
        record: {
          id: 1,
          published_at: "2021-09-11T20:00:00.000Z",
          author_id: 10,
          views: 0,
        },
      },
    );
    await flushPromises();

    const input = wrapper.find('input[type="date"]');
    // ISO datetime is formatted down to a bare date for the control.
    expect((input.element as HTMLInputElement).value).toBe("2021-09-11");

    await input.setValue("2021-10-20");
    await nextTick();
    expect(captured.values?.().published_at).toBe("2021-10-20");
  });

  it("<PhoneInput> stores E.164 from a typed national number", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(PhoneInput, { source: "phone", defaultCountry: "US" }),
      { record: { id: 1, phone: "", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="tel"]');
    await input.setValue("4155552671");
    await nextTick();
    expect(captured.values?.().phone).toBe("+14155552671");
  });

  it("<TextArrayInput> adds and removes rows, writing the array back", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextArrayInput, { source: "tags" }),
      { record: { id: 1, tags: ["a"], author_id: 10, views: 0 } },
    );
    await flushPromises();

    // add "b" via Enter
    const input = wrapper.find("input");
    await input.setValue("b");
    await input.trigger("keydown", { key: "Enter" });
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().tags).toEqual(["a", "b"]);

    // remove the first tag ("a") via its remove button
    const removeButtons = wrapper.findAll("span button");
    await removeButtons[0]?.trigger("click");
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().tags).toEqual(["b"]);
  });

  it("<RatingInput> writes the picked star value back to the form", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(RatingInput, { source: "rating" }),
      { record: { id: 1, rating: 0, author_id: 10, views: 0 } },
    );
    await flushPromises();

    const stars = wrapper.findAll('[role="radio"]');
    expect(stars.length).toBe(5);
    await stars[3]?.trigger("click");
    await nextTick();
    expect(stars[3]?.attributes("aria-checked")).toBe("true");
    await captured.form?.submit();
    await flushPromises();
    expect(captured.values?.().rating).toBe(4);
  });
});
