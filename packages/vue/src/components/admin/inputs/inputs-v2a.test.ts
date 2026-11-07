/**
 * V2-a input wave — the null-coercion papercut fix + the simple text inputs
 * ported from their `@chelone/react` twins (password, resettable-text, search,
 * color, nullable-boolean). Mounted under a real `<Admin>` (Chelone context +
 * vue-query + router adapter) exactly like `vertical.test.ts`. jsdom applies no
 * CSS: assert DOM structure/roles/values + behavior, never visual styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type UseFormOptions,
  type UseFormReturn,
  useForm,
} from "../../../form/use-form";
import ColorInput from "./color-input.vue";
import NullableBooleanInput from "./nullable-boolean-input.vue";
import PasswordInput from "./password-input.vue";
import ResettableTextInput from "./resettable-text-input.vue";
import SearchInput from "./search-input.vue";
import TextInput from "./text-input.vue";

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
  color?: unknown;
  is_published?: unknown;
  q?: unknown;
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

/**
 * Mount `render()` inside `<Admin>` + a `useForm` host. The form is seeded with
 * `record` and (optionally) validated against `schema`; `captured` exposes the
 * live values + the form handle (for submit).
 */
function mountInForm(
  render: () => unknown,
  {
    record,
    schema,
  }: {
    record: FormValues;
    schema?: UseFormOptions<FormValues>["schema"];
  },
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
        schema,
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
          { dataProvider, queryClient },
          {
            default: () => h(FormHost, null, { default: render }),
          },
        );
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, captured };
}

describe("<TextInput> stored values", () => {
  it("spells a stored number and renders a stored object as empty", async () => {
    const number = mountInForm(() => h(TextInput, { source: "title" }), {
      record: { id: 1, title: 5 },
    });
    await flushPromises();
    expect(
      elementOf(number.wrapper.find("input").element, HTMLInputElement).value,
    ).toBe("5");

    const object = mountInForm(() => h(TextInput, { source: "title" }), {
      record: { id: 1, title: { count: 5 } },
    });
    await flushPromises();
    expect(
      elementOf(object.wrapper.find("input").element, HTMLInputElement).value,
    ).toBe("");
  });
});

describe("null-coercion papercut", () => {
  it("a cleared required text input surfaces the .min(1) message, not the zod type error", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(TextInput, { source: "title" }),
      {
        record: { id: 1, title: "seed", author_id: 10, views: 0 },
        schema: postSchema,
      },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    // Clear the field: this runs `parse("")`, which must NOT coerce to null.
    await input.setValue("");
    await input.trigger("blur");
    await nextTick();

    await captured.form?.submit();
    await flushPromises();
    await nextTick();

    // The stored value is the empty STRING, not null — so zod's `.min(1)`
    // (a string refinement) runs and yields the friendly message rather than
    // the "Expected string, received null" type error.
    expect(captured.values?.().title).toBe("");
    const error = wrapper.find('[data-slot="field-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain("Title is required");
    expect(error.text()).not.toContain("Expected string");
  });
});

describe("<PasswordInput>", () => {
  it("renders a password input and toggles visibility", async () => {
    const { wrapper } = mountInForm(
      () => h(PasswordInput, { source: "password" }),
      { record: { id: 1, password: "s3cret", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find("input");
    expect(input.attributes("type")).toBe("password");
    expect(elementOf(input.element, HTMLInputElement).value).toBe("s3cret");

    // The reveal toggle flips the input type to text and back.
    const toggle = wrapper.find("button");
    await toggle.trigger("click");
    await nextTick();
    expect(wrapper.find("input").attributes("type")).toBe("text");
    await toggle.trigger("click");
    await nextTick();
    expect(wrapper.find("input").attributes("type")).toBe("password");
  });

  it("respects initiallyVisible", async () => {
    const { wrapper } = mountInForm(
      () => h(PasswordInput, { source: "password", initiallyVisible: true }),
      { record: { id: 1, password: "s3cret", author_id: 10, views: 0 } },
    );
    await flushPromises();
    expect(wrapper.find("input").attributes("type")).toBe("text");
  });
});

describe("<ResettableTextInput>", () => {
  it("clears the field value via the reset button", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(ResettableTextInput, { source: "title" }),
      { record: { id: 1, title: "War and Peace", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]');
    expect(elementOf(input.element, HTMLInputElement).value).toBe(
      "War and Peace",
    );

    // The clear button shows only when the field has a value.
    const clear = wrapper.find('button[data-slot="reset"]');
    expect(clear.exists()).toBe(true);
    await clear.trigger("click");
    await nextTick();

    // Reset writes "" (not null) so the field stays a controlled string.
    expect(captured.values?.().title).toBe("");
    expect(
      elementOf(wrapper.find('input[type="text"]').element, HTMLInputElement)
        .value,
    ).toBe("");
    // With no value, the clear button is gone.
    expect(wrapper.find('button[data-slot="reset"]').exists()).toBe(false);
  });

  it("puts the clear button in the input's own row, beside the input and nothing else", async () => {
    const { wrapper } = mountInForm(
      () => h(ResettableTextInput, { source: "title" }),
      { record: { id: 1, title: "War and Peace", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]').element;
    const clear = wrapper.find('button[data-slot="reset"]').element;
    // The row is what the button's `absolute` position resolves against, so it
    // must hold the input and the button alone: a label, helper text or error
    // above or below would shift the button off the input's centre.
    expect(clear.parentElement).toBe(input.parentElement);
    expect(input.parentElement?.querySelector("label")).toBeNull();
  });

  it("puts the clear button in the input's own row when the field has no label", async () => {
    const { wrapper } = mountInForm(
      () => h(ResettableTextInput, { source: "title", label: false }),
      { record: { id: 1, title: "War and Peace", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="text"]').element;
    const clear = wrapper.find('button[data-slot="reset"]').element;
    expect(clear.parentElement).toBe(input.parentElement);
  });
});

// Each subscribes to the form store, which hands back a `Subscription` object;
// passing that to `onScopeDispose` as the cleanup threw on unmount.
describe("form-store subscribers release on unmount", () => {
  it.each([
    ["ResettableTextInput", () => h(ResettableTextInput, { source: "title" })],
    ["SearchInput", () => h(SearchInput)],
  ])("<%s> unmounts without throwing", async (_, render) => {
    const { wrapper } = mountInForm(render, {
      record: { id: 1, title: "War and Peace", author_id: 10, views: 0 },
    });
    await flushPromises();
    expect(() => wrapper.unmount()).not.toThrow();
  });
});

describe("<SearchInput>", () => {
  it("renders an unlabelled search input on the q source and clears it", async () => {
    const { wrapper, captured } = mountInForm(() => h(SearchInput), {
      record: { id: 1, q: "hello", author_id: 10, views: 0 },
    });
    await flushPromises();

    const input = wrapper.find("input");
    expect(elementOf(input.element, HTMLInputElement).value).toBe("hello");
    // No label rendered (search is a filter affordance).
    expect(wrapper.find("label").exists()).toBe(false);

    await input.setValue("world");
    await nextTick();
    expect(captured.values?.().q).toBe("world");

    const clear = wrapper.find('button[data-slot="clear-search"]');
    expect(clear.exists()).toBe(true);
    await clear.trigger("click");
    await nextTick();
    expect(captured.values?.().q).toBe("");
  });

  it("throws when given a label prop", () => {
    expect(() =>
      mountInForm(() => h(SearchInput, { label: "Nope" }), {
        record: { id: 1, q: "", author_id: 10, views: 0 },
      }),
    ).toThrow(/label/);
  });
});

describe("<ColorInput>", () => {
  it("binds a color value and writes changes back", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(ColorInput, { source: "color" }),
      { record: { id: 1, color: "#3b82f6", author_id: 10, views: 0 } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="color"]');
    expect(input.exists()).toBe(true);
    expect(elementOf(input.element, HTMLInputElement).value).toBe("#3b82f6");

    await input.setValue("#22c55e");
    await nextTick();
    expect(captured.values?.().color).toBe("#22c55e");
  });

  it("falls back to #000000 when the field is empty", async () => {
    const { wrapper } = mountInForm(() => h(ColorInput, { source: "color" }), {
      record: { id: 1, author_id: 10, views: 0 },
    });
    await flushPromises();
    expect(
      elementOf(wrapper.find('input[type="color"]').element, HTMLInputElement)
        .value,
    ).toBe("#000000");
  });
});

describe("<NullableBooleanInput>", () => {
  it("maps between the tri-state select and the boolean|null field", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(NullableBooleanInput, { source: "is_published" }),
      { record: { id: 1, is_published: null, author_id: 10, views: 0 } },
    );
    await flushPromises();

    const select = wrapper.find("select");
    // null field → the empty/null option selected.
    expect(elementOf(select.element, HTMLSelectElement).value).toBe("");

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
});
