/**
 * Regression: Vue's type-based `defineProps<{ label?: string | false }>()` treats
 * a `string | false` prop as Boolean-inclusive, so an ABSENT `label` is coerced to
 * `false` by Vue's boolean-prop rule. Since every input's template does
 * `label === false ? null : (label ?? humanize(source))`, an absent label used to
 * read as "suppressed" and the humanized fallback label NEVER rendered.
 *
 * Fix: `withDefaults(defineProps<{…}>(), { label: undefined })` — an absent label
 * stays `undefined` (fallback renders); `label={false}` still hides it.
 *
 * This asserts, for every affected V1 input, BOTH halves of the contract:
 *   (a) no `label` prop  → the humanized fallback label renders,
 *   (b) `label={false}`  → the label is hidden.
 * (search-input is intentionally unlabelled — it throws on a label — so it is
 * excluded by design.)
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useForm } from "../../../form/use-form";
import BooleanInput from "./boolean-input.vue";
import ColorInput from "./color-input.vue";
import NullableBooleanInput from "./nullable-boolean-input.vue";
import NumberInput from "./number-input.vue";
import PasswordInput from "./password-input.vue";
import ReferenceInput from "./reference-input.vue";
import ResettableTextInput from "./resettable-text-input.vue";
import TextInput from "./text-input.vue";

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

function mountInForm(render: () => unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  // Seed an `authors` resource so <ReferenceInput reference="authors"> resolves.
  const dataProvider = fakeDataProvider({
    authors: [
      { id: 1, name: "Ada Lovelace" },
      { id: 2, name: "Alan Turing" },
    ],
  });

  const FormHost = defineComponent({
    setup(_, { slots }) {
      useForm<Record<string, unknown>>({
        record: { id: 1, title: "x", author_id: 1 },
        onSubmit: async () => undefined,
      });
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

  return mount(Harness, { global: { plugins: [router] } });
}

// source -> humanized label the fallback must produce.
const HUMANIZED = "Title";

// Each input renders a humanized <label> from `source` when no `label` is passed.
// ReferenceInput needs `reference`; the rest read `source` directly.
const CASES: Array<{ name: string; component: Component; props: object }> = [
  { name: "TextInput", component: TextInput, props: { source: "title" } },
  { name: "NumberInput", component: NumberInput, props: { source: "title" } },
  { name: "ColorInput", component: ColorInput, props: { source: "title" } },
  { name: "BooleanInput", component: BooleanInput, props: { source: "title" } },
  {
    name: "NullableBooleanInput",
    component: NullableBooleanInput,
    props: { source: "title" },
  },
  {
    name: "PasswordInput",
    component: PasswordInput,
    props: { source: "title" },
  },
  {
    name: "ResettableTextInput",
    component: ResettableTextInput,
    props: { source: "title" },
  },
  {
    name: "ReferenceInput",
    component: ReferenceInput,
    props: { source: "title", reference: "authors" },
  },
];

describe("label coercion fix (string | false absent -> undefined)", () => {
  for (const { name, component, props } of CASES) {
    it(`${name}: renders the humanized fallback label when no label prop is passed`, async () => {
      const wrapper = mountInForm(() => h(component, { ...props }));
      await flushPromises();
      const label = wrapper.find("label");
      expect(label.exists()).toBe(true);
      expect(label.text()).toContain(HUMANIZED);
    });

    it(`${name}: hides the label when label={false}`, async () => {
      const wrapper = mountInForm(() =>
        h(component, { ...props, label: false }),
      );
      await flushPromises();
      // Either no <label>, or none carrying the humanized fallback text.
      const labels = wrapper.findAll("label");
      const anyHumanized = labels.some((l) => l.text().includes(HUMANIZED));
      expect(anyHumanized).toBe(false);
    });
  }
});
