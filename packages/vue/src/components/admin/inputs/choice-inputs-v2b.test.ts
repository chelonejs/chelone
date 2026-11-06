/**
 * V2-b choice-input wave — the six choice inputs ported from their
 * `@chelone/react` twins (select, select-array, autocomplete, autocomplete-array,
 * checkbox-group, radio-button-group) over the T1 `useChoices` machinery. Each is
 * mounted under a real `<Admin>` + `useForm` host (as in `inputs-v2a.test.ts`)
 * with INLINE `choices` (the primary standalone path; the reference-wrapper path
 * shares the same `useChoiceInput` seam, exercised by the choices suite). jsdom
 * applies no CSS: assert DOM structure/roles/values + behavior, never styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
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
import AutocompleteArrayInput from "./autocomplete-array-input.vue";
import AutocompleteInput from "./autocomplete-input.vue";
import CheckboxGroupInput from "./checkbox-group-input.vue";
import RadioButtonGroupInput from "./radio-button-group-input.vue";
import SelectArrayInput from "./select-array-input.vue";
import SelectInput from "./select-input.vue";

interface FormValues {
  id?: number;
  category?: unknown;
  tags?: unknown;
  author_id?: unknown;
}

const CATEGORY_CHOICES = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

const NUM_CHOICES = [
  { id: 1, name: "One" },
  { id: 2, name: "Two" },
  { id: 3, name: "Three" },
];

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
          { default: () => h(FormHost, null, { default: render }) },
        );
    },
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, captured };
}

describe("<SelectInput>", () => {
  it("renders the choices as options and seeds the record value", async () => {
    const { wrapper } = mountInForm(
      () => h(SelectInput, { source: "category", choices: CATEGORY_CHOICES }),
      { record: { id: 1, category: "lifestyle" } },
    );
    await flushPromises();

    const select = wrapper.find("select");
    // The empty option + 3 choices.
    expect(select.findAll("option")).toHaveLength(4);
    expect(select.text()).toContain("Tech");
    expect(elementOf(select.element, HTMLSelectElement).value).toBe(
      "lifestyle",
    );
  });

  it("selecting an option writes the value", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(SelectInput, { source: "category", choices: CATEGORY_CHOICES }),
      { record: { id: 1 } },
    );
    await flushPromises();

    await wrapper.find("select").setValue("people");
    await nextTick();
    expect(captured.values?.().category).toBe("people");
  });

  it("preserves a numeric choice value's type on selection", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(SelectInput, { source: "author_id", choices: NUM_CHOICES }),
      { record: { id: 1 } },
    );
    await flushPromises();

    await wrapper.find("select").setValue("2");
    await nextTick();
    // Not the string "2" — the original numeric id.
    expect(captured.values?.().author_id).toBe(2);
  });

  it("surfaces a validation error when required and left empty", async () => {
    const schema = z.object({
      id: z.number(),
      category: z.string().min(1, "Category is required"),
    });
    const { wrapper, captured } = mountInForm(
      () =>
        h(SelectInput, {
          source: "category",
          choices: CATEGORY_CHOICES,
          validate: [(v: unknown) => (v ? undefined : "Category is required")],
        }),
      { record: { id: 1, category: "tech" }, schema },
    );
    await flushPromises();

    await wrapper.find("select").setValue(""); // the empty option
    await nextTick();
    await captured.form?.submit();
    await flushPromises();
    await nextTick();

    const err = wrapper.find('[data-slot="field-error"]');
    expect(err.exists()).toBe(true);
    expect(err.text()).toContain("Category is required");
  });
});

describe("<RadioButtonGroupInput>", () => {
  it("renders a radio per choice and checks the seeded value", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(RadioButtonGroupInput, {
          source: "category",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1, category: "people" } },
    );
    await flushPromises();

    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios).toHaveLength(3);
    const checked = defined(
      radios.find((r) => elementOf(r.element, HTMLInputElement).checked),
    );
    expect(elementOf(checked.element, HTMLInputElement).value).toBe("people");
  });

  it("selecting a radio writes the value", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(RadioButtonGroupInput, {
          source: "category",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1 } },
    );
    await flushPromises();

    const techRadio = defined(
      wrapper
        .findAll('input[type="radio"]')
        .find((r) => elementOf(r.element, HTMLInputElement).value === "tech"),
    );
    await techRadio.setValue();
    await nextTick();
    expect(captured.values?.().category).toBe("tech");
  });

  it("preserves numeric value type", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(RadioButtonGroupInput, { source: "author_id", choices: NUM_CHOICES }),
      { record: { id: 1 } },
    );
    await flushPromises();

    const two = defined(
      wrapper
        .findAll('input[type="radio"]')
        .find((r) => elementOf(r.element, HTMLInputElement).value === "2"),
    );
    await two.setValue();
    await nextTick();
    expect(captured.values?.().author_id).toBe(2);
  });
});

describe("<CheckboxGroupInput>", () => {
  it("renders a checkbox per choice and checks the seeded array", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(CheckboxGroupInput, {
          source: "tags",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1, tags: ["tech", "people"] } },
    );
    await flushPromises();

    const boxes = wrapper.findAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(3);
    const checkedValues = boxes
      .filter((b) => elementOf(b.element, HTMLInputElement).checked)
      .map((b) => b.attributes("id"));
    expect(checkedValues).toHaveLength(2);
  });

  it("toggling checkboxes accumulates an array", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CheckboxGroupInput, {
          source: "tags",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    const boxes = wrapper.findAll('input[type="checkbox"]');
    await defined(boxes[0]).setValue(true); // tech
    await nextTick();
    await defined(boxes[2]).setValue(true); // people
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech", "people"]);

    await defined(boxes[0]).setValue(false); // untoggle tech
    await nextTick();
    expect(captured.values?.().tags).toEqual(["people"]);
  });

  it("surfaces a validation error", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CheckboxGroupInput, {
          source: "tags",
          choices: CATEGORY_CHOICES,
          validate: [
            (v: unknown) =>
              Array.isArray(v) && v.length > 0
                ? undefined
                : "Pick at least one",
          ],
        }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    await captured.form?.submit();
    await flushPromises();
    await nextTick();

    const err = wrapper.find('[data-slot="field-error"]');
    expect(err.exists()).toBe(true);
    expect(err.text()).toContain("Pick at least one");
  });
});

describe("<SelectArrayInput>", () => {
  it("shows selected badges and toggles the option list open", async () => {
    const { wrapper } = mountInForm(
      () => h(SelectArrayInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: ["tech"] } },
    );
    await flushPromises();

    // The trigger badge reflects the seeded selection.
    expect(wrapper.find('[role="combobox"]').text()).toContain("Tech");
    // Closed initially: no listbox.
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    await wrapper.find('[role="combobox"]').trigger("click");
    await nextTick();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(3);
  });

  it("checking options accumulates an array", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(SelectArrayInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    await wrapper.find('[role="combobox"]').trigger("click");
    await nextTick();
    const boxes = wrapper.findAll('input[type="checkbox"]');
    await defined(boxes[1]).setValue(true); // lifestyle
    await nextTick();
    expect(captured.values?.().tags).toEqual(["lifestyle"]);
    await defined(boxes[2]).setValue(true); // people
    await nextTick();
    expect(captured.values?.().tags).toEqual(["lifestyle", "people"]);
  });
});

describe("<AutocompleteInput>", () => {
  it("opens on focus and filters options by typed text", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(AutocompleteInput, { source: "category", choices: CATEGORY_CHOICES }),
      { record: { id: 1 } },
    );
    await flushPromises();

    const input = wrapper.find('input[role="combobox"]');
    await input.trigger("focus");
    await nextTick();
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3);

    await input.setValue("life");
    await input.trigger("input");
    await nextTick();
    const opts = wrapper.findAll('[role="option"]');
    expect(opts).toHaveLength(1);
    expect(defined(opts[0]).text()).toContain("Lifestyle");
  });

  it("selecting an option writes the value and closes the list", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(AutocompleteInput, { source: "category", choices: CATEGORY_CHOICES }),
      { record: { id: 1 } },
    );
    await flushPromises();

    await wrapper.find('input[role="combobox"]').trigger("focus");
    await nextTick();
    const people = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("People"));
    await people?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().category).toBe("people");
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });
});

describe("<AutocompleteArrayInput>", () => {
  it("appends selected choices as an array and renders removable badges", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(AutocompleteArrayInput, {
          source: "tags",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    const input = wrapper.find('input[role="combobox"]');
    await input.trigger("focus");
    await nextTick();
    // The dropdown lists all unselected choices.
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3);

    const tech = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("Tech"));
    await tech?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech"]);

    // Selected choice leaves the dropdown; a removable badge appears.
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2);

    const people = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("People"));
    await people?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech", "people"]);
  });

  it("removing a badge drops that value", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(AutocompleteArrayInput, {
          source: "tags",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1, tags: ["tech", "people"] } },
    );
    await flushPromises();

    // Two selected badges, each with a remove button.
    const removeButtons = wrapper.findAll("button");
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);
    await defined(removeButtons[0]).trigger("click");
    await nextTick();
    expect(captured.values?.().tags).toEqual(["people"]);
  });
});
