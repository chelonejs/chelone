/**
 * PATTERN GATE (V1-a) — router-OPTIONAL degrade under churn. A composable built
 * on `useRedirectOptional` must mount/unmount cleanly with NO router adapter in
 * scope (a stable no-op, never a throw — standalone forms + unit tests), AND
 * resolve to the REAL redirect when an adapter IS present. Churning both paths
 * proves the optional inject never leaks a subscription or throws across many
 * lifecycles.
 */

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { useRedirectOptional } from "./nav-composables";
import { provideVueRouterAdapter } from "./vue-router-adapter";

const Blank = defineComponent({ setup: () => () => h("div") });

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Blank },
      { path: "/posts", component: Blank },
      { path: "/posts/:id", component: Blank },
    ],
  });
}

describe("useRedirectOptional — router-optional under churn (PATTERN GATE)", () => {
  it("(1) mounts/unmounts 100x with NO router: never throws, always a callable no-op", () => {
    let redirect!: ReturnType<typeof useRedirectOptional>;
    const Consumer = defineComponent({
      setup() {
        redirect = useRedirectOptional();
        return () => h("div");
      },
    });
    for (let i = 0; i < 100; i++) {
      const wrapper = mount(Consumer); // no router plugin, no adapter provided
      expect(typeof redirect).toBe("function");
      // Calling the degraded redirect is a safe no-op every cycle.
      expect(() => redirect("edit", "posts", 2)).not.toThrow();
      wrapper.unmount();
    }
  });

  it("(2) resolves to the REAL redirect when an adapter is present (and actually navigates)", async () => {
    const router = makeRouter();
    let redirect!: ReturnType<typeof useRedirectOptional>;
    const Child = defineComponent({
      setup() {
        redirect = useRedirectOptional();
        return () => h("div");
      },
    });
    const Root = defineComponent({
      setup() {
        provideVueRouterAdapter();
        return () => h(Child);
      },
    });
    mount(Root, { global: { plugins: [router] } });
    await router.isReady();

    redirect("edit", "posts", 2);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/2");
  });

  it("(3) churning present/absent adapter never cross-contaminates: no-op when absent, real when present", async () => {
    for (let i = 0; i < 20; i++) {
      const withAdapter = i % 2 === 0;
      const router = makeRouter();
      await router.push("/");
      await router.isReady();

      let redirect!: ReturnType<typeof useRedirectOptional>;
      const Child = defineComponent({
        setup() {
          redirect = useRedirectOptional();
          return () => h("div");
        },
      });
      const Root = defineComponent({
        setup() {
          if (withAdapter) provideVueRouterAdapter();
          return () => h(Child);
        },
      });
      const wrapper = mount(Root, { global: { plugins: [router] } });

      redirect("edit", "posts", 3);
      await flushPromises();
      if (withAdapter) {
        expect(router.currentRoute.value.path).toBe("/posts/3");
      } else {
        // Adapter absent -> degraded no-op -> no navigation happened.
        expect(router.currentRoute.value.path).toBe("/");
      }
      wrapper.unmount();
    }
  });
});
