/**
 * P7e-T4 tests: `<LoginPage>` — the default `loginPage` slot. Ported from
 * shadmin `admin/auth/login-page.tsx`; composes `<AuthLayout>` + `<LoginForm>`.
 *
 * Chelone divergence: shadmin redirects already-authenticated users away with
 * `useCheckAuth()` (imperative, ra-core). Chelone has no `useCheckAuth`, so the
 * page reads `useAuthState()` (the auth-state query) and redirects to `/` once
 * it resolves `authenticated: true`.
 *
 * Asserts: the sign-in heading + email/password fields render; an
 * already-authenticated user is navigated to `/`.
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
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { LoginPage } from "./login-page";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
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
    <MemoryRouter initialEntries={["/login"]}>
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={queryClient}
          i18n={makeI18n()}
          notifications={createNotificationStore()}
          authProvider={authProvider}
        >
          <Routes>
            <Route path="/login" element={children} />
            <Route path="/" element={<div>dashboard home</div>} />
          </Routes>
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
}

describe("<LoginPage>", () => {
  it("renders the auth layout with the embedded login form", async () => {
    // checkAuth rejects → unauthenticated → stay on the login page.
    const authProvider = makeAuthProvider({
      checkAuth: async () => Promise.reject(new Error("no")),
    });
    render(
      <Wrap authProvider={authProvider}>
        <LoginPage />
      </Wrap>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy(),
    );
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it("redirects an already-authenticated user to the dashboard", async () => {
    // checkAuth resolves → authenticated → navigate to "/".
    const authProvider = makeAuthProvider({ checkAuth: async () => {} });
    render(
      <Wrap authProvider={authProvider}>
        <LoginPage />
      </Wrap>,
    );
    await waitFor(() =>
      expect(screen.getByText("dashboard home")).toBeTruthy(),
    );
  });
});
