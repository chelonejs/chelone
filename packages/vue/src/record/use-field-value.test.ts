/**
 * `useFieldValue({ source, record?, defaultValue? })` — the Vue twin of
 * `@chelone/react`'s `record/use-field-value.tsx`. Each case mounts a probe
 * under a provided record context and asserts the value the composable reads,
 * plus the DOM it re-renders when the ambient record ref changes.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  type ComputedRef,
  defineComponent,
  h,
  nextTick,
  type Ref,
  ref,
} from "vue";
import { provideRecordContext, type RecordValue } from "./record-context";
import { type UseFieldValueOptions, useFieldValue } from "./use-field-value";

/**
 * Mount `useFieldValue(options)` under a record context whose ambient record is
 * `ambient` — a bare record or a `Ref`, which is what a controller publishes.
 * `read()` returns the composable's current value.
 */
function mountFieldValue(
  options: UseFieldValueOptions,
  ambient: RecordValue | Ref<RecordValue>,
): { wrapper: VueWrapper; read: () => unknown } {
  const captured: { value?: ComputedRef<unknown> } = {};
  const Probe = defineComponent({
    setup() {
      captured.value = useFieldValue(options);
      return () =>
        h(
          "span",
          { "data-slot": "field-value" },
          String(captured.value?.value),
        );
    },
  });
  const Harness = defineComponent({
    setup() {
      provideRecordContext(ambient);
      return () => h(Probe);
    },
  });
  return { wrapper: mount(Harness), read: () => captured.value?.value };
}

describe("useFieldValue", () => {
  it("reads a dotted source off the ambient record", () => {
    const { read } = mountFieldValue(
      { source: "author.name" },
      { id: 1, author: { name: "Ada" } },
    );
    expect(read()).toBe("Ada");
  });

  it("reads a key that contains a dot as a flat key", () => {
    // A record that literally holds a "nested.level" key (a flattened payload)
    // wins over splitting the source, as in lodash/get.
    const { read } = mountFieldValue(
      { source: "nested.level" },
      { id: 1, "nested.level": "flat", nested: { level: "split" } },
    );
    expect(read()).toBe("flat");
  });

  it("bracket and dot index read the same value", () => {
    const record = { id: 1, tags: [{ label: "a" }, { label: "b" }] };
    const { read: bracket } = mountFieldValue(
      { source: "tags[1].label" },
      record,
    );
    const { read: dot } = mountFieldValue({ source: "tags.1.label" }, record);
    expect(bracket()).toBe("b");
    expect(dot()).toBe("b");
  });

  it("defaultValue replaces only undefined", () => {
    expect(
      mountFieldValue({ source: "gone", defaultValue: "D" }, { id: 1 }).read(),
    ).toBe("D");
    expect(
      mountFieldValue(
        { source: "n", defaultValue: "D" },
        { id: 1, n: null },
      ).read(),
    ).toBeNull();
    expect(
      mountFieldValue(
        { source: "n", defaultValue: 99 },
        { id: 1, n: 0 },
      ).read(),
    ).toBe(0);
    expect(
      mountFieldValue(
        { source: "flag", defaultValue: true },
        { id: 1, flag: false },
      ).read(),
    ).toBe(false);
    expect(
      mountFieldValue(
        { source: "s", defaultValue: "D" },
        { id: 1, s: "" },
      ).read(),
    ).toBe("");
  });

  it("a record ref that changes recomputes the value", async () => {
    const record = ref<RecordValue>({ id: 1, title: "first" });
    const { wrapper, read } = mountFieldValue({ source: "title" }, record);
    expect(wrapper.get('[data-slot="field-value"]').text()).toBe("first");

    record.value = { id: 2, title: "second" };
    await nextTick();

    expect(read()).toBe("second");
    expect(wrapper.get('[data-slot="field-value"]').text()).toBe("second");
  });
});
