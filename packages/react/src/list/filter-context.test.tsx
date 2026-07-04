/**
 * `FilterContext` / `FilterContextProvider` / `useFilterContext()` — makes the
 * list of filter ELEMENT nodes (a `ReactNode[]`, NOT the filter-values slice)
 * accessible to sub-components. Parity with ra-core's `FilterContext`.
 *
 * Contract:
 * - `useFilterContext()` is NON-THROWING: returns `undefined` outside any
 *   provider (the context default);
 * - inside a provider it returns the exact `value` (the array of filter nodes);
 * - a nested provider overrides the outer one for its subtree.
 */

import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FilterContextProvider, useFilterContext } from "./filter-context";

afterEach(() => {
  cleanup();
});

describe("useFilterContext", () => {
  it("returns undefined outside a provider (non-throwing)", () => {
    const { result } = renderHook(() => useFilterContext());
    expect(result.current).toBeUndefined();
  });

  it("returns the array of filter nodes from the provider", () => {
    const filters = [<input key="q" />, <input key="status" />];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterContextProvider value={filters}>{children}</FilterContextProvider>
    );
    const { result } = renderHook(() => useFilterContext(), { wrapper });
    expect(result.current).toBe(filters);
  });

  it("lets a nested provider override the outer value", () => {
    const outer = [<input key="a" />];
    const inner = [<input key="b" />];
    const Probe = () => {
      const filters = useFilterContext();
      return <span>{filters?.length ?? "none"}</span>;
    };
    render(
      <FilterContextProvider value={outer}>
        <FilterContextProvider value={inner}>
          <Probe />
        </FilterContextProvider>
      </FilterContextProvider>,
    );
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("can provide undefined explicitly", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterContextProvider value={undefined}>
        {children}
      </FilterContextProvider>
    );
    const { result } = renderHook(() => useFilterContext(), { wrapper });
    expect(result.current).toBeUndefined();
  });
});
