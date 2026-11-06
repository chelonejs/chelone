/**
 * `<ArrayInput>` iterator options — add, remove, reorder and a confirmed clear,
 * the Vue twin of `@chelone/react`'s `<SimpleFormIterator>`. Mounted under a
 * real `<Admin>` + `useForm` host; asserted through DOM, roles and form values.
 */

import { fakeDataProvider } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideArrayInput, useArrayInput } from "../../../array";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import ArrayInput from "./array-input.vue";
import ArrayInputRow from "./array-input-row.vue";
import TextInput from "./text-input.vue";

/** One `<ArrayInput>` row the harness seeds. */
interface Row {
  sku: string;
}

interface FormValues {
  id?: number;
  items?: Row[];
}

const THREE = [{ sku: "a" }, { sku: "b" }, { sku: "c" }];

function mountInForm(render: () => unknown, record: FormValues) {
  let form: UseFormReturn<FormValues> | undefined;
  const FormHost = defineComponent({
    setup(_, { slots }) {
      form = useForm<FormValues>({ record, onSubmit: async () => undefined });
      return () => slots.default?.();
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          {
            default: () => h(FormHost, null, { default: render }),
            layout: () => h("div"),
          },
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: {
      plugins: [
        createRouter({
          history: createMemoryHistory(),
          routes: [{ path: "/", component: { render: () => null } }],
        }),
      ],
    },
  });
  return {
    wrapper,
    items: () => defined(form?.values.value.items),
  };
}

function arrayInput(props: Record<string, unknown>, slots = {}) {
  return () =>
    h(
      ArrayInput,
      { source: "items", ...props },
      { default: () => h(TextInput, { source: "sku" }), ...slots },
    );
}

const rowCount = (w: { findAll: (s: string) => unknown[] }) =>
  w.findAll('[data-slot="array-input-row"]').length;

let mounted: { unmount(): void } | undefined;
afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

describe("ArrayInput iterator options", () => {
  it("ArrayInput clear asks for confirmation and empties the array only on confirm", async () => {
    const { wrapper, items } = mountInForm(arrayInput({}), {
      id: 1,
      items: THREE,
    });
    mounted = wrapper;
    await flushPromises();

    await wrapper.find('[data-slot="array-input-clear"]').trigger("click");
    expect(wrapper.find('[role="alertdialog"]').text()).toContain(
      "Are you sure you want to clear the whole array?",
    );

    await wrapper.find('[data-slot="confirm-cancel"]').trigger("click");
    await nextTick();
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
    expect(items()).toHaveLength(3);

    await wrapper.find('[data-slot="array-input-clear"]').trigger("click");
    await wrapper.find('[data-slot="confirm-accept"]').trigger("click");
    await nextTick();
    expect(items()).toHaveLength(0);
    expect(rowCount(wrapper)).toBe(0);
    expect(wrapper.find('[data-slot="array-input-clear"]').exists()).toBe(
      false,
    );
  });

  it("ArrayInput disableAdd, disableRemove, disableReordering and disabled hide their controls", async () => {
    const mountWith = async (props: Record<string, unknown>) => {
      mounted?.unmount();
      const { wrapper } = mountInForm(arrayInput(props), {
        id: 1,
        items: THREE,
      });
      mounted = wrapper;
      await flushPromises();
      return wrapper;
    };
    const has = (w: Awaited<ReturnType<typeof mountWith>>, slot: string) =>
      w.find(`[data-slot="${slot}"]`).exists();
    const moveUp = (w: Awaited<ReturnType<typeof mountWith>>) =>
      w.find('button[aria-label="Move up"]').exists();

    let w = await mountWith({});
    expect(has(w, "array-input-add")).toBe(true);
    expect(has(w, "array-input-remove")).toBe(true);
    expect(has(w, "array-input-clear")).toBe(true);
    expect(moveUp(w)).toBe(true);

    w = await mountWith({ disableAdd: true });
    expect(has(w, "array-input-add")).toBe(false);
    expect(has(w, "array-input-clear")).toBe(true);

    w = await mountWith({ disableRemove: true });
    expect(has(w, "array-input-remove")).toBe(false);
    expect(has(w, "array-input-clear")).toBe(false);
    expect(has(w, "array-input-add")).toBe(true);

    w = await mountWith({ disableClear: true });
    expect(has(w, "array-input-clear")).toBe(false);
    expect(has(w, "array-input-remove")).toBe(true);

    w = await mountWith({ disableReordering: true });
    expect(moveUp(w)).toBe(false);
    expect(has(w, "array-input-remove")).toBe(true);

    w = await mountWith({ disabled: true });
    expect(has(w, "array-input-add")).toBe(false);
    expect(has(w, "array-input-clear")).toBe(false);
    expect(has(w, "array-input-remove")).toBe(false);
    expect(moveUp(w)).toBe(false);
    expect(rowCount(w)).toBe(3);
  });

  it("ArrayInput disableRemove as a function hides remove for matching rows only", async () => {
    const { wrapper, items } = mountInForm(
      arrayInput({ disableRemove: (index: number) => index === 0 }),
      { id: 1, items: THREE },
    );
    mounted = wrapper;
    await flushPromises();

    const rows = wrapper.findAll('[data-slot="array-input-row"]');
    expect(rows[0]?.find('[data-slot="array-input-remove"]').exists()).toBe(
      false,
    );
    expect(rows[1]?.find('[data-slot="array-input-remove"]').exists()).toBe(
      true,
    );
    // A function can't promise every row is removable, so clear is hidden.
    expect(wrapper.find('[data-slot="array-input-clear"]').exists()).toBe(
      false,
    );

    await rows[1]?.find('[data-slot="array-input-remove"]').trigger("click");
    await nextTick();
    expect(items().map((i) => i.sku)).toEqual(["a", "c"]);
  });

  it("ArrayInput getItemLabel renders a label per row", async () => {
    const labels = (w: { findAll: (s: string) => Array<{ text(): string }> }) =>
      w.findAll('[data-slot="array-input-row-label"]').map((el) => el.text());

    const numbered = mountInForm(arrayInput({ getItemLabel: true }), {
      id: 1,
      items: THREE,
    });
    mounted = numbered.wrapper;
    await flushPromises();
    expect(labels(numbered.wrapper)).toEqual(["1", "2", "3"]);

    mounted.unmount();
    const custom = mountInForm(
      arrayInput({ getItemLabel: (i: number) => `Line ${i + 1}` }),
      { id: 1, items: THREE },
    );
    mounted = custom.wrapper;
    await flushPromises();
    expect(labels(custom.wrapper)).toEqual(["Line 1", "Line 2", "Line 3"]);

    mounted.unmount();
    const none = mountInForm(arrayInput({}), { id: 1, items: THREE });
    mounted = none.wrapper;
    await flushPromises();
    expect(labels(none.wrapper)).toEqual([]);
  });

  it("ArrayInput add-button and remove-button slots replace the defaults", async () => {
    const { wrapper, items } = mountInForm(
      arrayInput(
        {},
        {
          "add-button": ({ add }: { add: () => void }) =>
            h("button", { "data-test": "my-add", onClick: add }, "Plus"),
          "remove-button": ({
            index,
            remove,
          }: {
            index: number;
            remove: () => void;
          }) =>
            h(
              "button",
              { "data-test": "my-remove", onClick: remove },
              `Drop ${index}`,
            ),
        },
      ),
      { id: 1, items: THREE },
    );
    mounted = wrapper;
    await flushPromises();

    expect(wrapper.find('[data-slot="array-input-add"]').exists()).toBe(false);
    expect(wrapper.find('[data-slot="array-input-remove"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.findAll('[data-test="my-remove"]').map((el) => el.text()),
    ).toEqual(["Drop 0", "Drop 1", "Drop 2"]);

    await wrapper.findAll('[data-test="my-remove"]')[1]?.trigger("click");
    await nextTick();
    expect(items().map((i) => i.sku)).toEqual(["a", "c"]);

    await wrapper.find('[data-test="my-add"]').trigger("click");
    await nextTick();
    expect(items()).toHaveLength(3);
  });

  it("ArrayInput reorder-buttons slot gets the row index and a reOrder to a target index", async () => {
    const { wrapper, items } = mountInForm(
      arrayInput(
        {},
        {
          "reorder-buttons": ({
            index,
            reOrder,
          }: {
            index: number;
            reOrder: (to: number) => void;
          }) =>
            h(
              "button",
              { "data-test": "to-top", onClick: () => reOrder(0) },
              `Top ${index}`,
            ),
        },
      ),
      { id: 1, items: THREE },
    );
    mounted = wrapper;
    await flushPromises();

    expect(wrapper.find('button[aria-label="Move up"]').exists()).toBe(false);
    await wrapper.findAll('[data-test="to-top"]')[2]?.trigger("click");
    await nextTick();
    expect(items().map((i) => i.sku)).toEqual(["c", "a", "b"]);
  });

  it("ArrayInputRow takes the row options when used on its own", async () => {
    const Host = defineComponent({
      setup() {
        const array = useArrayInput({ source: "items" });
        provideArrayInput(array);
        return () =>
          array.rows.value.map((row) =>
            h(
              ArrayInputRow,
              {
                key: row.id,
                row,
                disableReordering: true,
                disableRemove: (index: number) => index === 1,
                getItemLabel: (index: number) => `Row ${index}`,
                inline: true,
              },
              { default: () => h(TextInput, { source: "sku" }) },
            ),
          );
      },
    });
    const { wrapper } = mountInForm(() => h(Host), {
      id: 1,
      items: THREE.slice(0, 2),
    });
    mounted = wrapper;
    await flushPromises();

    const rows = wrapper.findAll('[data-slot="array-input-row"]');
    expect(rows).toHaveLength(2);
    expect(
      rows.map((r) => r.find('[data-slot="array-input-row-label"]').text()),
    ).toEqual(["Row 0", "Row 1"]);
    expect(wrapper.find('button[aria-label="Move up"]').exists()).toBe(false);
    expect(rows[0]?.find('[data-slot="array-input-remove"]').exists()).toBe(
      true,
    );
    expect(rows[1]?.find('[data-slot="array-input-remove"]').exists()).toBe(
      false,
    );
  });
});
