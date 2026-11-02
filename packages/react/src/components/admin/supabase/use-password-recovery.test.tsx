/**
 * Password-recovery hook tests: `useResetPassword` and `useSetPassword` over
 * the Supabase auth provider's extra methods, and `useSupabaseUrlTokens`
 * reading the link's tokens from the search or the hash.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import {
  useResetPassword,
  useSetPassword,
  useSupabaseUrlTokens,
} from "./use-password-recovery";

afterEach(cleanup);

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

let currentPath = "";
function PathProbe() {
  const location = useLocation();
  currentPath = location.pathname;
  return null;
}

function makeWrapper(options: {
  authProvider?: RecoveryAuthProvider;
  notifications?: NotificationStore;
  queryClient?: QueryClient;
  initialEntry?: string;
}) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[options.initialEntry ?? "/start"]}>
        <PathProbe />
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <CheloneProvider
            dataProvider={fakeDataProvider({})}
            queryClient={queryClient}
            i18n={createI18n({ locale: "en", messages: { en: {} } })}
            notifications={options.notifications ?? createNotificationStore()}
            authProvider={options.authProvider ?? makeAuthProvider()}
          >
            {children}
          </CheloneProvider>
        </RouterAdapterProvider>
      </MemoryRouter>
    );
  };
}

describe("useResetPassword", () => {
  it("useResetPassword calls authProvider.resetPassword with the email", async () => {
    const resetPassword = vi.fn(async () => {});
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper({ authProvider: makeAuthProvider({ resetPassword }) }),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com" });
    });

    expect(resetPassword).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("useResetPassword notifies password_reset and redirects to /login on success", async () => {
    const notifications = createNotificationStore();
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper({
        authProvider: makeAuthProvider({ resetPassword: async () => {} }),
        notifications,
      }),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com" });
    });

    await waitFor(() => expect(currentPath).toBe("/login"));
    expect(notifications.getSnapshot()).toMatchObject([
      { message: "ra-supabase.auth.password_reset", type: "info" },
    ]);
  });

  it("useResetPassword throws when the auth provider has no resetPassword", async () => {
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper({ authProvider: makeAuthProvider() }),
    });

    await expect(
      act(() => result.current.mutateAsync({ email: "user@example.com" })),
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
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSetPassword(), {
      wrapper: makeWrapper({
        authProvider: makeAuthProvider({ setPassword }),
        queryClient,
      }),
    });

    await act(async () => {
      await result.current.mutateAsync(params);
    });

    expect(setPassword).toHaveBeenCalledWith(params);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth"] });
    await waitFor(() => expect(currentPath).toBe("/"));
  });

  it("useSetPassword throws when the auth provider has no setPassword", async () => {
    const { result } = renderHook(() => useSetPassword(), {
      wrapper: makeWrapper({ authProvider: makeAuthProvider() }),
    });

    await expect(
      act(() => result.current.mutateAsync(params)),
    ).rejects.toThrow(/setPassword/);
  });
});

describe("useSupabaseUrlTokens", () => {
  it("useSupabaseUrlTokens reads the tokens from the search and from the hash", () => {
    const fromSearch = renderHook(() => useSupabaseUrlTokens(), {
      wrapper: makeWrapper({
        initialEntry: "/set-password?access_token=a1&refresh_token=r1",
      }),
    });
    expect(fromSearch.result.current).toEqual({
      accessToken: "a1",
      refreshToken: "r1",
    });

    const fromHash = renderHook(() => useSupabaseUrlTokens(), {
      wrapper: makeWrapper({
        initialEntry: "/set-password#access_token=a2&refresh_token=r2",
      }),
    });
    expect(fromHash.result.current).toEqual({
      accessToken: "a2",
      refreshToken: "r2",
    });
  });
});
