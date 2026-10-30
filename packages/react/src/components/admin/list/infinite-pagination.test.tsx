/**
 * `<InfinitePagination>`: a Load more button plus an optional scroll sentinel,
 * driven by the ambient infinite list context. The context is stubbed so each
 * test controls `hasNextPage` / `isFetchingNextPage` directly.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ListContextProvider, type ListContextValue } from "../../../form";
import { InfinitePagination } from "./infinite-pagination";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

function makeList(overrides: Record<string, unknown> = {}): ListContextValue {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    filter: {},
    displayedFilters: {},
    selectedIds: [],
    data: [{ id: 1 }],
    total: undefined,
    pageInfo: undefined,
    isPending: false,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
    error: null,
    hasNextPage: true,
    hasPreviousPage: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    setSort: vi.fn(),
    setFilters: vi.fn(),
    showFilter: vi.fn(),
    hideFilter: vi.fn(),
    select: vi.fn(),
    toggleItem: vi.fn(),
    unselectAll: vi.fn(),
    selectAll: vi.fn(),
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    fetchPreviousPage: vi.fn(),
    ...overrides,
  } as unknown as ListContextValue;
}

function tree(value: ListContextValue, node: ReactNode) {
  return (
    <Providers>
      <ListContextProvider value={value}>{node}</ListContextProvider>
    </Providers>
  );
}

function wrap(value: ListContextValue, node: ReactNode) {
  return render(tree(value, node));
}

/** An `IntersectionObserver` double that records every instance it creates. */
class FakeObserver {
  static instances: FakeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }
  /** Report the sentinel as in or out of view. */
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function stubObserver() {
  FakeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
}

describe("<InfinitePagination>", () => {
  it("shows Load more while hasNextPage and calls fetchNextPage on click", () => {
    const value = makeList();
    wrap(value, <InfinitePagination />);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(value.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("disables Load more while isFetchingNextPage", () => {
    const value = makeList({ isFetchingNextPage: true });
    wrap(value, <InfinitePagination />);
    const button = screen.getByRole("button", { name: "Load more" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(value.fetchNextPage).not.toHaveBeenCalled();
  });

  it("shows the end message and no button when hasNextPage is false", () => {
    wrap(makeList({ hasNextPage: false }), <InfinitePagination />);
    expect(screen.getByText("No more rows")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing while the first page is loading", () => {
    const { container } = wrap(
      makeList({ isPending: true, data: undefined, hasNextPage: undefined }),
      <InfinitePagination />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders nothing for an empty list with no next page", () => {
    const { container } = wrap(
      makeList({ data: [], hasNextPage: false }),
      <InfinitePagination />,
    );
    expect(container.textContent).toBe("");
  });

  it("uses the catalog labels when they exist", () => {
    const i18n = createI18n({
      locale: "en",
      messages: {
        en: defineMessages({
          "chelone.navigation.load_more": "Plus",
          "chelone.navigation.no_more_rows": "Fin",
        }),
      },
    });
    const node = (value: ListContextValue) => (
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={new QueryClient()}
        i18n={i18n}
      >
        <ListContextProvider value={value}>
          <InfinitePagination />
        </ListContextProvider>
      </CheloneProvider>
    );
    const { rerender } = render(node(makeList()));
    expect(screen.getByRole("button", { name: "Plus" })).toBeTruthy();
    rerender(node(makeList({ hasNextPage: false })));
    expect(screen.getByText("Fin")).toBeTruthy();
  });

  it("autoLoad calls fetchNextPage when the sentinel intersects, only while hasNextPage and not fetching", () => {
    stubObserver();
    const value = makeList();
    const { rerender } = wrap(value, <InfinitePagination offset={100} />);

    expect(FakeObserver.instances).toHaveLength(1);
    const observer = FakeObserver.instances[0];
    expect(observer.options?.rootMargin).toBe("0px 0px 100px 0px");

    act(() => observer.trigger(false));
    expect(value.fetchNextPage).not.toHaveBeenCalled();
    act(() => observer.trigger(true));
    expect(value.fetchNextPage).toHaveBeenCalledTimes(1);

    // While a page is loading the old observer is released and none is active.
    const fetching = makeList({
      isFetchingNextPage: true,
      fetchNextPage: value.fetchNextPage,
    });
    rerender(tree(fetching, <InfinitePagination offset={100} />));
    expect(observer.disconnect).toHaveBeenCalled();
    const live = FakeObserver.instances.filter(
      (o) => o.disconnect.mock.calls.length === 0,
    );
    expect(live).toHaveLength(0);

    // Done fetching, but no next page: nothing observes.
    const ended = makeList({
      hasNextPage: false,
      fetchNextPage: value.fetchNextPage,
    });
    rerender(tree(ended, <InfinitePagination offset={100} />));
    expect(
      FakeObserver.instances.filter(
        (o) => o.disconnect.mock.calls.length === 0,
      ),
    ).toHaveLength(0);
    expect(value.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("keeps Load more visible when autoLoad is on", () => {
    stubObserver();
    wrap(makeList(), <InfinitePagination />);
    expect(screen.getByRole("button", { name: "Load more" })).toBeTruthy();
  });

  it("autoLoad false creates no IntersectionObserver", () => {
    stubObserver();
    wrap(makeList(), <InfinitePagination autoLoad={false} />);
    expect(FakeObserver.instances).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Load more" })).toBeTruthy();
  });

  it("creates no observer without IntersectionObserver and still shows the button", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const value = makeList();
    wrap(value, <InfinitePagination />);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(value.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("unmount disconnects the IntersectionObserver", () => {
    stubObserver();
    const { unmount } = wrap(makeList(), <InfinitePagination />);
    const observer = FakeObserver.instances[0];
    expect(observer.disconnect).not.toHaveBeenCalled();
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});
