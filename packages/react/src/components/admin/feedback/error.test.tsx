/**
 * P7g tests: `<Error>` — the app-wide error page (a `<ShellErrorBoundary>`
 * fallback). Ported from shadmin `feedback/error.tsx` onto @chelone/react's
 * own `ErrorFallbackProps` (chelone avoids the `react-error-boundary` dep) and
 * `useTranslate` (chelone has no `<Translate>` component).
 *
 * Asserts: renders the error heading + generic message, delegates to a custom
 * `errorComponent` when provided, and invokes the back handler on the button.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { Error as ErrorPage } from "./error";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.error": "Something Went Wrong",
        "chelone.message.error":
          "A client error occurred and your request couldn't be completed.",
        "chelone.action.back": "Back",
      }),
    },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<Error>", () => {
  it("renders the error heading and generic message", () => {
    render(
      <Providers>
        <ErrorPage
          error={new Error("Boom")}
          errorInfo={null}
          resetErrorBoundary={vi.fn()}
        />
      </Providers>,
    );
    expect(screen.getByText("Something Went Wrong")).toBeTruthy();
    expect(
      screen.getByText(
        "A client error occurred and your request couldn't be completed.",
      ),
    ).toBeTruthy();
  });

  it("delegates to a custom errorComponent when provided", () => {
    const Custom = () => <div>Custom error UI</div>;
    render(
      <Providers>
        <ErrorPage
          error={new Error("Boom")}
          errorInfo={null}
          resetErrorBoundary={vi.fn()}
          errorComponent={Custom}
        />
      </Providers>,
    );
    expect(screen.getByText("Custom error UI")).toBeTruthy();
    // The built-in heading is NOT rendered when delegating.
    expect(screen.queryByText("Something Went Wrong")).toBeNull();
  });

  it("navigates back when the back button is clicked", () => {
    const goSpy = vi.spyOn(window.history, "go").mockImplementation(() => {});
    render(
      <Providers>
        <ErrorPage
          error={new Error("Boom")}
          errorInfo={null}
          resetErrorBoundary={vi.fn()}
        />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(goSpy).toHaveBeenCalledWith(-1);
    goSpy.mockRestore();
  });
});
