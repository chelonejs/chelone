/**
 * The mount the chart tests share: a chart inside `<Admin>`, the way a demo
 * dashboard mounts it. `<Admin>` supplies the Chelone context, the query client
 * and the router adapter, so the chart reads the same seams an app gives it.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";

/** A router that matches anything, so `<Admin>` has one to install. */
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/:pathMatch(.*)*",
        component: defineComponent({ render: () => null }),
      },
    ],
  });
}

/**
 * Mount `render()` as `<Admin>`'s default slot. Attached to the document so
 * unovis can measure it: the test gives every element a size through
 * `getBoundingClientRect`.
 */
export function mountInAdmin(render: () => VNodeChild): VueWrapper {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
          { default: render },
        );
    },
  });

  return mount(Harness, {
    attachTo: document.body,
    global: { plugins: [makeRouter()] },
  });
}
