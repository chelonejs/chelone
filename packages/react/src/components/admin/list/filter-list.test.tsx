/**
 * `<FilterList>`, `<FilterListSection>` and `<FilterListItem>`: one-click list
 * filters in a sidebar. Mounted under `<CheloneProvider>` and a list context
 * whose `setFilters` is a spy; assertions are on DOM, roles and that spy.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ListContextProvider, type ListContextValue } from "../../../form";
import { FilterList } from "./filter-list";
import { FilterListItem } from "./filter-list-item";
import { FilterListSection } from "./filter-list-section";

afterEach(cleanup);

function mount(
  ui: ReactNode,
  {
    filter = {},
    messages = {},
  }: {
    filter?: Record<string, unknown>;
    messages?: Record<string, string>;
  } = {},
) {
  const setFilters = vi.fn();
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  const value = { filter, setFilters } as unknown as ListContextValue;
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ListContextProvider value={value}>{ui}</ListContextProvider>
    </CheloneProvider>,
  );
  return { setFilters };
}

describe("<FilterListItem>", () => {
  it("clicking an unselected item sets its value as the list filter", () => {
    const { setFilters } = mount(
      <FilterListItem label="Draft" value={{ status: "draft" }} />,
      { filter: { q: "x" } },
    );
    const toggle = screen.getByRole("button", { name: "Draft" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(setFilters).toHaveBeenCalledWith({ q: "x", status: "draft" });
  });

  it("clicking a selected item removes only its keys", () => {
    const { setFilters } = mount(
      <FilterListItem label="Draft" value={{ status: "draft" }} />,
      { filter: { q: "x", status: "draft" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(setFilters).toHaveBeenCalledWith({ q: "x" });
  });

  it("a selected item is aria-pressed and its clear control is not inside the toggle button", () => {
    const { setFilters } = mount(
      <ul>
        <FilterListItem label="Draft" value={{ status: "draft" }} />
        <FilterListItem label="Live" value={{ status: "live" }} />
      </ul>,
      { filter: { status: "draft" } },
    );
    const toggle = screen.getByRole("button", { name: "Draft" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("data-selected")).toBe("true");
    expect(toggle.closest("li")?.classList).toContain(
      "filter-list-item-selected",
    );
    const clear = screen.getByRole("button", { name: "Remove filter" });
    expect(toggle.contains(clear)).toBe(false);
    expect(clear.closest("li")).toBe(toggle.closest("li"));
    // only the selected item has a clear control
    expect(
      screen.getAllByRole("button", { name: "Remove filter" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Live" }).getAttribute("aria-pressed"),
    ).toBe("false");
    fireEvent.click(clear);
    expect(setFilters).toHaveBeenCalledWith({});
  });

  it("isSelected and toggleFilter props replace the defaults", () => {
    const isSelected = vi.fn(() => true);
    const toggleFilter = vi.fn(() => ({ custom: 1 }));
    const { setFilters } = mount(
      <FilterListItem
        label="Draft"
        value={{ status: "draft" }}
        isSelected={isSelected}
        toggleFilter={toggleFilter}
      />,
      { filter: { q: "x" } },
    );
    expect(isSelected).toHaveBeenCalledWith({ status: "draft" }, { q: "x" });
    expect(
      screen
        .getByRole("button", { name: "Draft" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(toggleFilter).toHaveBeenCalledWith({ status: "draft" }, { q: "x" });
    expect(setFilters).toHaveBeenCalledWith({ custom: 1 });
  });

  it("a string label is translated with itself as the fallback", () => {
    mount(
      <ul>
        <FilterListItem label="filters.draft" value={{ status: "draft" }} />
        <FilterListItem label="Live" value={{ status: "live" }} />
        <FilterListItem
          label={<em data-testid="el">Archived</em>}
          value={{ status: "archived" }}
        />
      </ul>,
      { messages: { "filters.draft": "Brouillon" } },
    );
    expect(screen.getByRole("button", { name: "Brouillon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Live" })).toBeTruthy();
    expect(screen.getByTestId("el").closest("button")).toBeTruthy();
  });
});

describe("<FilterList>", () => {
  it("renders the translated label, the icon and its items in a list", () => {
    mount(
      <FilterList
        label="filters.status"
        icon={<svg data-testid="icon" aria-hidden="true" />}
      >
        <FilterListItem label="Draft" value={{ status: "draft" }} />
        <FilterListItem label="Live" value={{ status: "live" }} />
      </FilterList>,
      { messages: { "filters.status": "Statut" } },
    );
    expect(screen.getByText("Statut")).toBeTruthy();
    expect(screen.getByTestId("icon")).toBeTruthy();
    const list = screen.getByRole("list");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(list.contains(screen.getByRole("button", { name: "Draft" }))).toBe(
      true,
    );
  });
});

describe("<FilterListSection>", () => {
  it("renders its children without a list", () => {
    mount(
      <FilterListSection label="Status">
        <p>custom content</p>
      </FilterListSection>,
    );
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("custom content")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
