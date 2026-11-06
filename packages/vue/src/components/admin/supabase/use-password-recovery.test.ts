/**
 * Password-recovery composable tests: `useResetPassword` and `useSetPassword`
 * over the Supabase auth provider's extra methods, and `useSupabaseUrlTokens`
 * reading the link's tokens from the search or the hash.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import {
  useResetPassword,
  useSetPassword,
  useSupabaseUrlTokens,
} from "./use-password-recovery";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

type RecoveryAuthProvider = AuthProvider & {
  resetPassword?: (params: { email: string }) => Promise<void>;
  setPassword?: (params: {
    access_token: string;
    refresh_token: string;
    password: string;
  }) => Promise<void>;
};

function makeAuthProvider(
  over: Partial<RecoveryAuthProvider> = {},
): RecoveryAuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

/** Run `useComposable` inside `<Admin>` and hand back its result plus the router. */
async function setup<T>(
  useComposable: () => T,
  options: {
    authProvider?: RecoveryAuthProvider;
    notifications?: NotificationStore;
    queryClient?: QueryClient;
    initialEntry?: string;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: { render: () => null } }],
  });
  await router.push(options.initialEntry ?? "/start");
  await router.isReady();
  let result: T | undefined;
  const Probe = defineComponent({
    setup() {
      result = useComposable();
      return () => null;
    },
  });
  mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient:
                options.queryClient ??
                new QueryClient({
                  defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                  },
                }),
              i18n: createI18n({ locale: "en", messages: { en: {} } }),
              notifications: options.notifications ?? createNotificationStore(),
              authProvider: options.authProvider ?? makeAuthProvider(),
            },
            { default: () => h(Probe) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { result: defined(result), router };
}

describe("useResetPassword", () => {
  it("useResetPassword calls authProvider.resetPassword with the email", async () => {
    const resetPassword = vi.fn(async () => {});
    const { result } = await setup(() => useResetPassword(), {
      authProvider: makeAuthProvider({ resetPassword }),
    });

    await result.mutateAsync({ email: "user@example.com" });

    expect(resetPassword).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("useResetPassword notifies password_reset and redirects to /login on success", async () => {
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    const { result, router } = await setup(() => useResetPassword(), {
      authProvider: makeAuthProvider({ resetPassword: async () => {} }),
      notifications,
    });

    await result.mutateAsync({ email: "user@example.com" });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(notify).toHaveBeenCalledWith("ra-supabase.auth.password_reset", {
      type: "info",
    });
  });

  it("useResetPassword throws without a resetPassword method", async () => {
    const { result } = await setup(() => useResetPassword());

    await expect(
      result.mutateAsync({ email: "user@example.com" }),
    ).rejects.toThrow(/resetPassword/);
  });
});

describe("useSetPassword", () => {
  const params = {
    access_token: "access",
    refresh_token: "refresh",
    password: "hunter2",
  };

  it("useSetPassword calls authProvider.setPassword, invalidates the auth queries and redirects to /", async () => {
    const setPassword = vi.fn(async () => {});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result, router } = await setup(() => useSetPassword(), {
      authProvider: makeAuthProvider({ setPassword }),
      queryClient,
    });

    await result.mutateAsync(params);
    await flushPromises();

    expect(setPassword).toHaveBeenCalledWith(params);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth"] });
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("useSetPassword throws without a setPassword method", async () => {
    const { result } = await setup(() => useSetPassword());

    await expect(result.mutateAsync(params)).rejects.toThrow(/setPassword/);
  });
});

describe("useSupabaseUrlTokens", () => {
  it("useSupabaseUrlTokens reads the tokens from the search and from the hash", async () => {
    const fromSearch = await setup(() => useSupabaseUrlTokens(), {
      initialEntry: "/set-password?access_token=a1&refresh_token=r1",
    });
    expect(fromSearch.result.accessToken.value).toBe("a1");
    expect(fromSearch.result.refreshToken.value).toBe("r1");

    const fromHash = await setup(() => useSupabaseUrlTokens(), {
      initialEntry: "/set-password#access_token=a2&refresh_token=r2",
    });
    expect(fromHash.result.accessToken.value).toBe("a2");
    expect(fromHash.result.refreshToken.value).toBe("r2");
  });

  it("follows the location when it changes", async () => {
    const { result, router } = await setup(() => useSupabaseUrlTokens());
    expect(result.accessToken.value).toBeNull();

    await router.push("/set-password?access_token=a3&refresh_token=r3");

    expect(result.accessToken.value).toBe("a3");
    expect(result.refreshToken.value).toBe("r3");
  });

  it("removes the tokens from the URL after reading them", async () => {
    const { router } = await setup(() => useSupabaseUrlTokens(), {
      initialEntry:
        "/set-password?access_token=a1&refresh_token=r1&type=recovery&keep=1",
    });

    expect(router.currentRoute.value.fullPath).toBe("/set-password?keep=1");

    // The entry was replaced, so the token URL is not left behind it.
    router.back();
    await flushPromises();
    expect(router.currentRoute.value.fullPath).not.toContain("access_token");
  });

  it("removes the tokens from the hash too", async () => {
    const { router } = await setup(() => useSupabaseUrlTokens(), {
      initialEntry:
        "/set-password#access_token=a2&refresh_token=r2&type=invite",
    });

    expect(router.currentRoute.value.fullPath).toBe("/set-password");
  });

  it("removes the tokens from a hash route's query", async () => {
    const { router } = await setup(() => useSupabaseUrlTokens(), {
      initialEntry:
        "/app#/set-password?access_token=a3&refresh_token=r3&type=recovery&keep=1",
    });

    expect(router.currentRoute.value.fullPath).toBe(
      "/app#/set-password?keep=1",
    );
  });

  it("removes the tokens from a hash route's query when nothing else remains", async () => {
    const { router } = await setup(() => useSupabaseUrlTokens(), {
      initialEntry:
        "/app#/set-password?access_token=a3&refresh_token=r3&type=recovery",
    });

    expect(router.currentRoute.value.fullPath).toBe("/app#/set-password");
  });

  it("keeps the tokens after the URL is cleaned", async () => {
    const { result, router } = await setup(() => useSupabaseUrlTokens(), {
      initialEntry: "/set-password?access_token=a1&refresh_token=r1",
    });

    expect(router.currentRoute.value.fullPath).toBe("/set-password");
    expect(result.accessToken.value).toBe("a1");
    expect(result.refreshToken.value).toBe("r1");
  });
});
