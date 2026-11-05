import { vi } from "vitest";
import type { ListContextValue } from "../form";

/**
 * A whole `ListContextValue` with real defaults, so a test that builds its own
 * list context overrides only the fields it exercises and passes the result to a
 * `<ListContextProvider>` with no cast. Every action is a `vi.fn()`; `selectAll`
 * resolves `void` because the real one is awaited.
 *
 * `total` 95 with `hasNextPage` true is what a bare call is asked for most: a
 * populated list with a next page (`<ListPagination>` reads both). A test that
 * renders rows overrides `data`; one that drives selection overrides
 * `selectedIds`.
 *
 * A harness that runs a real list controller (`useList`, `useListController`)
 * passes that result as it is instead: it is already a `ListContextValue` (pinned
 * in `list-context.test-d.ts`), and copying it through here would let these
 * defaults stand in for a field the controller stopped providing.
 */
export function makeListContext(
  overrides: Partial<ListContextValue> = {},
): ListContextValue {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    filter: {},
    displayedFilters: {},
    selectedIds: [],
    data: undefined,
    total: 95,
    pageInfo: undefined,
    isPending: false,
    isFetching: false,
    error: null,
    hasNextPage: true,
    hasPreviousPage: false,
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    setSort: vi.fn(),
    setFilters: vi.fn(),
    setParams: vi.fn(),
    showFilter: vi.fn(),
    hideFilter: vi.fn(),
    select: vi.fn(),
    toggleItem: vi.fn(),
    unselectAll: vi.fn(),
    selectAll: vi.fn(async () => {}),
    refetch: vi.fn(),
    ...overrides,
  };
}
