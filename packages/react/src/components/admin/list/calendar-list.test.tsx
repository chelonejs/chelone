/**
 * `<CalendarList>` month view, mounted under `<List>` with a data provider
 * whose `getList` honours `_gte` and `_lte` (the fake one only matches
 * equality). The clock is pinned to 15 May 2026, a Friday: the month grid runs
 * from Sunday 26 April to Saturday 6 June, 42 days.
 */
import {
  createI18n,
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
  within,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { List } from "../views/list";
import {
  CalendarList,
  type EventRendererProps,
  type HeaderRendererProps,
} from "./calendar-list";

type EventRow = { id: number } & Record<string, unknown>;

const MEETINGS: EventRow[] = [
  { id: 1, title: "Standup", start: "2026-05-20T09:00:00", kind: "work" },
  {
    id: 2,
    title: "Offsite",
    start: "2026-05-12T09:00:00",
    end: "2026-05-14T17:00:00",
    kind: "trip",
  },
  { id: 3, title: "Dentist", start: "2026-06-10T09:00:00", kind: "personal" },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 4, 15, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** The fake provider matches filters by equality: this one reads `_gte` / `_lte` on `start`. */
function rangeProvider(rows: EventRow[]) {
  const base = fakeDataProvider({ meetings: rows });
  const getList = vi.fn(
    async (
      resource: string,
      params: Parameters<DataProvider["getList"]>[1],
    ) => {
      const { start_gte, start_lte, ...rest } = (params.filter ?? {}) as Record<
        string,
        unknown
      >;
      const all = await base.getList(resource, {
        ...params,
        filter: rest,
        pagination: { page: 1, perPage: 100_000 },
      });
      const inRange = all.data.filter((row) => {
        const time = new Date(String(row.start)).getTime();
        return (
          (start_gte === undefined ||
            time >= new Date(String(start_gte)).getTime()) &&
          (start_lte === undefined ||
            time <= new Date(String(start_lte)).getTime())
        );
      });
      const { page, perPage } = params.pagination as {
        page: number;
        perPage: number;
      };
      return {
        data: inRange.slice((page - 1) * perPage, page * perPage),
        total: inRange.length,
      };
    },
  );
  return { ...base, getList } as unknown as DataProvider & {
    getList: typeof getList;
  };
}

function Location() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

function mount(
  ui: ReactNode,
  {
    rows = MEETINGS,
    hasEdit = true,
    hasShow = true,
    url = "/",
    provider = rangeProvider(rows),
  }: {
    rows?: EventRow[];
    hasEdit?: boolean;
    hasShow?: boolean;
    /** The location the app opens on, e.g. a reloaded list URL that holds a range. */
    url?: string;
    provider?: ReturnType<typeof rangeProvider>;
  } = {},
) {
  const registry = createResourceRegistry();
  registry.register({
    name: "meetings",
    hasList: true,
    hasCreate: false,
    hasEdit,
    hasShow,
  });
  const result = render(
    <CheloneProvider
      dataProvider={provider}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({}) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={[url]}>
            <ResourceContextProvider value="meetings">
              {ui}
              <Location />
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
  return { ...result, provider };
}

const calendar = (props: Record<string, unknown> = {}) => (
  <List title={false}>
    <CalendarList
      startSource="start"
      endSource="end"
      titleSource="title"
      {...props}
    />
  </List>
);

const cell = (day: string) =>
  screen
    .getAllByRole("gridcell")
    .find((el) => el.dataset.day === day) as HTMLElement;

describe("<CalendarList> month view", () => {
  it("renders the month title and a gridcell for every day of whole weeks", async () => {
    mount(calendar());
    await screen.findByText("Standup");

    expect(screen.getByText("May 2026")).toBeTruthy();
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(42);
    expect(cells[0]?.dataset.day).toBe("2026-04-26");
    expect(cells[41]?.dataset.day).toBe("2026-06-06");
    expect(cell("2026-05-15").dataset.today).toBe("true");
    expect(cell("2026-05-16").dataset.today).toBe("false");
    expect(
      screen.getAllByRole("columnheader").map((el) => el.textContent),
    ).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("renders an event in its day cell and a multi-day event in every day it covers", async () => {
    mount(calendar());
    await screen.findByText("Standup");

    expect(
      within(cell("2026-05-20")).getByRole("button", { name: "Standup" }),
    ).toBeTruthy();
    for (const day of ["2026-05-12", "2026-05-13", "2026-05-14"]) {
      expect(
        within(cell(day)).getByRole("button", { name: "Offsite" }),
      ).toBeTruthy();
    }
    expect(within(cell("2026-05-15")).queryByRole("button")).toBeNull();
    expect(within(cell("2026-05-11")).queryByRole("button")).toBeNull();
  });

  it("asks the data provider for the visible range with perPage 1000", async () => {
    const { provider } = mount(calendar());
    await screen.findByText("Standup");

    const [, params] = provider.getList.mock.lastCall as [
      string,
      { filter: Record<string, string>; pagination: { perPage: number } },
    ];
    expect(params.filter).toEqual({
      start_gte: new Date(2026, 3, 26).toISOString(),
      start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });
    expect(params.pagination.perPage).toBe(1000);
  });

  it("marks the grid busy while the list is pending", async () => {
    mount(calendar());
    expect(screen.getByRole("grid").getAttribute("aria-busy")).toBe("true");
    await screen.findByText("Standup");
    expect(screen.getByRole("grid").getAttribute("aria-busy")).toBe("false");
  });

  it("Previous and Next move the month and refetch with the new range", async () => {
    const { provider } = mount(calendar());
    await screen.findByText("Standup");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("June 2026")).toBeTruthy();
    expect(await screen.findByText("Dentist")).toBeTruthy();
    expect(screen.queryByText("Standup")).toBeNull();
    const june = provider.getList.mock.lastCall?.[1] as {
      filter: Record<string, string>;
    };
    expect(june.filter).toEqual({
      start_gte: new Date(2026, 4, 31).toISOString(),
      start_lte: new Date(2026, 6, 4, 23, 59, 59, 999).toISOString(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("April 2026")).toBeTruthy();
    await waitFor(() => {
      const april = provider.getList.mock.lastCall?.[1] as {
        filter: Record<string, string>;
      };
      expect(april.filter.start_gte).toBe(new Date(2026, 2, 29).toISOString());
    });
  });

  it("Today returns to the current month", async () => {
    mount(calendar());
    await screen.findByText("Standup");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("July 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(screen.getByText("May 2026")).toBeTruthy();
    expect(await screen.findByText("Standup")).toBeTruthy();
  });

  it("weekStartsOn sets the first weekday column and the first cell", async () => {
    mount(calendar({ weekStartsOn: 1 }));
    await screen.findByText("Standup");

    expect(screen.getAllByRole("columnheader")[0]?.textContent).toBe("Mon");
    expect(screen.getAllByRole("gridcell")[0]?.dataset.day).toBe("2026-04-27");
  });

  it("rangeFilter replaces the default filter keys", async () => {
    const { provider } = mount(
      calendar({
        rangeFilter: ({ start, end }: { start: Date; end: Date }) => ({
          from: start.toISOString(),
          to: end.toISOString(),
        }),
      }),
    );

    await waitFor(() => {
      const params = provider.getList.mock.lastCall?.[1] as {
        filter: Record<string, string>;
      };
      expect(params.filter).toEqual({
        from: new Date(2026, 3, 26).toISOString(),
        to: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      });
    });
  });

  it("removes its range filter and restores perPage on unmount", async () => {
    const { provider } = mount(<Toggled />);
    await screen.findByText("Standup");
    expect(screen.getByTestId("params").textContent).toBe(
      JSON.stringify({
        perPage: 1000,
        filter: {
          start_gte: new Date(2026, 3, 26).toISOString(),
          start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));

    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 25, filter: {} }),
      ),
    );
    await waitFor(() => {
      const params = provider.getList.mock.lastCall?.[1] as {
        filter: object;
        pagination: { perPage: number };
      };
      expect(params.filter).toEqual({});
      expect(params.pagination.perPage).toBe(25);
    });
  });

  it("keeps the filters the user set", async () => {
    const { provider } = mount(<Toggled />);
    await screen.findAllByText("Offsite");

    fireEvent.click(screen.getByRole("button", { name: "work only" }));
    await waitFor(() =>
      expect(screen.queryAllByText("Offsite")).toHaveLength(0),
    );
    expect(screen.getByText("Standup")).toBeTruthy();
    const filtered = provider.getList.mock.lastCall?.[1] as {
      filter: Record<string, string>;
    };
    expect(filtered.filter).toMatchObject({ kind: "work" });
    expect(filtered.filter.start_gte).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      const params = provider.getList.mock.lastCall?.[1] as {
        filter: Record<string, string>;
      };
      expect(params.filter).toMatchObject({
        kind: "work",
        start_gte: new Date(2026, 4, 31).toISOString(),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));
    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 25, filter: { kind: "work" } }),
      ),
    );
  });

  it.each([
    [
      "the visible month",
      new Date(2026, 3, 26),
      new Date(2026, 5, 6, 23, 59, 59, 999),
    ],
    [
      "another month",
      new Date(2026, 5, 28),
      new Date(2026, 7, 1, 23, 59, 59, 999),
    ],
  ])("removes a range filter and perPage a reloaded URL held for %s", async (_name, start, end) => {
    const filter = JSON.stringify({
      start_gte: start.toISOString(),
      start_lte: end.toISOString(),
    });
    mount(<Toggled />, {
      url: `/?filter=${encodeURIComponent(filter)}&perPage=1000`,
    });
    await screen.findByText("Standup");

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));

    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 10, filter: {} }),
      ),
    );
  });

  it("onSelectEvent receives the record and without it the event links to the edit page", async () => {
    const onSelectEvent = vi.fn();
    const first = mount(calendar({ onSelectEvent }));
    await screen.findByText("Standup");
    fireEvent.click(
      within(cell("2026-05-20")).getByRole("button", { name: "Standup" }),
    );
    expect(onSelectEvent).toHaveBeenCalledWith(MEETINGS[0]);
    expect(screen.getByTestId("location").textContent).toBe("/");
    first.unmount();

    const edit = mount(calendar());
    await screen.findByText("Standup");
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    expect(screen.getByTestId("location").textContent).toBe("/meetings/1");
    edit.unmount();

    const show = mount(calendar(), { hasEdit: false });
    await screen.findByText("Standup");
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    expect(screen.getByTestId("location").textContent).toBe("/meetings/1/show");
    show.unmount();

    mount(calendar({ linkType: false }));
    await screen.findByText("Standup");
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("an empty cell calls onSelectSlot with the whole day, an event click does not", async () => {
    const onSelectSlot = vi.fn();
    mount(calendar({ onSelectSlot }));
    await screen.findByText("Standup");
    const slot = {
      startISO: new Date(2026, 4, 22).toISOString(),
      endISO: new Date(2026, 4, 23).toISOString(),
      allDay: true,
    };

    fireEvent.click(cell("2026-05-22"));
    expect(onSelectSlot).toHaveBeenLastCalledWith(slot);

    fireEvent.keyDown(cell("2026-05-22"), { key: "Enter" });
    expect(onSelectSlot).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(cell("2026-05-22"), { key: " " });
    expect(onSelectSlot).toHaveBeenCalledTimes(3);
    expect(onSelectSlot).toHaveBeenLastCalledWith(slot);
    fireEvent.keyDown(cell("2026-05-22"), { key: "a" });
    expect(onSelectSlot).toHaveBeenCalledTimes(3);

    const event = within(cell("2026-05-20")).getByRole("button", {
      name: "Standup",
    });
    fireEvent.click(event);
    fireEvent.keyDown(event, { key: "Enter" });
    expect(onSelectSlot).toHaveBeenCalledTimes(3);
  });

  it("colorMap colors an event by its colorSource value", async () => {
    mount(calendar({ colorSource: "kind", colorMap: { work: "#d00000" } }));
    await screen.findByText("Standup");

    expect(screen.getByRole("button", { name: "Standup" }).dataset.color).toBe(
      "#d00000",
    );
    expect(
      within(cell("2026-05-12")).getByRole("button", { name: "Offsite" })
        .dataset.color,
    ).toBeUndefined();
  });

  it("eventRenderer and headerRenderer replace the defaults", async () => {
    mount(
      calendar({
        eventRenderer: ({ event, view }: EventRendererProps) => (
          <i>{`${view}: ${event.title} (${event.record.id})`}</i>
        ),
        headerRenderer: ({ view, range, onNavigate }: HeaderRendererProps) => (
          <div>
            <output data-testid="custom-header">{`${view} ${range.start.getMonth()}`}</output>
            <button type="button" onClick={() => onNavigate("next")}>
              later
            </button>
          </div>
        ),
      }),
    );

    expect(await screen.findByText("month: Standup (1)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(screen.queryByText("May 2026")).toBeNull();
    expect(screen.getByTestId("custom-header").textContent).toBe("month 3");

    fireEvent.click(screen.getByRole("button", { name: "later" }));
    expect(screen.getByTestId("custom-header").textContent).toBe("month 4");
  });

  it("hides the view switcher while one view remains", async () => {
    mount(calendar({ views: ["month", "week", "agenda"] }));
    await screen.findByText("Standup");

    expect(screen.queryByRole("button", { name: "Week" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Month" })).toBeNull();
  });
});

/** Shows the list params the calendar sets, and can drop the calendar to see them restored. */
function Toggled() {
  const [shown, setShown] = useState(true);
  return (
    <List title={false} perPage={25}>
      {shown ? (
        <CalendarList startSource="start" endSource="end" titleSource="title" />
      ) : null}
      <ParamsProbe onHide={() => setShown(false)} />
    </List>
  );
}

function ParamsProbe({ onHide }: { onHide: () => void }) {
  const { filter, perPage, setFilters } = useListContext();
  return (
    <>
      <output data-testid="params">
        {JSON.stringify({ perPage, filter })}
      </output>
      <button type="button" onClick={onHide}>
        hide calendar
      </button>
      <button type="button" onClick={() => setFilters({ kind: "work" })}>
        work only
      </button>
    </>
  );
}
