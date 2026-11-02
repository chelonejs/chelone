/**
 * `<SetPasswordForm>` and `<SetPasswordPage>` tests: the form that finishes a
 * Supabase password reset or invite with the tokens from the emailed link.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
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
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { SetPasswordForm } from "./set-password-form";
import { SetPasswordPage } from "./set-password-page";

afterEach(cleanup);

type SetAuthProvider = AuthProvider & {
  setPassword: (params: {
    access_token: string;
    refresh_token: string;
    password: string;
  }) => Promise<void>;
};

function makeAuthProvider(
  setPassword: SetAuthProvider["setPassword"] = async () => {},
): SetAuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    setPassword,
  };
}

const bothTokens = "/set-password?access_token=access&refresh_token=refresh";

let currentPath = "";
function PathProbe() {
  currentPath = useLocation().pathname;
  return null;
}

function Wrap({
  authProvider = makeAuthProvider(),
  entry = bothTokens,
  children,
}: {
  authProvider?: SetAuthProvider;
  entry?: string;
  children: ReactNode;
}) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <PathProbe />
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={
            new QueryClient({
              defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
              },
            })
          }
          i18n={createI18n({
            locale: "en",
            messages: {
              en: {
                ...supabaseEnglishMessages,
                ...defineMessages({
                  "chelone.validation.required": "Required",
                }),
              },
            },
          })}
          notifications={createNotificationStore()}
          authProvider={authProvider}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
}

const passwordField = () => screen.getByLabelText(/^password/i);
const confirmField = () => screen.getByLabelText(/^confirm password/i);

function fill(password: string, confirm: string) {
  fireEvent.change(passwordField(), { target: { value: password } });
  fireEvent.change(confirmField(), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

describe("<SetPasswordForm>", () => {
  it("SetPasswordForm shows two password fields and a Save button when both tokens are present", () => {
    render(
      <Wrap>
        <SetPasswordForm />
      </Wrap>,
    );

    expect(passwordField().getAttribute("autocomplete")).toBe("new-password");
    expect(confirmField().getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("mismatched passwords show the mismatch error on both fields and do not call setPassword", async () => {
    const setPassword = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider(setPassword)}>
        <SetPasswordForm />
      </Wrap>,
    );

    fill("hunter2", "hunter3");

    await waitFor(() =>
      expect(screen.getAllByText("Passwords do not match")).toHaveLength(2),
    );
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("matching passwords call setPassword with both tokens and the password", async () => {
    const setPassword = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider(setPassword)}>
        <SetPasswordForm />
      </Wrap>,
    );

    fill("hunter2", "hunter2");

    await waitFor(() =>
      expect(setPassword).toHaveBeenCalledWith({
        access_token: "access",
        refresh_token: "refresh",
        password: "hunter2",
      }),
    );
    await waitFor(() => expect(currentPath).toBe("/"));
  });

  it("missing tokens show the missing-tokens message and no form", () => {
    render(
      <Wrap entry="/set-password?access_token=access">
        <SetPasswordForm />
      </Wrap>,
    );

    expect(
      screen.getByText("Access and refresh tokens are missing from the link"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Back to login" }).getAttribute("href"),
    ).toBe("/login");
    expect(currentPath).toBe("/set-password");
  });
});

describe("<SetPasswordPage>", () => {
  it("SetPasswordPage shows the new password title", () => {
    render(
      <Wrap>
        <SetPasswordPage />
      </Wrap>,
    );

    expect(
      screen.getByRole("heading", { name: "Choose your password" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("has a static path for the route", () => {
    expect(SetPasswordPage.path).toBe("/set-password");
  });
});
