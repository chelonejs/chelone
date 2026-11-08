/**
 * P7e-T4 tests: the auth error-display leaves — `<AccessDenied>`,
 * `<AuthenticationError>`, and `<AuthError>`. Ported from shadmin
 * `admin/auth/{access-denied,authentication-error,auth-error}.tsx`; the seam
 * (`shadmin-core`'s `useTranslate` + `<Translate>` + react-router's `<Link>`)
 * is rewired to `@chelone/react` (`useTranslate` + the router adapter's `Link`).
 *
 * These are presentation-only screens: they translate their default keys and
 * render the primary/secondary text. `<AuthError>` additionally links to
 * `/login`, so it renders inside a router adapter.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { AccessDenied } from "./access-denied";
import { AuthError } from "./auth-error";
import { AuthenticationError } from "./authentication-error";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.access_denied": "Access denied",
        "chelone.message.access_denied_detail": "You do not have permission.",
        "chelone.page.authentication_error": "Authentication error",
        "chelone.message.authentication_error_detail": "Please sign in again.",
        "chelone.page.error": "Something went wrong",
        "chelone.message.auth_error":
          "A problem occurred during authentication.",
        "chelone.auth.sign_in": "Sign in",
      }),
    },
  });
}

function Wrap({ children }: { children: ReactNode }) {
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
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
}

describe("<AccessDenied>", () => {
  it("translates and renders the default primary + secondary text", () => {
    render(
      <Wrap>
        <AccessDenied />
      </Wrap>,
    );
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.getByText("You do not have permission.")).toBeTruthy();
  });
});

describe("<AuthenticationError>", () => {
  it("translates and renders its authentication-error defaults", () => {
    render(
      <Wrap>
        <AuthenticationError />
      </Wrap>,
    );
    expect(screen.getByText("Authentication error")).toBeTruthy();
    expect(screen.getByText("Please sign in again.")).toBeTruthy();
  });
});

describe("<AuthError>", () => {
  it("renders the error heading, message, and a sign-in link to /login", () => {
    render(
      <Wrap>
        <AuthError />
      </Wrap>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("A problem occurred during authentication."),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link.getAttribute("href")).toBe("/login");
  });
});
