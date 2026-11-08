import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { LoadingIndicator } from "./loading-indicator";

afterEach(cleanup);

function setup(messages: Record<string, string> = {}) {
  const queryClient = new QueryClient();
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({ "chelone.action.refresh": "Refresh", ...messages }),
    },
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  /** Starts a query that stays in flight until the returned function runs. */
  const startQuery = () => {
    let release: (value: unknown) => void = () => {};
    const gated = new Promise((resolve) => {
      release = resolve;
    });
    act(() => {
      void queryClient.fetchQuery({
        queryKey: ["gated"],
        queryFn: () => gated,
      });
    });
    return release;
  };
  return { queryClient, Providers, startQuery };
}

describe("<LoadingIndicator>", () => {
  it("shows no spinner while idle", () => {
    const { Providers } = setup();
    render(
      <Providers>
        <LoadingIndicator />
      </Providers>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
  });

  it("shows a labelled spinner while a query is in flight", async () => {
    const { Providers, startQuery } = setup();
    render(
      <Providers>
        <LoadingIndicator />
      </Providers>,
    );
    startQuery();
    expect((await screen.findByRole("status")).getAttribute("aria-label")).toBe(
      "Loading",
    );
  });

  it("removes the spinner when the query settles", async () => {
    const { Providers, startQuery } = setup();
    render(
      <Providers>
        <LoadingIndicator />
      </Providers>,
    );
    const release = startQuery();
    await screen.findByRole("status");
    await act(async () => {
      release("done");
    });
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("takes the button out of the tab order and accessibility tree while loading", async () => {
    const { Providers, startQuery } = setup();
    render(
      <Providers>
        <LoadingIndicator />
      </Providers>,
    );
    startQuery();
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
    const hidden = screen.getByLabelText("Refresh");
    expect(hidden.getAttribute("tabindex")).toBe("-1");
    expect(hidden.getAttribute("aria-hidden")).toBe("true");
  });

  it("refreshes the queries and calls onClick when the button is clicked", () => {
    const { Providers, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const onClick = vi.fn();
    render(
      <Providers>
        <LoadingIndicator onClick={onClick} />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("translates the spinner label", async () => {
    const { Providers, startQuery } = setup({
      "chelone.page.loading": "Chargement",
    });
    render(
      <Providers>
        <LoadingIndicator />
      </Providers>,
    );
    startQuery();
    expect((await screen.findByRole("status")).getAttribute("aria-label")).toBe(
      "Chargement",
    );
  });
});
