/**
 * `<NumberInput>` hands `min`, `max` and `step` to its native `<input
 * type="number">`, as the React twin does, so a spinner steps by `step` and the
 * browser enforces the bounds. Before, they fell through to the `<Field>` wrapper.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useForm } from "../../../form/use-form";
import NumberInput from "./number-input.vue";

function mountNumberInput(props: {
  min?: number;
  max?: number;
  step?: number;
}) {
  const FormHost = defineComponent({
    setup() {
      useForm<{ total?: number }>({
        record: { total: 5 },
        onSubmit: async () => undefined,
      });
      return () => h(NumberInput, { source: "total", ...props });
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          { default: () => h(FormHost) },
        ),
    }),
    { global: { plugins: [router] } },
  );
}

describe("NumberInput constraints", () => {
  it("puts min, max and step on the number input", async () => {
    const wrapper = mountNumberInput({ min: 0, max: 100, step: 0.01 });
    await flushPromises();
    const input = wrapper.get('input[type="number"]');
    expect(input.attributes("min")).toBe("0");
    expect(input.attributes("max")).toBe("100");
    expect(input.attributes("step")).toBe("0.01");
  });

  it("leaves the wrapper free of the constraint attributes", async () => {
    const wrapper = mountNumberInput({ min: 1 });
    await flushPromises();
    expect(wrapper.find('[data-slot="field"][min]').exists()).toBe(false);
    expect(
      wrapper.get('input[type="number"]').attributes("max"),
    ).toBeUndefined();
  });
});
