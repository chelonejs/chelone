/**
 * V2-b INPUTS PROBE — end-to-end verification of the V2-b choice / array /
 * reference-array / file wave, driven ENTIRELY through the package barrel
 * (`@chelone/vue`'s `src/index.ts`), never a deep `./*.vue` path. That import
 * discipline is itself the test for requirement (4): every new choice/array/file
 * input component, its exported `*Props` type, AND the two foundational
 * composables (`useChoices`, `useArrayInput`) must resolve from the public
 * barrel, or this file fails to type-check / run.
 *
 * Coverage:
 *   (1) CHOICES — <SelectInput> renders one <option> per choice and selecting
 *       writes the value; the option text is the LABEL (`optionText`), not the
 *       raw id. <AutocompleteInput> filters by typed text and selects.
 *       <RadioButtonGroupInput> / <CheckboxGroupInput> set the (scalar / array)
 *       value.
 *   (2) MULTI/ARRAY — <SelectArrayInput> accumulates an array of values;
 *       <ArrayInput> adds two embedded rows then removes one (value array
 *       reflects); <ReferenceArrayInput> multi-selects referenced records.
 *   (3) FILE — <FileInput> selecting a file sets the value (native change,
 *       NOT react-dropzone).
 *   (4) COMPOSABLES — `useChoices` projects a choice to its label via a custom
 *       `optionText` formatter; `useArrayInput` drives add/remove over a bound
 *       array field. Both are imported from the barrel and exercised in `setup`.
 *
 * Mounted under a real `<Admin>` (Chelone context + vue-query + router adapter)
 * like the sibling `choice-inputs-v2b.test.ts` / `array-file-inputs-v2b.test.ts`.
 * jsdom applies no CSS: assert DOM structure/roles/values + behavior, never
 * visual styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
// --- BARREL IMPORTS ONLY (requirement 4) ----------------------------------
import {
  Admin,
  ArrayInput,
  type ArrayInputProps,
  AutocompleteArrayInput,
  type AutocompleteArrayInputProps,
  AutocompleteInput,
  type AutocompleteInputProps,
  CheckboxGroupInput,
  type CheckboxGroupInputProps,
  type ChoiceRecord,
  DatagridInput,
  type DatagridInputProps,
  FileInput,
  type FileInputProps,
  ImageInput,
  type ImageInputProps,
  NumberInput,
  RadioButtonGroupInput,
  type RadioButtonGroupInputProps,
  ReferenceArrayInput,
  type ReferenceArrayInputProps,
  SelectArrayInput,
  type SelectArrayInputProps,
  SelectInput,
  type SelectInputProps,
  TextInput,
  type UseArrayInputResult,
  type UseChoicesResult,
  type UseFormReturn,
  useArrayInput,
  useChoices,
  useForm,
} from "../../../index";

interface FormValues {
  id?: number;
  category?: unknown;
  color?: unknown;
  tags?: unknown;
  items?: unknown;
  tag_ids?: unknown;
  avatar?: unknown;
}

const CATEGORY_CHOICES = [
  { id: "tech", name: "Tech" },
  { id: "lifestyle", name: "Lifestyle" },
  { id: "people", name: "People" },
];

const TAG_RECORDS = [
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

interface Captured {
  form?: UseFormReturn<FormValues>;
  values?: () => Record<string, unknown>;
}

function mountInForm(
  render: () => unknown,
  {
    record,
    records = {},
  }: { record: FormValues; records?: Record<string, unknown[]> },
) {
  const captured: Captured = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = makeRouter();
  const dataProvider = fakeDataProvider(records);

  const FormHost = defineComponent({
    setup(_, { slots }) {
      const form = useForm<FormValues>({
        record,
        onSubmit: async () => undefined,
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

// --- (4a) barrel completeness ---------------------------------------------
describe("barrel exports (requirement 4)", () => {
  it("resolves every V2-b choice/array/file input from @chelone/vue", () => {
    for (const cmp of [
      SelectInput,
      SelectArrayInput,
      AutocompleteInput,
      AutocompleteArrayInput,
      CheckboxGroupInput,
      RadioButtonGroupInput,
      DatagridInput,
      ArrayInput,
      ReferenceArrayInput,
      FileInput,
      ImageInput,
    ]) {
      expect(cmp).toBeDefined();
    }
  });

  it("resolves the foundational composables from @chelone/vue", () => {
    expect(typeof useChoices).toBe("function");
    expect(typeof useArrayInput).toBe("function");
  });

  it("resolves every V2-b Props type from @chelone/vue (type-level)", () => {
    // Purely type-level: each imported Props type annotates a slot here, so if
    // any were missing from the barrel the `--typecheck` run would fail.
    const probes: {
      select?: SelectInputProps;
      selectArray?: SelectArrayInputProps;
      autocomplete?: AutocompleteInputProps;
      autocompleteArray?: AutocompleteArrayInputProps;
      checkbox?: CheckboxGroupInputProps;
      radio?: RadioButtonGroupInputProps;
      datagrid?: DatagridInputProps;
      array?: ArrayInputProps;
      referenceArray?: ReferenceArrayInputProps;
      file?: FileInputProps;
      image?: ImageInputProps;
    } = {};
    expect(probes).toBeDefined();
  });
});

// --- (1) CHOICES ----------------------------------------------------------
describe("choice inputs (requirement 1)", () => {
  it("<SelectInput> renders an option per choice, labels not ids, and selects", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(SelectInput, { source: "category", choices: CATEGORY_CHOICES }),
      { record: { id: 1, category: "lifestyle" } },
    );
    await flushPromises();

    const select = wrapper.find("select");
    // empty option + 3 choices.
    const options = select.findAll("option");
    expect(options).toHaveLength(4);
    // optionText renders the LABEL, never the raw id.
    const labelled = options.map((o) => o.text());
    expect(labelled).toContain("Tech");
    expect(labelled).not.toContain("tech");
    expect((select.element as HTMLSelectElement).value).toBe("lifestyle");

    await select.setValue("people");
    await nextTick();
    expect(captured.values?.().category).toBe("people");
  });

  it("<AutocompleteInput> filters by typed text and selects", async () => {
    const { wrapper, captured } = mountInForm(
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
    const filtered = wrapper.findAll('[role="option"]');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].text()).toContain("Lifestyle");

    await filtered[0].trigger("mousedown");
    await nextTick();
    expect(captured.values?.().category).toBe("lifestyle");
  });

  it("<RadioButtonGroupInput> sets the scalar value", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(RadioButtonGroupInput, {
          source: "category",
          choices: CATEGORY_CHOICES,
        }),
      { record: { id: 1 } },
    );
    await flushPromises();

    const tech = wrapper
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === "tech");
    await tech?.setValue();
    await nextTick();
    expect(captured.values?.().category).toBe("tech");
  });

  it("<CheckboxGroupInput> sets the array value", async () => {
    const { wrapper, captured } = mountInForm(
      () =>
        h(CheckboxGroupInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    const boxes = wrapper.findAll('input[type="checkbox"]');
    await boxes[0].setValue(true); // tech
    await nextTick();
    await boxes[2].setValue(true); // people
    await nextTick();
    expect(captured.values?.().tags).toEqual(["tech", "people"]);
  });
});

// --- (2) MULTI / ARRAY ----------------------------------------------------
describe("multi + array inputs (requirement 2)", () => {
  it("<SelectArrayInput> accumulates an array of values", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(SelectArrayInput, { source: "tags", choices: CATEGORY_CHOICES }),
      { record: { id: 1, tags: [] } },
    );
    await flushPromises();

    await wrapper.find('[role="combobox"]').trigger("click");
    await nextTick();
    const boxes = wrapper.findAll('input[type="checkbox"]');
    await boxes[1].setValue(true); // lifestyle
    await nextTick();
    await boxes[2].setValue(true); // people
    await nextTick();
    expect(captured.values?.().tags).toEqual(["lifestyle", "people"]);
  });

  it("<ArrayInput> adds two embedded rows then removes one", async () => {
    const rows = () =>
      h(
        ArrayInput,
        { source: "items" },
        {
          default: () => [
            h(TextInput, { source: "name" }),
            h(NumberInput, { source: "price" }),
          ],
        },
      );
    const { wrapper, captured } = mountInForm(rows, {
      record: { id: 1, items: [] },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(0);

    await wrapper.find('[data-slot="array-input-add"]').trigger("click");
    await nextTick();
    await wrapper.find('[data-slot="array-input-add"]').trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(2);
    expect(captured.values?.().items as unknown[]).toHaveLength(2);

    // Edit row 0's name, then remove row 0 — the surviving row is the second.
    const textInputs = wrapper.findAll('input[type="text"]');
    await textInputs[0].setValue("First");
    await nextTick();
    await textInputs[1].setValue("Second");
    await nextTick();

    const remove = wrapper.findAll('[data-slot="array-input-remove"]')[0];
    await remove.trigger("click");
    await nextTick();
    expect(wrapper.findAll('[data-slot="array-input-row"]')).toHaveLength(1);
    const items = captured.values?.().items as Array<{ name: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Second");
  });

  it("<ReferenceArrayInput> multi-selects referenced records", async () => {
    const { wrapper, captured } = mountInForm(
      () => h(ReferenceArrayInput, { source: "tag_ids", reference: "tags" }),
      { record: { id: 1, tag_ids: [] }, records: { tags: TAG_RECORDS } },
    );
    await flushPromises();
    await flushPromises();

    const input = wrapper.find('input[role="combobox"]');
    await input.trigger("focus");
    await nextTick();
    expect(wrapper.findAll('[role="option"]').length).toBe(3);

    const news = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("News"));
    await news?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().tag_ids).toEqual([2]);

    await input.trigger("focus");
    await nextTick();
    const tech = wrapper
      .findAll('[role="option"]')
      .find((o) => o.text().includes("Tech"));
    await tech?.trigger("mousedown");
    await nextTick();
    expect(captured.values?.().tag_ids).toEqual([2, 1]);
  });
});

// --- (3) FILE -------------------------------------------------------------
describe("file input (requirement 3)", () => {
  it("<FileInput> selecting a file sets the value via native change", async () => {
    const FilePreviewChild = defineComponent({
      setup() {
        return () => h("span", { class: "preview" }, "preview");
      },
    });
    const { wrapper, captured } = mountInForm(
      () =>
        h(
          FileInput,
          { source: "avatar" },
          { default: () => h(FilePreviewChild) },
        ),
      { record: { id: 1, avatar: null } },
    );
    await flushPromises();

    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
    const file = new File(["hello"], "hello.png", { type: "image/png" });
    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");
    await nextTick();

    const value = captured.values?.().avatar as { title?: string };
    expect(value?.title).toBe("hello.png");
  });
});

// --- (4b) composables in setup --------------------------------------------
describe("foundational composables (requirement 4)", () => {
  it("useChoices projects a choice to its label via a custom optionText", async () => {
    let accessors: UseChoicesResult | undefined;
    const Probe = defineComponent({
      setup() {
        accessors = useChoices({
          optionText: (c: ChoiceRecord) => `#${c.id as string}:${c.name}`,
        });
        return () => null;
      },
    });
    mountInForm(() => h(Probe), { record: { id: 1 } });
    await flushPromises();

    expect(accessors).toBeDefined();
    const choice = CATEGORY_CHOICES[0];
    expect(accessors?.getChoiceText(choice)).toBe("#tech:Tech");
    // value falls back to id.
    expect(accessors?.getChoiceValue(choice)).toBe("tech");
  });

  it("useArrayInput drives add/remove over a bound array field", async () => {
    let api: UseArrayInputResult | undefined;
    const Probe = defineComponent({
      setup() {
        api = useArrayInput({ source: "items" });
        return () => null;
      },
    });
    const { captured } = mountInForm(() => h(Probe), {
      record: { id: 1, items: [{ name: "seed" }] },
    });
    await flushPromises();

    expect(api).toBeDefined();
    expect(api?.total.value).toBe(1);

    api?.add({ name: "added" });
    await nextTick();
    expect(api?.total.value).toBe(2);
    expect((captured.values?.().items as unknown[]).length).toBe(2);

    api?.remove(0);
    await nextTick();
    expect(api?.total.value).toBe(1);
    const items = captured.values?.().items as Array<{ name: string }>;
    expect(items[0].name).toBe("added");
  });
});
