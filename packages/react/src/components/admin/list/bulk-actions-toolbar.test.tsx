/**
 * P7e-T1 — `<BulkActionsToolbar>` ported onto chelone `useListContext`
 * selection. Sticky bar that shows the selected-row count + an unselect-all
 * control + custom bulk children; hidden when nothing is selected.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect, useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import type { ListContextValue } from "../../../form";
import { ListContextProvider } from "../../../form";
import { useList } from "../../../use-list";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";

afterEach(cleanup);

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

const ROWS = [
  { id: 1, title: "a" },
  { id: 2, title: "b" },
];

function Harness({
  selectedIds = [],
  children,
}: {
  selectedIds?: Array<number>;
  children?: ReactNode;
}) {
  return (
    <Providers>
      <Inner selectedIds={selectedIds}>
        <BulkActionsToolbar>{children}</BulkActionsToolbar>
      </Inner>
    </Providers>
  );
}

function Inner({
  selectedIds,
  children,
}: {
  selectedIds: number[];
  children: ReactNode;
}) {
  const list = useList({ data: ROWS });
  // Seed the selection once via the controller action (effect, not render).
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && selectedIds.length > 0) {
      seeded.current = true;
      list.select(selectedIds);
    }
  }, [list, selectedIds]);
  return (
    <ListContextProvider value={list as unknown as ListContextValue}>
      {children}
    </ListContextProvider>
  );
}

describe("<BulkActionsToolbar>", () => {
  it("renders nothing when no rows are selected", () => {
    const { container } = render(<Harness selectedIds={[]} />);
    expect(container.textContent).toBe("");
  });

  it("shows the selected count when rows are selected", () => {
    render(<Harness selectedIds={[1, 2]} />);
    // The count text mentions the number of selected rows.
    expect(screen.getByText(/2/)).toBeTruthy();
  });

  it("renders custom bulk children", () => {
    render(
      <Harness selectedIds={[1]}>
        <button type="button">Delete</button>
      </Harness>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  it("clears the selection when the unselect control is clicked", () => {
    render(<Harness selectedIds={[1, 2]} />);
    const unselect = screen.getByRole("button", { name: /unselect/i });
    fireEvent.click(unselect);
    // After unselecting, the toolbar disappears (no selection).
    expect(screen.queryByText(/selected/i)).toBeNull();
  });
});
