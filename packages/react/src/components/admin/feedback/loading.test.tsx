/**
 * P7g tests: `<Loading>` — the deferred loading indicator.
 *
 * Asserts: renders nothing before the delay, then shows the (translated)
 * primary/secondary messages + a spinner once the delay elapses.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { Loading } from "./loading";

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.page.loading": "Loading",
        "chelone.message.loading_detail":
          "The page is loading, just a moment please",
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

describe("<Loading>", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders nothing before the delay elapses", () => {
    render(
      <Providers>
        <Loading delay={1000} />
      </Providers>,
    );
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("shows translated primary + secondary messages after the delay", () => {
    render(
      <Providers>
        <Loading delay={1000} />
      </Providers>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Loading")).toBeTruthy();
    expect(
      screen.getByText("The page is loading, just a moment please"),
    ).toBeTruthy();
    // Both the outer live-region and the spinner carry role="status".
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });
});
