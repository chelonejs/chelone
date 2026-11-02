import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import { useGetIdentity, useOptionalIdentity } from "./auth-hooks";

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

function mountProbe<T>(
  read: () => T,
  authProvider?: AuthProvider,
): { capture: { result?: T }; queryClient: QueryClient } {
  const capture: { result?: T } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
  });
  const Probe = defineComponent({
    setup() {
      capture.result = read();
      return () => null;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider: fakeDataProvider({}), queryClient, authProvider },
          { default: () => h(Probe) },
        );
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return { capture, queryClient };
}

describe("useOptionalIdentity", () => {
  it("useOptionalIdentity returns the identity from the auth provider", async () => {
    const { capture } = mountProbe(
      () => useOptionalIdentity(),
      makeAuthProvider({
        getIdentity: async () => ({ id: 7, fullName: "Rin" }),
      }),
    );
    expect(capture.result?.isPending.value).toBe(true);
    await vi.waitFor(() =>
      expect(capture.result?.identity.value).toMatchObject({
        id: 7,
        fullName: "Rin",
      }),
    );
    expect(capture.result?.isPending.value).toBe(false);
  });

  it("useOptionalIdentity returns undefined and runs no query without an auth provider", async () => {
    const { capture, queryClient } = mountProbe(() => useOptionalIdentity());
    await flushPromises();
    expect(capture.result?.identity.value).toBeUndefined();
    expect(capture.result?.isPending.value).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
    expect(
      queryClient.getQueryCache().find({ queryKey: ["auth", "getIdentity"] })
        ?.state.fetchStatus ?? "idle",
    ).toBe("idle");
    expect(queryClient.getQueryData(["auth", "getIdentity"])).toBeUndefined();
  });

  it("useOptionalIdentity returns undefined when the provider has no getIdentity", async () => {
    const { capture, queryClient } = mountProbe(
      () => useOptionalIdentity(),
      makeAuthProvider(),
    );
    await flushPromises();
    expect(capture.result?.identity.value).toBeUndefined();
    expect(capture.result?.isPending.value).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
  });

  it("useOptionalIdentity settles as undefined when getIdentity rejects", async () => {
    const getIdentity = vi.fn().mockRejectedValue(new Error("down"));
    const { capture } = mountProbe(
      () => useOptionalIdentity(),
      makeAuthProvider({ getIdentity }),
    );
    await vi.waitFor(() => expect(getIdentity).toHaveBeenCalled());
    await flushPromises();
    expect(capture.result?.isPending.value).toBe(false);
    expect(capture.result?.identity.value).toBeUndefined();
  });

  it("useOptionalIdentity and useGetIdentity share one getIdentity call", async () => {
    const getIdentity = vi.fn(async () => ({ id: 1, fullName: "Rin" }));
    const { capture } = mountProbe(
      () => ({ optional: useOptionalIdentity(), plain: useGetIdentity() }),
      makeAuthProvider({ getIdentity }),
    );
    await vi.waitFor(() => {
      expect(capture.result?.optional.identity.value).toBeDefined();
      expect(capture.result?.plain.data.value).toBeDefined();
    });
    expect(getIdentity).toHaveBeenCalledTimes(1);
  });
});
