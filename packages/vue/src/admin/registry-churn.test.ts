/**
 * PATTERN GATE (V1-a) — the reactive resource registry + vue-router route table
 * under churn. Toggling `<Resource>` children in/out (v-if) repeatedly must keep
 * register/unregister in perfect balance: no duplicate routes accumulate, no
 * orphaned routes survive an unregister, and the live route table equals the
 * set of currently-mounted resources after every toggle. This is the registry
 * twin of the store-bridge leak gate — the new lifecycle is register-on-setup /
 * unregister-on-scope-dispose driving `router.addRoute` / its remover.
 */

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, inject, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import type { CheloneContextValue } from "../context";
import Admin from "./admin.vue";
import Resource from "./resource.vue";
import {
  type ResourceRegistry,
  ResourceRegistryKey,
} from "./resource-registry";

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

/** Chelone-owned route records only (ignore the base `/` and any host routes). */
function cheloneRoutePaths(router: Router): string[] {
  return router
    .getRoutes()
    .filter((r) => typeof r.name === "string" && r.name.startsWith("chelone-"))
    .map((r) => r.path)
    .sort();
}

describe("registry + route table — lifecycle under churn (PATTERN GATE)", () => {
  it("(1) toggling a <Resource> in/out 30x: register/unregister stays balanced, zero orphaned routes", async () => {
    const router = makeRouter();
    const show = ref(true);
    const capture: { registry?: ResourceRegistry } = {};
    const Probe = defineComponent({
      setup() {
        capture.registry = inject(ResourceRegistryKey) ?? undefined;
        return () => null;
      },
    });

    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider },
            {
              default: () => [
                h(Probe, { key: "probe" }),
                show.value
                  ? h(Resource, {
                      key: "posts",
                      name: "posts",
                      list: Blank,
                      edit: Blank,
                    })
                  : null,
              ],
            },
          );
      },
    });

    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();

    for (let i = 0; i < 30; i++) {
      // ON: resource registered, both its routes present, exactly once each.
      show.value = true;
      await flushPromises();
      expect(capture.registry?.definitions.posts).toBeDefined();
      expect(cheloneRoutePaths(router)).toEqual(["/posts", "/posts/:id"]);
      expect(router.hasRoute("chelone-posts-list")).toBe(true);
      expect(router.hasRoute("chelone-posts-edit")).toBe(true);

      // OFF: unregistered, and NO orphaned chelone route survives.
      show.value = false;
      await flushPromises();
      expect(capture.registry?.definitions.posts).toBeUndefined();
      expect(cheloneRoutePaths(router)).toEqual([]);
      expect(router.hasRoute("chelone-posts-list")).toBe(false);
      expect(router.hasRoute("chelone-posts-edit")).toBe(false);
    }

    // No duplicate accumulation: after 30 on/off cycles ending OFF, the table
    // holds only the base route.
    expect(router.getRoutes().map((r) => r.path)).toEqual(["/"]);
    wrapper.unmount();
  });

  it("(2) re-registering the same name never duplicates its route records", async () => {
    const router = makeRouter();
    const show = ref(true);
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider },
            {
              default: () =>
                show.value ? h(Resource, { name: "posts", list: Blank }) : null,
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });

    for (let i = 0; i < 15; i++) {
      show.value = true;
      await flushPromises();
      show.value = false;
      await flushPromises();
    }
    show.value = true;
    await flushPromises();

    // Exactly ONE list route for `posts` — no stacked duplicates from the churn.
    const listRoutes = router
      .getRoutes()
      .filter((r) => r.name === "chelone-posts-list");
    expect(listRoutes).toHaveLength(1);
    expect(cheloneRoutePaths(router)).toEqual(["/posts"]);
    wrapper.unmount();
  });

  it("(3) independent resources toggle without cross-talk; final table matches the live set", async () => {
    const router = makeRouter();
    const showPosts = ref(true);
    const showAuthors = ref(true);
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider },
            {
              // Keyed vnodes: mirrors how a template `v-if` compiles to keyed
              // blocks. A raw keyless array patches by index and mis-reuses
              // instances when two slots flip to opposite values at once (a Vue
              // list-diffing rule, not a Chelone concern).
              default: () => [
                showPosts.value
                  ? h(Resource, { key: "posts", name: "posts", list: Blank })
                  : null,
                showAuthors.value
                  ? h(Resource, {
                      key: "authors",
                      name: "authors",
                      list: Blank,
                    })
                  : null,
              ],
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(cheloneRoutePaths(router)).toEqual(["/authors", "/posts"]);

    // Churn them out of phase — each toggle's route table must match exactly
    // the resources currently mounted, never leaking the other's routes.
    for (let i = 0; i < 20; i++) {
      showPosts.value = i % 2 === 0;
      showAuthors.value = i % 3 === 0;
      await flushPromises();
      const expected: string[] = [];
      if (showAuthors.value) expected.push("/authors");
      if (showPosts.value) expected.push("/posts");
      expect(cheloneRoutePaths(router)).toEqual(expected);
    }

    // Settle both ON and confirm the exact live set — no orphans from the churn.
    showPosts.value = true;
    showAuthors.value = true;
    await flushPromises();
    expect(cheloneRoutePaths(router)).toEqual(["/authors", "/posts"]);
    wrapper.unmount();
  });

  it("(4) unmounting <Admin> after churn tears down every chelone route (no cross-instance leak)", async () => {
    const router = makeRouter();
    const show = ref(true);
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider },
            {
              default: () => [
                show.value
                  ? h(Resource, { key: "posts", name: "posts", list: Blank })
                  : null,
                h(Resource, { key: "authors", name: "authors", list: Blank }),
              ],
            },
          );
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    for (let i = 0; i < 10; i++) {
      show.value = !show.value;
      await flushPromises();
    }
    // At least `authors` is always present pre-unmount.
    expect(cheloneRoutePaths(router).length).toBeGreaterThanOrEqual(1);

    wrapper.unmount();
    await flushPromises();
    // Admin's onScopeDispose removed every route it added — clean slate.
    expect(cheloneRoutePaths(router)).toEqual([]);
    expect(router.getRoutes().map((r) => r.path)).toEqual(["/"]);
  });
});
