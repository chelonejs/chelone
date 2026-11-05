import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import { usePermissions } from "./permissions-hooks";

describe("usePermissions", () => {
  it("usePermissions with no auth provider runs no query", async () => {
    const capture: { result?: ReturnType<typeof usePermissions> } = {};
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
    });
    const Probe = defineComponent({
      setup() {
        capture.result = usePermissions();
        return () => null;
      },
    });
    mount(
      defineComponent({
        setup: () => () =>
          h(
            Admin,
            { dataProvider: fakeDataProvider({}), queryClient },
            { default: () => h(Probe) },
          ),
      }),
      { global: { plugins: [router] } },
    );
    await flushPromises();
    expect(capture.result?.isPending.value).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["auth", "getPermissions", undefined] })?.state
        .fetchStatus ?? "idle",
    ).toBe("idle");
  });
});
