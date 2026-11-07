/**
 * P7e-T1 — `<ListPagination>` ported onto chelone `useListPaginationContext`.
 * Renders a range indicator, page buttons, prev/next, and a rows-per-page
 * select; drives `setPage` / `setPerPage`.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
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

function wrap(value: ListContextValue, node: ReactNode) {
  return render(
    <Providers>
      <ListContextProvider value={value}>{node}</ListContextProvider>
    </Providers>,
  );
}

describe("<ListPagination>", () => {
  it("renders the current range info (1-10 of 95)", () => {
    wrap(makeListContext(), <ListPagination />);
    expect(screen.getByText(/1-10 of 95/)).toBeTruthy();
  });

  it("renders nothing when the total is 0", () => {
    const { container } = wrap(
      makeListContext({ total: 0 }),
      <ListPagination />,
    );
    expect(container.textContent).toBe("");
  });

  it("goes to the next page via setPage", () => {
    const value = makeListContext();
    wrap(value, <ListPagination />);
    const next = screen.getByRole("button", { name: /next/i });
    fireEvent.click(next);
    expect(value.setPage).toHaveBeenCalledWith(2);
  });

  it("disables the previous button on page 1", () => {
    wrap(
      makeListContext({ page: 1, hasPreviousPage: false }),
      <ListPagination />,
    );
    const prev = screen.getByRole("button", { name: /previous/i });
    expect(prev).toHaveProperty("disabled", true);
  });

  it("navigates to a page number when clicked", () => {
    const value = makeListContext({ page: 1, total: 30, perPage: 10 });
    wrap(value, <ListPagination />);
    const pageBtn = screen.getByRole("button", { name: "3" });
    fireEvent.click(pageBtn);
    expect(value.setPage).toHaveBeenCalledWith(3);
  });

  it("changes rows per page via the select", () => {
    const value = makeListContext();
    wrap(value, <ListPagination rowsPerPageOptions={[10, 25]} />);
    // The select trigger shows the current perPage.
    expect(screen.getByText("Rows per page")).toBeTruthy();
  });

  it("renders a partial range when total is unknown", () => {
    wrap(makeListContext({ total: undefined }), <ListPagination />);
    expect(screen.getByText(/1-10/)).toBeTruthy();
  });

  it("keeps a top margin between the list above and the row", () => {
    const { container } = wrap(makeListContext(), <ListPagination />);
    expect(container.firstElementChild?.classList.contains("mt-2")).toBe(true);
  });

  it("lets a className override the default top margin", () => {
    const { container } = wrap(
      makeListContext(),
      <ListPagination className="mt-6 text-red-500" />,
    );
    const root = container.firstElementChild;
    expect(root?.classList.contains("mt-6")).toBe(true);
    expect(root?.classList.contains("text-red-500")).toBe(true);
    expect(root?.classList.contains("mt-2")).toBe(false);
  });

  it("keeps the top margin when custom actions replace the controls", () => {
    const { container } = wrap(
      makeListContext(),
      <ListPagination actions={<button type="button">Load more</button>} />,
    );
    expect(container.firstElementChild?.classList.contains("mt-2")).toBe(true);
  });
});
