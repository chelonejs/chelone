/**
 * `FilterContext` — the ambient list of filter ELEMENT nodes (a `ReactNode[]`),
 * so list sub-components (a filter form, a "add filter" button) can read the
 * declared `<Filter>` inputs without prop-drilling. Parity with ra-core's
 * `FilterContext`.
 *
 * IMPORTANT: this holds the filter *elements*, NOT the filter-VALUES slice
 * (that lives on the list controller). The default is `undefined`, and
 * `useFilterContext()` is NON-THROWING — it returns `undefined` outside any
 * provider, matching ra-core (a plain `useContext` read, no invariant).
 *
 * ra-core exposes only the raw context (consumers write `<FilterContext.Provider>`
 * directly). Chelone additionally ships a thin `FilterContextProvider` wrapper
 * for call-site symmetry with the package's other context providers; both the
 * raw context and the wrapper are exported.
 */

import { createContext, type ReactNode, useContext } from "react";

/** The list of filter element nodes, or `undefined` when none is in scope. */
export type FilterContextType = ReactNode[] | undefined;

/** Holds the ambient filter elements. Default `undefined`. */
export const FilterContext = createContext<FilterContextType>(undefined);

FilterContext.displayName = "FilterContext";

export interface FilterContextProviderProps {
  /** The array of filter element nodes to publish to the subtree. */
  value: FilterContextType;
  children: ReactNode;
}

/**
 * Publish the ambient filter elements to the subtree. A thin wrapper over
 * `FilterContext.Provider` (chelone-only convenience; ra-core uses the raw
 * `FilterContext.Provider` directly).
 */
export function FilterContextProvider({
  value,
  children,
}: FilterContextProviderProps): ReactNode {
  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

/**
 * Read the ambient filter elements. Returns `undefined` outside a provider
 * (non-throwing, parity with ra-core's `useFilterContext`).
 */
export function useFilterContext(): FilterContextType {
  return useContext(FilterContext);
}
