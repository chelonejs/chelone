/**
 * `<SupabaseLoginPage>` tests: Chelone's login page plus a forgot password
 * link and one OAuth button per provider.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  fakeDataProvider,
} from "@chelone/core";
import { supabaseEnglishMessages } from "@chelone/supabase";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import {
  SupabaseLoginPage,
  type SupabaseLoginPageProps,
} from "./supabase-login-page";

afterEach(cleanup);

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    // Unauthenticated unless a test says otherwise.
    checkAuth: async () => Promise.reject(new Error("no")),
    checkError: async () => {},
    ...over,
  };
}

function mount(
  props: SupabaseLoginPageProps = {},
  authProvider: AuthProvider = makeAuthProvider(),
) {
  const wrapper: ReactNode = (
    <MemoryRouter initialEntries={["/login"]}>
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
          i18n={createI18n({
            locale: "en",
            messages: { en: supabaseEnglishMessages },
          })}
          notifications={createNotificationStore()}
          authProvider={authProvider}
        >
          <Routes>
            <Route path="/login" element={<SupabaseLoginPage {...props} />} />
            <Route path="/" element={<div>dashboard home</div>} />
          </Routes>
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
  return render(wrapper);
}

describe("<SupabaseLoginPage>", () => {
  it("SupabaseLoginPage shows the email form and a Forgot password link by default", async () => {
    mount();

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Forgot password?" })
        .getAttribute("href"),
    ).toBe("/forgot-password");
    expect(screen.queryByText("or")).toBeNull();
  });

  it("the form signs in through authProvider.login with the email and password", async () => {
    const login = vi.fn(async () => {});
    mount({}, makeAuthProvider({ login }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret",
      }),
    );
  });

  it("providers adds one button per provider under an or divider", async () => {
    const login = vi.fn(async () => {});
    mount({ providers: ["google", "github"] }, makeAuthProvider({ login }));

    expect(await screen.findByText("or")).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(
      screen
        .getAllByRole("button", { name: /^Sign in with / })
        .map((button) => button.textContent),
    ).toEqual(["Sign in with Google", "Sign in with Github"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with Github" }),
    );
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "github" }),
      ),
    );
  });

  it("disableEmailPassword hides the form, the divider and the forgot password link", async () => {
    mount({ disableEmailPassword: true, providers: ["google"] });

    expect(
      await screen.findByRole("button", { name: "Sign in with Google" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByText("or")).toBeNull();
    expect(screen.queryByRole("link", { name: "Forgot password?" })).toBeNull();
  });

  it("disableForgotPassword hides the link and keeps the form", async () => {
    mount({ disableForgotPassword: true });

    expect(await screen.findByLabelText(/email/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Forgot password?" })).toBeNull();
  });

  it("children replace the form and the buttons", async () => {
    mount({ providers: ["google"], children: <p>custom sign in</p> });

    expect(await screen.findByText("custom sign in")).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByText("or")).toBeNull();
    expect(screen.queryByRole("button", { name: /Sign in with/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Forgot password?" })).toBeNull();
  });

  it("an authenticated user is redirected to /", async () => {
    mount({}, makeAuthProvider({ checkAuth: async () => {} }));

    await waitFor(() =>
      expect(screen.getByText("dashboard home")).toBeTruthy(),
    );
  });

  it("has a static path for the route", () => {
    expect(SupabaseLoginPage.path).toBe("/login");
  });
});
