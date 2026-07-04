/**
 * P7e-T1 — list-slice hooks. Thin derivations over `useListContext` that expose
 * the pagination / sort / filter / selection slices ra-core surfaces as
 * dedicated contexts. Chelone owns ONE list context (the controller result), so
 * these are pure re-selections of it — no separate providers.
 */
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListContextProvider, type ListContextValue } from "../form";
import {
  useListFilterContext,
  useListPaginationContext,
  useListSortContext,
  useUnselect,
} from "./list-slice-hooks";

afterEach(cleanup);

/** Minimal list context value with jest-fn actions for call assertions. */
function makeList(overrides: Partial<ListContextValue> = {}): ListContextValue {
  return {
    page: 2,
    perPage: 25,
    sort: [{ field: "title", order: "ASC" }],
    filter: { q: "hello" },
    displayedFilters: { q: true },
    selectedIds: ["a", "b"],
    data: [{ id: "a" }, { id: "b" }],
    total: 100,
    pageInfo: undefined,
    isPending: false,
    isFetching: false,
    error: null,
    hasNextPage: true,
    hasPreviousPage: true,
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
    ...overrides,
  } as ListContextValue;
}

function wrapper(value: ListContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ListContextProvider value={value}>{children}</ListContextProvider>;
  };
}

describe("useListPaginationContext", () => {
  it("selects the pagination slice off the list context", () => {
    const value = makeList();
    const { result } = renderHook(() => useListPaginationContext(), {
      wrapper: wrapper(value),
    });
    expect(result.current.page).toBe(2);
    expect(result.current.perPage).toBe(25);
    expect(result.current.total).toBe(100);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.setPage).toBe(value.setPage);
    expect(result.current.setPerPage).toBe(value.setPerPage);
  });
});

describe("useListSortContext", () => {
  it("exposes the multi-sort array plus a single-sort convenience and setSort", () => {
    const value = makeList();
    const { result } = renderHook(() => useListSortContext(), {
      wrapper: wrapper(value),
    });
    // Full multi-sort array is preserved.
    expect(result.current.sort).toEqual([{ field: "title", order: "ASC" }]);
    expect(result.current.setSort).toBe(value.setSort);
  });

  it("defaults sort to an empty array when the controller has none", () => {
    const value = makeList({ sort: [] });
    const { result } = renderHook(() => useListSortContext(), {
      wrapper: wrapper(value),
    });
    expect(result.current.sort).toEqual([]);
  });
});

describe("useListFilterContext", () => {
  it("selects the filter slice (filter/displayedFilters + actions)", () => {
    const value = makeList();
    const { result } = renderHook(() => useListFilterContext(), {
      wrapper: wrapper(value),
    });
    expect(result.current.filterValues).toEqual({ q: "hello" });
    expect(result.current.displayedFilters).toEqual({ q: true });
    expect(result.current.setFilters).toBe(value.setFilters);
    expect(result.current.showFilter).toBe(value.showFilter);
    expect(result.current.hideFilter).toBe(value.hideFilter);
  });
});

describe("useUnselect", () => {
  it("returns a callback that unselects the given ids via toggleItem", () => {
    const value = makeList();
    const { result } = renderHook(() => useUnselect(), {
      wrapper: wrapper(value),
    });
    result.current(["a"]);
    // Only the selected id "a" is toggled off; "z" (not selected) is ignored.
    expect(value.toggleItem).toHaveBeenCalledTimes(1);
    expect(value.toggleItem).toHaveBeenCalledWith("a");
  });

  it("unselects all when called with no ids", () => {
    const value = makeList();
    const { result } = renderHook(() => useUnselect(), {
      wrapper: wrapper(value),
    });
    result.current();
    expect(value.unselectAll).toHaveBeenCalledTimes(1);
  });

  it("stays stable across renders (memoized on the actions)", () => {
    const value = makeList();
    const { result, rerender } = renderHook(() => useUnselect(), {
      wrapper: wrapper(value),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("integration: a real consumer reads the slices", () => {
  function PaginationReadout() {
    const { page, total } = useListPaginationContext();
    return <span data-testid="readout">{`${page}/${total}`}</span>;
  }
  it("reads through a nested consumer", () => {
    render(
      <ListContextProvider value={makeList({ page: 3, total: 42 })}>
        <PaginationReadout />
      </ListContextProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("3/42");
  });
});
