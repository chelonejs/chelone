/**
 * Tests: `<CheckForApplicationUpdate>` and `useCheckForApplicationUpdate` —
 * poll the deployed page and show a notice once its body changes.
 *
 * Asserts: nothing renders until the fetched body differs from the first one,
 * then the default or a custom notification; the url, `cache: "no-store"`,
 * `disabled` and `interval` options; `onNewVersionAvailable` firing once; and
 * that inline `fetchOptions` / callbacks never restart the poll.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckForApplicationUpdate } from "../../../compat-hooks";
import { CheloneProvider } from "../../../context";
import { CheckForApplicationUpdate } from "./check-for-application-update";

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
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

const URL = "https://app.test/index.html";
const INTERVAL = 1000;

let body: string;
const fetchMock =
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

/** Lets the fetch promise chain settle, then runs timers due within `ms`. */
async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  body = "<html>build 1</html>";
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(body));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("<CheckForApplicationUpdate>", () => {
  it("renders nothing while the deployed page is unchanged", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
        />
      </Providers>,
    );
    await advance(INTERVAL * 3);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the default notification when the body changes", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
        />
      </Providers>,
    );
    await advance(0);
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(screen.getByRole("alert").textContent).toContain(
      "A new version of the application is available",
    );
  });

  it("renders a custom notification", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
          notification={<p>Fresh build out</p>}
        />
      </Providers>,
    );
    await advance(0);
    expect(screen.queryByText("Fresh build out")).toBeNull();
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(screen.getByText("Fresh build out")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not fetch while disabled", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate disabled url={URL} interval={INTERVAL} />
      </Providers>,
    );
    await advance(INTERVAL * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the url option with cache no-store", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
          fetchOptions={{ headers: { "x-probe": "1" }, cache: "force-cache" }}
        />
      </Providers>,
    );
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = defined(fetchMock.mock.calls[0]);
    expect(calledUrl).toBe(URL);
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({ "x-probe": "1" });
  });

  it("polls again after the interval", async () => {
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
        />
      </Providers>,
    );
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("calls onNewVersionAvailable once", async () => {
    const onNewVersionAvailable = vi.fn();
    render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
          onNewVersionAvailable={onNewVersionAvailable}
        />
      </Providers>,
    );
    await advance(0);
    expect(onNewVersionAvailable).not.toHaveBeenCalled();
    body = "<html>build 2</html>";
    await advance(INTERVAL * 3);
    expect(onNewVersionAvailable).toHaveBeenCalledTimes(1);
  });

  it("does not restart its poll when fetchOptions or the callback change identity", async () => {
    function App({ tick }: { tick: number }) {
      return (
        <Providers>
          <CheckForApplicationUpdate
            disabled={false}
            url={URL}
            interval={INTERVAL}
            fetchOptions={{ headers: { "x-tick": String(tick) } }}
            onNewVersionAvailable={() => undefined}
          />
        </Providers>
      );
    }
    const { rerender } = render(<App tick={1} />);
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    rerender(<App tick={2} />);
    rerender(<App tick={3} />);
    await advance(0);
    // A restarted poll would have fetched again straight away.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = defined(fetchMock.mock.calls[1]);
    expect(init.headers).toEqual({ "x-tick": "3" });
  });

  it("stops polling on unmount", async () => {
    const { unmount } = render(
      <Providers>
        <CheckForApplicationUpdate
          disabled={false}
          url={URL}
          interval={INTERVAL}
        />
      </Providers>,
    );
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
    await advance(INTERVAL * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("useCheckForApplicationUpdate", () => {
  it("returns true after a changed response", async () => {
    const { result } = renderHook(
      () =>
        useCheckForApplicationUpdate({
          disabled: false,
          url: URL,
          interval: INTERVAL,
        }),
      { wrapper: Providers },
    );
    await advance(0);
    expect(result.current).toBe(false);
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(result.current).toBe(true);
  });
});
