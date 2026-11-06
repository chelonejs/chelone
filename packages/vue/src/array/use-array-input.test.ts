import { fakeDataProvider } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import {
  type UseFormOptions,
  type UseFormReturn,
  useForm,
} from "../form/use-form";
import {
  type UseArrayInputOptions,
  type UseArrayInputResult,
  useArrayInput,
} from "./use-array-input";

interface Order {
  id: number;
  tags: string[];
  items: { sku: string }[];
}

interface Capture {
  form?: UseFormReturn<Order>;
  array?: UseArrayInputResult;
}

function mountArray(
  formOptions: UseFormOptions<Order>,
  arrayOptions: UseArrayInputOptions,
) {
  const capture: Capture = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const ArrayProbe = defineComponent({
    setup() {
      capture.array = useArrayInput(arrayOptions);
      return () => null;
    },
  });
  const FormProbe = defineComponent({
    setup() {
      capture.form = useForm<Order>(formOptions);
      return () => h(ArrayProbe);
    },
  });
  const Provider = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: fakeDataProvider({}),
        queryClient,
      };
      provideCheloneContext(ctx);
      return () => h(FormProbe);
    },
  });
  mount(Provider);
  return { capture };
}

const array = (capture: Capture): UseArrayInputResult => {
  if (!capture.array) throw new Error("useArrayInput did not run");
  return capture.array;
};
const form = (capture: Capture): UseFormReturn<Order> => {
  if (!capture.form) throw new Error("useForm did not run");
  return capture.form;
};

const tagsOf = (capture: Capture): unknown =>
  form(capture).form.state.values.tags;

describe("useArrayInput", () => {
  const seed = (): UseFormOptions<Order> => ({
    record: { id: 1, tags: ["a", "b"], items: [{ sku: "x" }] },
    onSubmit: async () => undefined,
  });

  it("exposes the seeded rows with a stable-id shape", async () => {
    const { capture } = mountArray(seed(), { source: "tags" });
    await nextTick();
    const rows = array(capture).rows.value;
    expect(rows).toHaveLength(2);
    expect(array(capture).total.value).toBe(2);
    const first = defined(rows[0]);
    const second = defined(rows[1]);
    expect(first.name).toBe("tags[0]");
    expect(typeof first.id).toBe("string");
    expect(first.id).not.toBe(second.id);
  });

  it("add() appends a row and writes the array value through the form", async () => {
    const { capture } = mountArray(seed(), { source: "tags" });
    await nextTick();

    array(capture).add();
    await nextTick();

    expect(array(capture).rows.value).toHaveLength(3);
    expect(array(capture).total.value).toBe(3);
    // Scalar array mode → new item is ''.
    expect(tagsOf(capture)).toEqual(["a", "b", ""]);
  });

  it("remove() drops a row and keeps surviving row identity", async () => {
    const { capture } = mountArray(seed(), { source: "tags" });
    await nextTick();
    const before = array(capture).rows.value;

    array(capture).remove(0);
    await flushPromises();
    await nextTick();

    const after = array(capture).rows.value;
    expect(after).toHaveLength(1);
    // The row that WAS at index 1 keeps its id — identity travels the value.
    expect(defined(after[0]).id).toBe(defined(before[1]).id);
    expect(tagsOf(capture)).toEqual(["b"]);
  });

  it("reOrder() moves a row and its id travels with the value", async () => {
    const { capture } = mountArray(seed(), { source: "tags" });
    await nextTick();
    const before = array(capture).rows.value;

    array(capture).reOrder(0, 1);
    await nextTick();

    const after = array(capture).rows.value;
    expect(after.map((r) => r.id)).toEqual([
      defined(before[1]).id,
      defined(before[0]).id,
    ]);
    expect(tagsOf(capture)).toEqual(["b", "a"]);
  });

  it("add() in object mode nulls the first row's keys", async () => {
    const { capture } = mountArray(seed(), { source: "items" });
    await nextTick();

    array(capture).add();
    await nextTick();

    expect(form(capture).form.state.values.items).toEqual([
      { sku: "x" },
      { sku: null },
    ]);
  });

  it("scopes an array field's own path (getSource('') is the array)", async () => {
    const { capture } = mountArray(seed(), { source: "tags" });
    await nextTick();
    expect(array(capture).scope.getSource("")).toBe("tags");
    expect(array(capture).source).toBe("tags");
  });

  it("surfaces the array field's own validation error", async () => {
    const { capture } = mountArray(seed(), {
      source: "tags",
      validate: (value) =>
        Array.isArray(value) && value.length >= 3
          ? undefined
          : "chelone.too_short",
    });
    await nextTick();

    expect(array(capture).fieldState.error.value).toBeUndefined();

    await form(capture).submit();
    await flushPromises();
    await nextTick();

    expect(array(capture).fieldState.error.value).toBe("chelone.too_short");
    expect(array(capture).fieldState.invalid.value).toBe(true);
  });
});
