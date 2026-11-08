/**
 * `<SaveButton>` submits the ambient form and mirrors its submit gate. Mounted
 * under a real `<Admin>` inside `<Create>`, with a probe that wraps the form
 * store's `subscribe` so the test can see the subscription released.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { useCheloneFormContext } from "../../../form/form-context";
import TextInput from "../inputs/text-input.vue";
import Create from "../view/create.vue";
import SaveButton from "./save-button.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

const i18n = () =>
  createI18n({
    locale: "en",
    messages: { en: defineMessages({ "chelone.action.save": "Save" }) },
  });

interface Counts {
  subscribed: number;
  unsubscribed: number;
}

/** Wraps `form.ambient.store.subscribe` for every subscriber that mounts after it. */
const StoreProbe = (counts: Counts) =>
  defineComponent({
    setup() {
      const { form } = useCheloneFormContext();
      const subscribe = form.ambient.store.subscribe.bind(form.ambient.store);
      form.ambient.store.subscribe = (listener) => {
        counts.subscribed += 1;
        const subscription = subscribe(listener);
        return {
          unsubscribe: () => {
            counts.unsubscribed += 1;
            subscription.unsubscribe();
          },
        };
      };
      return () => null;
    },
  });

async function mountCreate(
  dataProvider: ReturnType<typeof fakeDataProvider>,
  toolbar: () => VNodeChild,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/posts/create");
  const view = defineComponent({
    setup: () => () =>
      h(
        Create,
        { resource: "posts" },
        {
          default: () => h(TextInput, { source: "title" }),
          toolbar,
        },
      ),
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider,
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            i18n: i18n(),
          },
          { default: () => h(Resource, { name: "posts", create: view }) },
        ),
    }),
    { attachTo: document.body, global: { plugins: [router] } },
  );
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

describe("<SaveButton>", () => {
  it("a SaveButton stops listening to the form store when it unmounts", async () => {
    const counts: Counts = { subscribed: 0, unsubscribed: 0 };
    const shown = ref(true);
    await mountCreate(fakeDataProvider({ posts: [] }), () => [
      h(StoreProbe(counts)),
      shown.value ? h(SaveButton) : null,
    ]);
    expect(counts.subscribed).toBeGreaterThan(0);
    expect(counts.unsubscribed).toBe(0);

    shown.value = false;
    await flushPromises();

    expect(counts.unsubscribed).toBe(counts.subscribed);
  });

  it("a SaveButton disables itself while the form is submitting", async () => {
    const base = fakeDataProvider({ posts: [] });
    let finish: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const dataProvider: typeof base = {
      ...base,
      create: async (resource, params) => {
        await gate;
        return base.create(resource, params);
      },
    };
    const wrapper = await mountCreate(dataProvider, () => [h(SaveButton)]);
    await wrapper.get("input").setValue("Hello");
    await flushPromises();
    const button = wrapper.get('[data-slot="save-button"]');
    expect(button.attributes("disabled")).toBeUndefined();

    await button.trigger("click");
    await flushPromises();
    expect(button.attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-slot="save-spinner"]').exists()).toBe(true);

    finish();
    await flushPromises();
    expect(wrapper.find('[data-slot="save-spinner"]').exists()).toBe(false);
  });
});
