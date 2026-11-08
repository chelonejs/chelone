/**
 * P7e-T4 tests: `<LoginForm>` — the email + password sign-in form. Ported from
 * shadmin `admin/auth/login-form.tsx`. The RHF `<Form>` + imperative
 * `useLogin()` seam is rewired to chelone's `useForm` (a resource-less form
 * controller) + `CheloneFormProvider` (so bare `<TextInput>` children bind) +
 * `useLogin()` (a `useMutation`). Errors surface via `useNotify()`.
 *
 * Asserts: the email + password fields and the sign-in button render; a submit
 * calls `authProvider.login` with the entered credentials; a rejected login
 * pushes an error notification.
 */

import {
  type AnyCheloneI18n,
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defaultMessages,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { LoginForm } from "./login-form";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.auth.sign_in": "Sign in",
        "chelone.auth.sign_in_error": "Authentication failed, please retry",
        "chelone.validation.required": "Required",
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
  notifications,
  i18n,
  children,
}: {
  authProvider: AuthProvider;
  notifications?: NotificationStore;
  i18n?: AnyCheloneI18n;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={i18n ?? makeI18n()}
      notifications={notifications ?? createNotificationStore()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<LoginForm>", () => {
  it("renders the email + password fields and a sign-in button", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginForm />
      </Wrap>,
    );
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("calls authProvider.login with the entered credentials on submit", async () => {
    const login = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider({ login })}>
        <LoginForm />
      </Wrap>,
    );
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        password: "hunter2",
      }),
    );
  });

  it("renders the English `_` fallback for a label the default catalog lacks", () => {
    // `defaultMessages` is the core catalog only: it has no component label
    // keys. Without the core `_`-fallback fix,
    // `translate("chelone.auth.sign_in", { _: "Sign in" })` echoes the raw key
    // and the button reads "chelone.auth.sign_in".
    const i18n = createI18n({
      locale: "en",
      messages: { en: defaultMessages },
    });
    render(
      <Wrap authProvider={makeAuthProvider()} i18n={i18n}>
        <LoginForm />
      </Wrap>,
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
    expect(screen.queryByText("chelone.auth.sign_in")).toBeNull();
  });

  it("surfaces an error notification when login rejects", async () => {
    const notifications = createNotificationStore();
    const login = vi.fn(async () => {
      throw new Error("bad creds");
    });
    render(
      <Wrap
        authProvider={makeAuthProvider({ login })}
        notifications={notifications}
      >
        <LoginForm />
      </Wrap>,
    );
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const errs = notifications
        .getSnapshot()
        .filter((n) => n.type === "error");
      expect(errs.length).toBeGreaterThan(0);
    });
  });
});
