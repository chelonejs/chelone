/**
 * `<FilterLiveSearch>`: a search box that writes its text into the ambient
 * list's filter. The list surface is a `ListContextProvider` value with a
 * `setFilters` spy; assertions are on the input and on what the list is told.
 */
import {
  createI18n,
  defineMessages,
  type FilterPayload,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
import { CheloneProvider } from "../../../context";
import { ListContextProvider } from "../../../form";
import { FilterLiveSearch } from "./filter-live-search";

afterEach(cleanup);

function tree(ui: ReactNode, filter: FilterPayload, setFilters = vi.fn()) {
  const value = makeListContext({ filter, setFilters });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: {
          en: defineMessages({ "chelone.action.search": "Search posts" }),
        },
      })}
    >
      <ListContextProvider value={value}>{ui}</ListContextProvider>
    </CheloneProvider>
  );
}

function mount(ui: ReactNode, filter: FilterPayload = {}) {
  const setFilters = vi.fn();
  const result = render(tree(ui, filter, setFilters));
  return {
    setFilters,
    rerender: (next: FilterPayload) =>
      result.rerender(tree(ui, next, setFilters)),
  };
}

describe("<FilterLiveSearch>", () => {
  it("typing sets the q filter on the list", async () => {
    const { setFilters } = mount(<FilterLiveSearch />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
    await waitFor(() =>
      expect(setFilters).toHaveBeenCalledWith({ q: "abc" }, undefined, true),
    );
  });

  it("source and placeholder props change the filter key and the hint", async () => {
    const { setFilters } = mount(
      <FilterLiveSearch source="title" placeholder="Find a title" />,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("placeholder")).toBe("Find a title");
    fireEvent.change(input, { target: { value: "abc" } });
    await waitFor(() =>
      expect(setFilters).toHaveBeenCalledWith(
        { title: "abc" },
        undefined,
        true,
      ),
    );
  });

  it("shows a q filter set elsewhere", () => {
    const { rerender } = mount(<FilterLiveSearch />, { q: "hello" });
    const input = elementOf(screen.getByRole("textbox"), HTMLInputElement);
    expect(input.value).toBe("hello");
    expect(input.getAttribute("placeholder")).toBe("Search posts");
    rerender({ q: "later" });
    return waitFor(() => expect(input.value).toBe("later"));
  });
});
