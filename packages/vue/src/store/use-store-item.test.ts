/**
 * `useStoreItem`: one key of the KV store as a ref and a setter. Mounted under
 * a real `<Admin>`; assertions are on DOM and the store.
 */

import {
  type CheloneStore,
  createStore,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import { useStoreItem } from "./use-store-item";

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

/** Counts live subscribers per key, so a test can see who is still listening. */
function countingStore(): { store: CheloneStore; live: Map<string, number> } {
  const inner = createStore();
  const live = new Map<string, number>();
  const store: CheloneStore = {
    ...inner,
    subscribe(key, callback) {
      live.set(key, (live.get(key) ?? 0) + 1);
      const unsubscribe = inner.subscribe(key, callback);
      return () => {
        live.set(key, (live.get(key) ?? 1) - 1);
        unsubscribe();
      };
    },
  };
  return { store, live };
}

function mountSetting(store: CheloneStore) {
  const renders = { count: 0 };
  let setOpen!: (value: boolean) => void;
  const Setting = defineComponent({
    setup() {
      const [open, set] = useStoreItem<boolean>("sidebar.open", true);
      setOpen = set;
      return () => {
        renders.count += 1;
        return h("p", { role: "status" }, String(open.value));
      };
    },
  });
  const queryClient = new QueryClient();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    props: { show: { type: Boolean, default: true } },
    setup(props) {
      return () =>
        h(
          Admin,
          { dataProvider: fakeDataProvider({}), queryClient, store },
          {
            default: () => (props.show ? h(Setting) : null),
            layout: () => h("div"),
          },
        );
    },
  });
  const wrapper = mount(Harness, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return { wrapper, renders, setOpen: (v: boolean) => setOpen(v) };
}

describe("useStoreItem", () => {
  it("reads the default, writes, and updates only on its own key", async () => {
    const store = createStore();
    const { wrapper, renders, setOpen } = mountSetting(store);
    const status = () => wrapper.get('[role="status"]').text();

    expect(status()).toBe("true");

    setOpen(false);
    await nextTick();
    expect(status()).toBe("false");
    expect(store.getItem("sidebar.open")).toBe(false);

    const rendersBefore = renders.count;
    store.setItem("sidebar.width", 240);
    await nextTick();
    expect(renders.count).toBe(rendersBefore);

    store.setItem("sidebar.open", true);
    await nextTick();
    expect(status()).toBe("true");
  });

  it("stops listening when its scope is disposed", async () => {
    const { store, live } = countingStore();
    const { wrapper } = mountSetting(store);
    expect(live.get("sidebar.open")).toBe(1);

    await wrapper.setProps({ show: false });
    expect(live.get("sidebar.open")).toBe(0);
  });
});
