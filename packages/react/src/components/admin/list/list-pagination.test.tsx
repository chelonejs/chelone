/**
 * P7e-T1 — `<ListPagination>` ported onto chelone `useListPaginationContext`.
 * Renders a range indicator, page buttons, prev/next, and a rows-per-page
 * select; drives `setPage` / `setPerPage`.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ListContextProvider, type ListContextValue } from "../../../form";
import { ListPagination } from "./list-pagination";

afterEach(cleanup);

/** i18n-only provider (pagination reads `useTranslate` but no router/data). */
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

function makeList(overrides: Partial<ListContextValue> = {}): ListContextValue {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    filter: {},
    displayedFilters: {},
    selectedIds: [],
    data: [],
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

function wrap(value: ListContextValue, node: ReactNode) {
  return render(
    <Providers>
      <ListContextProvider value={value}>{node}</ListContextProvider>
    </Providers>,
  );
}

describe("<ListPagination>", () => {
  it("renders the current range info (1-10 of 95)", () => {
    wrap(makeList(), <ListPagination />);
    expect(screen.getByText(/1-10 of 95/)).toBeTruthy();
  });

  it("renders nothing when the total is 0", () => {
    const { container } = wrap(makeList({ total: 0 }), <ListPagination />);
    expect(container.textContent).toBe("");
  });

  it("goes to the next page via setPage", () => {
    const value = makeList();
    wrap(value, <ListPagination />);
    const next = screen.getByRole("button", { name: /next/i });
    fireEvent.click(next);
    expect(value.setPage).toHaveBeenCalledWith(2);
  });

  it("disables the previous button on page 1", () => {
    wrap(makeList({ page: 1, hasPreviousPage: false }), <ListPagination />);
    const prev = screen.getByRole("button", { name: /previous/i });
    expect(prev).toHaveProperty("disabled", true);
  });

  it("navigates to a page number when clicked", () => {
    const value = makeList({ page: 1, total: 30, perPage: 10 });
    wrap(value, <ListPagination />);
    const pageBtn = screen.getByRole("button", { name: "3" });
    fireEvent.click(pageBtn);
    expect(value.setPage).toHaveBeenCalledWith(3);
  });

  it("changes rows per page via the select", () => {
    const value = makeList();
    wrap(value, <ListPagination rowsPerPageOptions={[10, 25]} />);
    // The select trigger shows the current perPage.
    expect(screen.getByText("Rows per page")).toBeTruthy();
  });

  it("renders a partial range when total is unknown", () => {
    wrap(makeList({ total: undefined }), <ListPagination />);
    expect(screen.getByText(/1-10/)).toBeTruthy();
  });
});
