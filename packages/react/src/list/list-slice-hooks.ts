/**
 * List-slice hooks — the pagination / sort / filter / selection views of the
 * ambient list that ra-core surfaces through dedicated `useListPaginationContext`
 * / `useListSortContext` / `useListFilterContext` hooks and a `useUnselect`
 * factory.
 *
 * Chelone owns ONE list context (`useListContext` → the list-controller result),
 * so these are pure re-selections of that single value — there are no separate
 * providers. The shadmin list components (pagination, filter-form, bulk bar) are
 * ported to read these slices, keeping their call sites API-compatible with the
 * ra-core originals while binding to the chelone controller shape.
 *
 * Chelone divergences from ra-core these hooks paper over:
 * - `sort` is a `SortPayload[]` (multi-sort first-class), NOT a single
 *   `{field,order}`. `useListSortContext` exposes the array; consumers that need
 *   the primary column derive `sort[0]`.
 * - the filter values live on `filter` (not `filterValues`). The filter slice
 *   re-labels it to `filterValues` for shadmin-call-site parity.
 * - selection actions are `select` / `toggleItem` / `unselectAll` (not
 *   `onSelect` / `onToggleItem` / `onUnselectItems`). `useUnselect` builds a
 *   ra-shaped `unselect(ids?)` on top of `toggleItem` / `unselectAll`.
 */
import type { FilterPayload, Identifier, SortPayload } from "@chelone/core";
import { useCallback, useMemo } from "react";
import { type ListContextValue, useListContext } from "../form";

/** The pagination slice of the ambient list. */
export interface ListPaginationContextValue {
  page: number;
  perPage: number;
  total: number | undefined;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  setPage: ListContextValue["setPage"];
  setPerPage: ListContextValue["setPerPage"];
}

/**
 * The pagination slice of the ambient list (page/perPage/total + the paging
 * actions). Parity with ra-core's `useListPaginationContext`.
 */
export function useListPaginationContext(): ListPaginationContextValue {
  const {
    page,
    perPage,
    total,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPerPage,
  } = useListContext();
  return useMemo(
    () => ({
      page,
      perPage,
      total,
      hasNextPage,
      hasPreviousPage,
      setPage,
      setPerPage,
    }),
    [page, perPage, total, hasNextPage, hasPreviousPage, setPage, setPerPage],
  );
}

/** The sort slice of the ambient list. */
export interface ListSortContextValue {
  /**
   * The full multi-sort array (chelone models sort as `SortPayload[]`). A
   * single-column consumer reads `sort[0]`.
   */
  sort: SortPayload[];
  setSort: ListContextValue["setSort"];
}

/**
 * The sort slice of the ambient list. Parity with ra-core's
 * `useListSortContext`, adapted to chelone's first-class multi-sort array.
 */
export function useListSortContext(): ListSortContextValue {
  const { sort, setSort } = useListContext();
  return useMemo(() => ({ sort: sort ?? [], setSort }), [sort, setSort]);
}

/** The filter slice of the ambient list. */
export interface ListFilterContextValue {
  /** ra-core name for the current user filter (chelone stores it on `filter`). */
  filterValues: FilterPayload;
  displayedFilters: ListContextValue["displayedFilters"];
  setFilters: ListContextValue["setFilters"];
  showFilter: ListContextValue["showFilter"];
  hideFilter: ListContextValue["hideFilter"];
}

/**
 * The filter slice of the ambient list (values + displayed-filters + the filter
 * actions). Parity with ra-core's `useListFilterContext`; re-labels chelone's
 * `filter` to `filterValues` so shadmin filter call sites port unchanged.
 */
export function useListFilterContext(): ListFilterContextValue {
  const { filter, displayedFilters, setFilters, showFilter, hideFilter } =
    useListContext();
  return useMemo(
    () => ({
      filterValues: filter ?? {},
      displayedFilters: displayedFilters ?? {},
      setFilters,
      showFilter,
      hideFilter,
    }),
    [filter, displayedFilters, setFilters, showFilter, hideFilter],
  );
}

/**
 * Returns an `unselect(ids?)` callback for the ambient list. Called with a
 * subset of ids, it toggles OFF each currently-selected id in that subset;
 * called with no argument, it clears the whole selection. Parity with ra-core's
 * `useUnselect` (which returns `unselect(ids)` off the list selection actions).
 *
 * The callback identity is stable across renders (memoized on the controller
 * actions, which are themselves stable), so it is safe to pass to child props
 * without forcing re-renders.
 */
export function useUnselect(): (ids?: Identifier[]) => void {
  const { selectedIds, toggleItem, unselectAll } = useListContext();
  return useCallback(
    (ids?: Identifier[]) => {
      if (!ids || ids.length === 0) {
        unselectAll();
        return;
      }
      // Toggle OFF only the ids that are currently selected — toggling an
      // unselected id would erroneously SELECT it.
      for (const id of ids) {
        if (selectedIds.includes(id)) toggleItem(id);
      }
    },
    [selectedIds, toggleItem, unselectAll],
  );
}
