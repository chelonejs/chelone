/**
 * W1-T7 scroll tests (§0a-14): `useScrollToTop` fires only on a `_scrollToTop`
 * navigation; `RestoreScrollPosition` persists + restores `window.scrollY` under
 * a Store key (debounced), and skips restore when the navigation wanted the top.
 */

import { createStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AdminContext } from "./admin-context";
import { RestoreScrollPosition, useScrollToTop } from "./scroll";

let scrollToSpy: ReturnType<typeof vi.fn>;

beforeAll(() => {
  vi.useFakeTimers();
});

beforeEach(() => {
  scrollToSpy = vi.fn();
  window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

const dataProvider = fakeDataProvider({});

function Providers({
  store,
  entries,
  state,
  children,
}: {
  store: ReturnType<typeof createStore>;
  entries: string[];
  state?: unknown;
  children: React.ReactNode;
}) {
  const initialEntries =
    state != null ? [{ pathname: entries[0], state }] : entries;
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AdminContext
        dataProvider={dataProvider}
        queryClient={new QueryClient()}
        store={store}
      >
        {children}
      </AdminContext>
    </MemoryRouter>
  );
}

function ScrollToTopProbe() {
  useScrollToTop();
  return <div>probe</div>;
}

describe("useScrollToTop (§0a-14)", () => {
  it("scrolls to top when the location state carries _scrollToTop", () => {
    const store = createStore();
    render(
      <Providers store={store} entries={["/x"]} state={{ _scrollToTop: true }}>
        <ScrollToTopProbe />
      </Providers>,
    );
    act(() => vi.runAllTimers());
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it("does NOT scroll when _scrollToTop is absent", () => {
    const store = createStore();
    render(
      <Providers store={store} entries={["/x"]}>
        <ScrollToTopProbe />
      </Providers>,
    );
    act(() => vi.runAllTimers());
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});

describe("RestoreScrollPosition (§0a-14)", () => {
  it("restores the saved scroll position on mount", () => {
    const store = createStore();
    store.setItem("scrollPosition.posts", 420);
    render(
      <Providers store={store} entries={["/posts"]}>
        <RestoreScrollPosition storeKey="posts">
          <div>list</div>
        </RestoreScrollPosition>
      </Providers>,
    );
    expect(scrollToSpy).toHaveBeenCalledWith(0, 420);
  });

  it("skips restore when the navigation wanted the top (_scrollToTop)", () => {
    const store = createStore();
    store.setItem("scrollPosition.posts", 420);
    render(
      <Providers
        store={store}
        entries={["/posts"]}
        state={{ _scrollToTop: true }}
      >
        <RestoreScrollPosition storeKey="posts">
          <div>list</div>
        </RestoreScrollPosition>
      </Providers>,
    );
    expect(scrollToSpy).not.toHaveBeenCalledWith(0, 420);
  });

  it("persists window.scrollY under the store key, debounced", () => {
    const store = createStore();
    render(
      <Providers store={store} entries={["/posts"]}>
        <RestoreScrollPosition storeKey="posts" debounce={250}>
          <div>list</div>
        </RestoreScrollPosition>
      </Providers>,
    );
    // Simulate a scroll burst.
    Object.defineProperty(window, "scrollY", { value: 88, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    // Not yet persisted (debounced).
    expect(store.getItem("scrollPosition.posts")).toBeUndefined();
    act(() => vi.advanceTimersByTime(250));
    expect(store.getItem<number>("scrollPosition.posts")).toBe(88);
  });
});
