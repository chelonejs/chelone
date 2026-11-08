/**
 * Tests: list-level buttons — `<ToggleFilterButton>`, `<SelectAllButton>` and
 * `<RefreshIconButton>`.
 *
 * Harness as `list-bulk-buttons.test.tsx`: a real `useListController("posts")`
 * over a `fakeDataProvider` feeds a `ListContextProvider`. A probe prints the
 * list's filter and selection so assertions read the DOM and the provider
 * calls, not the buttons' internals.
 */

import {
  createI18n,
  createNotificationStore,
  createResourceRegistry,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListController } from "../../../controller-hooks";
import { ListContextProvider, useListContext } from "../../../form";
import { useListFilterContext } from "../../../list/list-slice-hooks";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { SelectInput } from "../inputs/select-input";
import { TextInput } from "../inputs/text-input";
import { FilterForm } from "../list/filter-form";
import { FilterButton } from "./filter-button";
import { RefreshIconButton } from "./refresh-icon-button";
import { SelectAllButton } from "./select-all-button";
import { ToggleFilterButton } from "./toggle-filter-button";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.action.refresh": "Refresh",
        "chelone.action.select_all": "Select all",
        "app.reload": "Reload the data",
        "app.news": "Latest news",
      }),
    },
  });
}

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "One", category: "news" },
      { id: 2, title: "Two", category: "news" },
      { id: 3, title: "Three", category: "misc" },
      { id: 4, title: "Four", category: "misc" },
      { id: 5, title: "Five", category: "misc" },
    ],
  });
}

// FilterButton only reads the element's props; the input is rendered by DisplayedFilterInputs.
function TextFilter(_props: { source: string; alwaysOn?: boolean }) {
  return null;
}

/** A real filter input: `<FilterForm>` renders it, `alwaysOn` stays filter-only. */
function FilterTextInput({
  alwaysOn: _alwaysOn,
  ...inputProps
}: {
  source: string;
  alwaysOn?: boolean;
}) {
  return <TextInput {...inputProps} />;
}

/** A filter whose control is a `<Select>` trigger: no `input[name=...]`. */
function FilterSelectInput({
  alwaysOn: _alwaysOn,
  ...inputProps
}: {
  source: string;
  alwaysOn?: boolean;
}) {
  return (
    <SelectInput
      {...inputProps}
      choices={[
        { id: "news", name: "News" },
        { id: "misc", name: "Misc" },
      ]}
    />
  );
}

function DisplayedFilterInputs() {
  const { displayedFilters } = useListFilterContext();
  return (
    <>
      {Object.keys(displayedFilters).map((source) => (
        <input key={source} name={source} aria-label={`${source} input`} />
      ))}
    </>
  );
}

function Probe() {
  const { filterValues } = useListFilterContext();
  const { selectedIds } = useListContext();
  return (
    <>
      <output data-testid="filters">{JSON.stringify(filterValues)}</output>
      <output data-testid="selected">{selectedIds.join(",")}</output>
    </>
  );
}

function ListHarness({
  children,
  dataProvider = makeDataProvider(),
  perPage = 2,
  selectedIds = [],
}: {
  children: ReactNode;
  dataProvider?: DataProvider;
  perPage?: number;
  selectedIds?: number[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: true,
    hasEdit: true,
    hasShow: true,
  });
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={createNotificationStore()}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/posts"]}>
            <ResourceContextProvider value="posts">
              <ListInner perPage={perPage} selectedIds={selectedIds}>
                {children}
              </ListInner>
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

function ListInner({
  children,
  perPage,
  selectedIds,
}: {
  children: ReactNode;
  perPage: number;
  selectedIds: number[];
}) {
  const list = useListController("posts", { perPage });
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && selectedIds.length > 0 && list.data) {
      seeded.current = true;
      list.select(selectedIds);
    }
  }, [list, selectedIds]);
  return (
    <ListContextProvider value={list}>
      <Probe />
      {children}
    </ListContextProvider>
  );
}

const filters = () => screen.getByTestId("filters").textContent;
const selected = () => screen.getByTestId("selected").textContent;

describe("<ToggleFilterButton>", () => {
  it("clicking sets its value as the list filter and clicking again removes it", async () => {
    render(
      <ListHarness>
        <ToggleFilterButton label="News" value={{ category: "news" }} />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: "News" });
    expect(filters()).toBe("{}");

    fireEvent.click(button);
    await waitFor(() => expect(filters()).toBe('{"category":"news"}'));

    fireEvent.click(screen.getByRole("button", { name: "News" }));
    await waitFor(() => expect(filters()).toBe("{}"));
  });

  it("is aria-pressed while its value is in the filter and keeps other filters on toggle", async () => {
    render(
      <ListHarness>
        <ToggleFilterButton label="News" value={{ category: "news" }} />
        <ToggleFilterButton label="Mine" value={{ author: "me" }} />
      </ListHarness>,
    );
    const news = await screen.findByRole("button", { name: "News" });
    const mine = screen.getByRole("button", { name: "Mine" });
    expect(news.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(mine);
    await waitFor(() => expect(mine.getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(news);
    await waitFor(() => expect(news.getAttribute("aria-pressed")).toBe("true"));
    expect(JSON.parse(filters() ?? "")).toEqual({
      author: "me",
      category: "news",
    });

    fireEvent.click(news);
    await waitFor(() =>
      expect(news.getAttribute("aria-pressed")).toBe("false"),
    );
    expect(mine.getAttribute("aria-pressed")).toBe("true");
    expect(filters()).toBe('{"author":"me"}');
  });

  it("translates a string label with itself as the fallback", async () => {
    render(
      <ListHarness>
        <ToggleFilterButton label="app.news" value={{ category: "news" }} />
        <ToggleFilterButton label="Plain text" value={{ category: "misc" }} />
      </ListHarness>,
    );
    expect(
      await screen.findByRole("button", { name: "Latest news" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Plain text" })).toBeTruthy();
  });
});

/** Open the Radix menu from the keyboard: jsdom has no PointerEvent for the mouse path.
 * Returns the trigger, which is `aria-hidden` while the menu is open. */
async function openAddFilterMenu() {
  const trigger = await screen.findByRole("button", { name: "Add filter" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  return trigger;
}

describe("<FilterButton>", () => {
  it("showing a filter focuses its input", async () => {
    render(
      <ListHarness>
        <FilterButton filters={[<TextFilter key="title" source="title" />]} />
        <DisplayedFilterInputs />
      </ListHarness>,
    );
    await openAddFilterMenu();
    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Title" }),
    );

    const input = await screen.findByRole("textbox", { name: "title input" });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("showing a filter does not hand focus back to the Add filter trigger", async () => {
    render(
      <ListHarness>
        <FilterButton filters={[<TextFilter key="title" source="title" />]} />
        <DisplayedFilterInputs />
      </ListHarness>,
    );
    const trigger = await openAddFilterMenu();
    const triggerFocused = vi.fn();
    trigger.addEventListener("focus", triggerFocused);

    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Title" }),
    );

    const input = await screen.findByRole("textbox", { name: "title input" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(triggerFocused).not.toHaveBeenCalled();
  });

  it("closing the menu without showing a filter returns focus to the trigger", async () => {
    render(
      <ListHarness>
        <FilterButton filters={[<TextFilter key="title" source="title" />]} />
      </ListHarness>,
    );
    const trigger = await openAddFilterMenu();

    fireEvent.keyDown(trigger, { key: "Escape" });

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("showing a filter focuses the input its <FilterForm> renders", async () => {
    const filters = [<FilterTextInput key="title" source="title" />];
    render(
      <ListHarness>
        <FilterButton filters={filters} />
        <FilterForm filters={filters} />
      </ListHarness>,
    );
    await openAddFilterMenu();

    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Title" }),
    );

    const input = document.querySelector<HTMLInputElement>(
      "input[name='title']",
    );
    expect(input).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("showing a filter whose control is not an input leaves focus on the trigger", async () => {
    const filters = [<FilterSelectInput key="category" source="category" />];
    render(
      <ListHarness>
        <FilterButton filters={filters} />
        <FilterForm filters={filters} />
      </ListHarness>,
    );
    const trigger = await openAddFilterMenu();

    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Category" }),
    );

    expect(document.querySelector("input[name='category']")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("showing a filter whose source holds a quote focuses its input", async () => {
    render(
      <ListHarness>
        <FilterButton filters={[<TextFilter key="q" source="it's" />]} />
        <DisplayedFilterInputs />
      </ListHarness>,
    );
    await openAddFilterMenu();

    fireEvent.click(await screen.findByRole("menuitemcheckbox"));

    const input = await screen.findByRole("textbox", { name: "it's input" });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("an alwaysOn filter is not in the add-filter menu", async () => {
    render(
      <ListHarness>
        <FilterButton
          filters={[
            <TextFilter key="title" source="title" alwaysOn />,
            <TextFilter key="category" source="category" />,
          ]}
        />
      </ListHarness>,
    );
    await openAddFilterMenu();
    expect(
      await screen.findByRole("menuitemcheckbox", { name: "Category" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Title" }),
    ).toBeNull();
  });
});

describe("<SelectAllButton>", () => {
  it("selects up to the limit across pages and calls onClick afterwards", async () => {
    const dataProvider = makeDataProvider();
    const spy = vi.spyOn(dataProvider, "getList");
    const onClick = vi.fn();
    render(
      <ListHarness dataProvider={dataProvider} selectedIds={[1, 2]}>
        <SelectAllButton limit={4} onClick={onClick} />
      </ListHarness>,
    );
    const button = await screen.findByRole("button", { name: "Select all" });
    fireEvent.click(button);

    await waitFor(() => expect(selected()).toBe("1,2,3,4"));
    expect(
      spy.mock.calls.some(
        ([, params]) =>
          params.pagination !== undefined &&
          "perPage" in params.pagination &&
          params.pagination.perPage === 4,
      ),
    ).toBe(true);
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("is hidden until every row of the page is selected", async () => {
    function SelectSecondRow() {
      const { toggleItem } = useListContext();
      return (
        <button type="button" onClick={() => toggleItem(2)}>
          pick row two
        </button>
      );
    }
    render(
      <ListHarness selectedIds={[1]}>
        <SelectSecondRow />
        <SelectAllButton />
      </ListHarness>,
    );
    await waitFor(() => expect(selected()).toBe("1"));
    expect(screen.queryByRole("button", { name: "Select all" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "pick row two" }));
    expect(
      await screen.findByRole("button", { name: "Select all" }),
    ).toBeTruthy();
  });

  it("is hidden once everything or the limit is selected", async () => {
    const everything = render(
      <ListHarness perPage={10} selectedIds={[1, 2, 3, 4, 5]}>
        <SelectAllButton />
      </ListHarness>,
    );
    await waitFor(() => expect(selected()).toBe("1,2,3,4,5"));
    expect(screen.queryByRole("button", { name: "Select all" })).toBeNull();
    everything.unmount();

    render(
      <ListHarness selectedIds={[1, 2]}>
        <SelectAllButton limit={2} />
      </ListHarness>,
    );
    await waitFor(() => expect(selected()).toBe("1,2"));
    expect(screen.queryByRole("button", { name: "Select all" })).toBeNull();
  });

  it("is hidden while the list has no data", async () => {
    const dataProvider = makeDataProvider();
    const spy = vi
      .spyOn(dataProvider, "getList")
      .mockImplementation(() => new Promise(() => {}));
    render(
      <ListHarness dataProvider={dataProvider}>
        <SelectAllButton />
      </ListHarness>,
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Select all" })).toBeNull();
  });
});

describe("<RefreshIconButton>", () => {
  it("clicking invalidates every query and calls onClick", async () => {
    const dataProvider = makeDataProvider();
    const spy = vi.spyOn(dataProvider, "getList");
    const onClick = vi.fn();
    render(
      <ListHarness dataProvider={dataProvider}>
        <RefreshIconButton onClick={onClick} />
      </ListHarness>,
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const before = spy.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(before));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("its accessible name is the translated label", async () => {
    render(
      <ListHarness>
        <RefreshIconButton />
      </ListHarness>,
    );
    expect(await screen.findByRole("button", { name: "Refresh" })).toBeTruthy();
  });

  it("a custom label key is translated with itself as the fallback", async () => {
    render(
      <ListHarness>
        <RefreshIconButton label="app.reload" />
        <RefreshIconButton label="app.unknown" />
      </ListHarness>,
    );
    expect(
      await screen.findByRole("button", { name: "Reload the data" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "app.unknown" })).toBeTruthy();
  });
});
