/**
 * P7e-T4 tests: `<AuthCallback>` — the OAuth-return page. Ported from shadmin
 * `admin/auth/auth-callback.tsx`; the seam (`shadmin-core`'s
 * `useHandleAuthCallback` + the `<Loading>` feedback component) is rewired to
 * `@chelone/react`'s `useHandleAuthCallback` (the P6 auth-gate resolver) and a
 * `<Spinner>` loading indicator (chelone has no `<Loading>` component yet).
 *
 * Asserts: while the callback is pending, a `role="status"` loader renders;
 * when `handleCallback` rejects, the `<AuthError>` screen (`role="alert"`)
 * renders instead.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { AuthCallback } from "./auth-callback";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.error": "Something went wrong",
        "chelone.message.auth_error":
          "A problem occurred during authentication.",
        "chelone.auth.sign_in": "Sign in",
      }),
    },
  });
}

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

function Wrap({
  authProvider,
  children,
}: {
  authProvider: AuthProvider;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter>
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={queryClient}
          i18n={makeI18n()}
          notifications={createNotificationStore()}
          authProvider={authProvider}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
}

describe("<AuthCallback>", () => {
  it("renders a loading indicator while the callback is pending", () => {
    // A callback that never settles keeps the loading branch mounted.
    const authProvider = makeAuthProvider({
      handleCallback: () => new Promise(() => {}),
    });
    render(
      <Wrap authProvider={authProvider}>
        <AuthCallback />
      </Wrap>,
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders the auth-error screen when handleCallback rejects", async () => {
    const authProvider = makeAuthProvider({
      handleCallback: () => Promise.reject(new Error("boom")),
    });
    render(
      <Wrap authProvider={authProvider}>
        <AuthCallback />
      </Wrap>,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
