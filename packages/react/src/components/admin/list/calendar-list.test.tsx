/**
 * `<CalendarList>` month view, mounted under `<List>` with a data provider
 * whose `getList` honours `_gte` and `_lte` (the fake one only matches
 * equality). The clock is pinned to 15 May 2026, a Friday: the month grid runs
 * from Sunday 26 April to Saturday 6 June, 42 days.
 */
import {
  calendarDaySlot,
  createI18n,
  createResourceRegistry,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type PagePagination,
  type Pagination,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
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
import type { CalendarSlot } from "./calendar-month-view";

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

function pagePagination(pagination: Pagination | undefined): PagePagination {
  if (!pagination || !("page" in pagination)) {
    throw new Error("expected page pagination");
  }
  return pagination;
}

/** The fake provider matches filters by equality: this one reads `start_gte`, `start_lte` and `end_gte`. */
function rangeProvider(rows: EventRow[]) {
  const base = fakeDataProvider({ meetings: rows });
  const getList = vi.fn(
    async (
      resource: string,
      params: Parameters<DataProvider["getList"]>[1],
    ) => {
      const { start_gte, start_lte, end_gte, ...rest } = params.filter ?? {};
      const all = await base.getList(resource, {
        ...params,
        filter: rest,
        pagination: { page: 1, perPage: 100_000 },
      });
      const inRange = all.data.filter((row) => {
        const time = new Date(String(row.start)).getTime();
        // A real database drops a null end; the fixtures' single-time events end when they start.
        const endTime = new Date(String(row.end ?? row.start)).getTime();
        return (
          (start_gte === undefined ||
            time >= new Date(String(start_gte)).getTime()) &&
          (start_lte === undefined ||
            time <= new Date(String(start_lte)).getTime()) &&
          (end_gte === undefined ||
            endTime >= new Date(String(end_gte)).getTime())
        );
      });
      const { page, perPage } = pagePagination(params.pagination);
      return {
        data: inRange.slice((page - 1) * perPage, page * perPage),
        total: inRange.length,
      };
    },
  );
  const dataProvider: DataProvider = { ...base, getList };
  return { dataProvider, getList };
}

function Location() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

/** The params of the provider's latest `getList` call, with the filter and page pagination the calendar always sends. */
function lastParams(provider: ReturnType<typeof rangeProvider>) {
  const [, params] = defined(provider.getList.mock.lastCall);
  return {
    filter: defined(params.filter),
    pagination: pagePagination(params.pagination),
  };
}

function mount(
  ui: ReactNode,
  {
    rows = MEETINGS,
    hasEdit = true,
    hasShow = true,
    url = "/",
    provider = rangeProvider(rows),
    messages = {},
  }: {
    rows?: EventRow[];
    hasEdit?: boolean;
    hasShow?: boolean;
    /** The location the app opens on, e.g. a reloaded list URL that holds a range. */
    url?: string;
    provider?: ReturnType<typeof rangeProvider>;
    messages?: Record<string, string>;
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
      dataProvider={provider.dataProvider}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages(messages) },
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
  defined(screen.getAllByRole("gridcell").find((el) => el.dataset.day === day));

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

    const params = lastParams(provider);
    expect(params.filter).toEqual({
      end_gte: new Date(2026, 3, 26).toISOString(),
      start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });
    expect(params.pagination.perPage).toBe(1000);
  });

  it("fetches a multi-day event that starts before the visible range", async () => {
    const { provider } = mount(calendar(), {
      rows: [
        {
          id: 9,
          title: "Residency",
          start: "2026-04-20T09:00:00",
          end: "2026-04-28T17:00:00",
        },
      ],
    });
    await screen.findAllByText("Residency");

    const params = lastParams(provider);
    expect(params.filter).toEqual({
      start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      end_gte: new Date(2026, 3, 26).toISOString(),
    });
    for (const day of ["2026-04-26", "2026-04-27", "2026-04-28"]) {
      expect(
        within(cell(day)).getByRole("button", { name: "Residency" }),
      ).toBeTruthy();
    }
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
    const june = lastParams(provider);
    expect(june.filter).toEqual({
      end_gte: new Date(2026, 4, 31).toISOString(),
      start_lte: new Date(2026, 6, 4, 23, 59, 59, 999).toISOString(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("April 2026")).toBeTruthy();
    await waitFor(() => {
      const april = lastParams(provider);
      expect(april.filter.end_gte).toBe(new Date(2026, 2, 29).toISOString());
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
      const params = lastParams(provider);
      expect(params.filter).toEqual({
        from: new Date(2026, 3, 26).toISOString(),
        to: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      });
    });
  });

  it("removes its range filter and restores perPage on unmount", async () => {
    const { provider } = mount(<Toggled perPage={25} />);
    await screen.findByText("Standup");
    expect(screen.getByTestId("params").textContent).toBe(
      JSON.stringify({
        perPage: 1000,
        filter: {
          start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
          end_gte: new Date(2026, 3, 26).toISOString(),
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
      const params = lastParams(provider);
      expect(params.filter).toEqual({});
      expect(params.pagination.perPage).toBe(25);
    });
  });

  it("keeps the filters the user set", async () => {
    const { provider } = mount(<Toggled perPage={25} />);
    await screen.findAllByText("Offsite");

    fireEvent.click(screen.getByRole("button", { name: "work only" }));
    await waitFor(() =>
      expect(screen.queryAllByText("Offsite")).toHaveLength(0),
    );
    expect(screen.getByText("Standup")).toBeTruthy();
    const filtered = lastParams(provider);
    expect(filtered.filter).toMatchObject({ kind: "work" });
    expect(filtered.filter.end_gte).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      const params = lastParams(provider);
      expect(params.filter).toMatchObject({
        kind: "work",
        end_gte: new Date(2026, 4, 31).toISOString(),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));
    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 25, filter: { kind: "work" } }),
      ),
    );
  });

  it("restores the list's own perPage when the URL already carried the calendar's own", async () => {
    mount(<Toggled perPage={25} />, { url: "/?perPage=1000" });
    await screen.findByText("Standup");

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));

    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 25, filter: {} }),
      ),
    );
  });

  it("restores core's list default when the list set no perPage of its own", async () => {
    mount(<Toggled />, { url: "/?perPage=1000" });
    await screen.findByText("Standup");

    fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));

    await waitFor(() =>
      expect(screen.getByTestId("params").textContent).toBe(
        JSON.stringify({ perPage: 10, filter: {} }),
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
  ])(
    "removes a range filter a reloaded URL held for %s",
    async (_name, start, end) => {
      const filter = JSON.stringify({
        end_gte: start.toISOString(),
        start_lte: end.toISOString(),
      });
      mount(<Toggled perPage={25} />, {
        url: `/?filter=${encodeURIComponent(filter)}&perPage=1000`,
      });
      await screen.findByText("Standup");

      fireEvent.click(screen.getByRole("button", { name: "hide calendar" }));

      await waitFor(() =>
        expect(screen.getByTestId("params").textContent).toBe(
          JSON.stringify({ perPage: 25, filter: {} }),
        ),
      );
    },
  );

  it("drops a start_gte a list URL kept from before endSource bounded the end", async () => {
    const stale = JSON.stringify({
      start_gte: new Date(2026, 3, 26).toISOString(),
      start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      kind: "work",
    });
    mount(<Toggled perPage={25} />, {
      url: `/?filter=${encodeURIComponent(stale)}&perPage=1000`,
    });
    await screen.findByText("Standup");

    await waitFor(() =>
      expect(
        JSON.parse(screen.getByTestId("params").textContent ?? "{}").filter,
      ).toEqual({
        kind: "work",
        start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
        end_gte: new Date(2026, 3, 26).toISOString(),
      }),
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

  it("selecting a month day reports the slot from core", async () => {
    const onSelectSlot = vi.fn();
    mount(calendar({ onSelectSlot }));
    await screen.findByText("Standup");
    // The slot is core's `calendarDaySlot`, not a date the view builds itself.
    const slot = calendarDaySlot(new Date(2026, 4, 22));

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
    mount(calendar({ views: ["month"] }));
    await screen.findByText("Standup");

    expect(screen.queryByRole("button", { name: "Week" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Month" })).toBeNull();
  });
});

const hourCell = (date: Date) =>
  defined(
    screen
      .getAllByRole("gridcell")
      .find((el) => el.dataset.slotStart === date.toISOString()),
  );

describe("<CalendarList> week view", () => {
  it("renders 7 day headers and 24 hour rows", async () => {
    mount(calendar({ defaultView: "week" }));
    await screen.findByText("Offsite");

    const view = document.querySelector('[data-calendar-view="week"]');
    expect(view).toBeTruthy();
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((el) => el.dataset.day)).toEqual([
      "2026-05-10",
      "2026-05-11",
      "2026-05-12",
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
      "2026-05-16",
    ]);
    expect(headers[0]?.textContent).toContain("Sun");
    expect(screen.getAllByRole("row")).toHaveLength(25);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(24 * 7);
    expect(cells[0]?.dataset.slotStart).toBe(
      new Date(2026, 4, 10, 0).toISOString(),
    );
    expect(cells[167]?.dataset.slotStart).toBe(
      new Date(2026, 4, 16, 23).toISOString(),
    );
    expect(screen.getByText("May 10 – 16, 2026")).toBeTruthy();
  });

  it("places an event in the cell of its start hour", async () => {
    mount(calendar({ defaultView: "week" }));
    await screen.findByText("Offsite");

    expect(
      within(hourCell(new Date(2026, 4, 12, 9))).getByRole("button", {
        name: "Offsite",
      }),
    ).toBeTruthy();
    // It runs to the 14th, but the week view draws it at its start only.
    expect(screen.getAllByRole("button", { name: "Offsite" })).toHaveLength(1);
    expect(
      within(hourCell(new Date(2026, 4, 12, 10))).queryByRole("button"),
    ).toBeNull();
  });

  it("an empty hour cell calls onSelectSlot with that hour and allDay false", async () => {
    const onSelectSlot = vi.fn();
    mount(calendar({ defaultView: "week", onSelectSlot }));
    await screen.findByText("Offsite");
    const slot = {
      startISO: new Date(2026, 4, 13, 14).toISOString(),
      endISO: new Date(2026, 4, 13, 15).toISOString(),
      allDay: false,
    };

    fireEvent.click(hourCell(new Date(2026, 4, 13, 14)));
    expect(onSelectSlot).toHaveBeenLastCalledWith(slot);
    fireEvent.keyDown(hourCell(new Date(2026, 4, 13, 14)), { key: "Enter" });
    fireEvent.keyDown(hourCell(new Date(2026, 4, 13, 14)), { key: " " });
    expect(onSelectSlot).toHaveBeenCalledTimes(3);
    expect(onSelectSlot).toHaveBeenLastCalledWith(slot);
    fireEvent.keyDown(hourCell(new Date(2026, 4, 13, 14)), { key: "a" });
    expect(onSelectSlot).toHaveBeenCalledTimes(3);

    // The last hour of a day ends at the next midnight.
    fireEvent.click(hourCell(new Date(2026, 4, 13, 23)));
    expect(onSelectSlot).toHaveBeenLastCalledWith({
      startISO: new Date(2026, 4, 13, 23).toISOString(),
      endISO: new Date(2026, 4, 14).toISOString(),
      allDay: false,
    });
  });

  it("an event click calls onSelectEvent and not onSelectSlot", async () => {
    const onSelectEvent = vi.fn();
    const onSelectSlot = vi.fn();
    mount(calendar({ defaultView: "week", onSelectEvent, onSelectSlot }));
    await screen.findByText("Offsite");

    const event = screen.getByRole("button", { name: "Offsite" });
    fireEvent.click(event);
    fireEvent.keyDown(event, { key: "Enter" });

    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectEvent).toHaveBeenCalledWith(MEETINGS[1]);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("an event links to the edit page without onSelectEvent", async () => {
    mount(calendar({ defaultView: "week" }));
    await screen.findByText("Offsite");

    fireEvent.click(screen.getByRole("button", { name: "Offsite" }));
    expect(screen.getByTestId("location").textContent).toBe("/meetings/2");
  });

  it("Next moves a week and refetches the new range", async () => {
    const { provider } = mount(calendar({ defaultView: "week" }));
    await screen.findByText("Offsite");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Standup")).toBeTruthy();
    expect(screen.queryByText("Offsite")).toBeNull();
    expect(
      screen.getAllByRole("columnheader").map((el) => el.dataset.day)[0],
    ).toBe("2026-05-17");
    expect(
      within(hourCell(new Date(2026, 4, 20, 9))).getByRole("button", {
        name: "Standup",
      }),
    ).toBeTruthy();
    const params = lastParams(provider);
    expect(params.filter).toEqual({
      end_gte: new Date(2026, 4, 17).toISOString(),
      start_lte: new Date(2026, 4, 23, 23, 59, 59, 999).toISOString(),
    });
  });
});

describe("<CalendarList> week view across a clock change", () => {
  const zone = process.env.TZ;
  afterEach(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it("leaves the hour a spring-forward day skips without a slot", async () => {
    // 8 March 2026: New York goes from 02:00 straight to 03:00.
    process.env.TZ = "America/New_York";
    vi.setSystemTime(new Date(2026, 2, 8, 12));
    const onSelectSlot = vi.fn<(slot: CalendarSlot) => void>();
    mount(calendar({ defaultView: "week", onSelectSlot }), { rows: [] });
    await screen.findByRole("grid");

    const starts = screen
      .getAllByRole("gridcell")
      .map((el) => el.dataset.slotStart)
      .filter((value) => value !== undefined);
    expect(new Set(starts).size).toBe(starts.length);
    const skipped = screen
      .getAllByRole("gridcell")
      .filter((el) => el.dataset.slotStart === undefined);
    expect(skipped).toHaveLength(1);
    fireEvent.click(defined(skipped[0]));
    expect(onSelectSlot).not.toHaveBeenCalled();

    fireEvent.click(hourCell(new Date(2026, 2, 8, 3)));
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    const slot = defined(onSelectSlot.mock.lastCall)[0];
    expect(new Date(slot.endISO).getTime()).toBeGreaterThan(
      new Date(slot.startISO).getTime(),
    );
  });
});

describe("<CalendarList> agenda view", () => {
  it("groups events by day in start order", async () => {
    mount(calendar({ defaultView: "agenda" }), {
      rows: [
        ...MEETINGS,
        { id: 4, title: "Coffee", start: "2026-05-20T08:00:00", kind: "work" },
      ],
    });
    await screen.findByText("Offsite");

    expect(
      document.querySelector('[data-calendar-view="agenda"]'),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent),
    ).toEqual(["Tuesday, May 12", "Wednesday, May 20"]);
    const buttons = screen
      .getAllByRole("button")
      .map((el) => el.textContent)
      .filter((name) => ["Offsite", "Coffee", "Standup"].includes(name ?? ""));
    expect(buttons).toEqual(["Offsite", "Coffee", "Standup"]);
    expect(screen.queryByText("Dentist")).toBeNull();
  });

  it("shows the empty label when the range holds no event", async () => {
    mount(calendar({ defaultView: "agenda" }), { rows: [] });

    expect(await screen.findByText("No events")).toBeTruthy();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("an event links to the edit page and calls onSelectEvent when given", async () => {
    mount(calendar({ defaultView: "agenda" }));
    await screen.findByText("Standup");
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    expect(screen.getByTestId("location").textContent).toBe("/meetings/1");
  });

  it("Next moves a fortnight and refetches the new range", async () => {
    const { provider } = mount(calendar({ defaultView: "agenda" }));
    await screen.findByText("Standup");
    expect(screen.queryByText("Dentist")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Dentist")).toBeTruthy();
    expect(screen.queryByText("Offsite")).toBeNull();
    const params = lastParams(provider);
    expect(params.filter).toEqual({
      end_gte: new Date(2026, 4, 15).toISOString(),
      start_lte: new Date(2026, 5, 12, 23, 59, 59, 999).toISOString(),
    });
  });
});

describe("<CalendarList> views", () => {
  it("the switcher reads the older chelone.calendar.<view> keys unless chelone.calendar.view.<view> is set", async () => {
    mount(calendar(), {
      messages: {
        "chelone.calendar.month": "Mois",
        "chelone.calendar.week": "Semaine",
        "chelone.calendar.view.week": "Sem.",
      },
    });
    await screen.findByText("Standup");

    expect(screen.getByRole("button", { name: "Mois" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sem." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agenda" })).toBeTruthy();
  });

  it("the switcher changes the view and marks the current one", async () => {
    const { provider } = mount(calendar());
    await screen.findByText("Standup");

    const pressed = () =>
      ["Month", "Week", "Agenda"].filter(
        (name) =>
          screen.getByRole("button", { name }).getAttribute("aria-pressed") ===
          "true",
      );
    expect(pressed()).toEqual(["Month"]);

    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(pressed()).toEqual(["Week"]);
    expect(document.querySelector('[data-calendar-view="week"]')).toBeTruthy();
    expect(
      document.querySelector('[data-slot="calendar-month-view"]'),
    ).toBeNull();
    await waitFor(() => {
      const params = lastParams(provider);
      expect(params.filter.end_gte).toBe(new Date(2026, 4, 10).toISOString());
    });

    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(pressed()).toEqual(["Agenda"]);
    expect(
      document.querySelector('[data-calendar-view="agenda"]'),
    ).toBeTruthy();
    await waitFor(() => {
      const params = lastParams(provider);
      expect(params.filter.end_gte).toBe(new Date(2026, 4, 1).toISOString());
    });

    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(pressed()).toEqual(["Month"]);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
  });

  it("the views prop limits the switcher and defaultView picks the first view", async () => {
    mount(calendar({ views: ["week", "agenda"], defaultView: "month" }));
    await screen.findByText("Offsite");

    expect(screen.queryByRole("button", { name: "Month" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Week" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(document.querySelector('[data-calendar-view="week"]')).toBeTruthy();
    cleanup();

    mount(calendar({ defaultView: "agenda" }));
    await screen.findByText("Standup");
    expect(
      screen
        .getByRole("button", { name: "Agenda" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("eventRenderer applies in the week and agenda views", async () => {
    mount(
      calendar({
        defaultView: "week",
        eventRenderer: ({ event, view }: EventRendererProps) => (
          <i>{`${view}: ${event.title} (${event.record.id})`}</i>
        ),
      }),
    );
    expect(await screen.findByText("week: Offsite (2)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(await screen.findByText("agenda: Offsite (2)")).toBeTruthy();
    expect(screen.getByText("agenda: Standup (1)")).toBeTruthy();
  });
});

/** The part of a native `DataTransfer` the calendar touches; jsdom has none. */
function stubTransfer() {
  return { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };
}

const eventIn = (day: string, name: string) =>
  within(cell(day)).getByRole("button", { name });

describe("<CalendarList> drag", () => {
  it("events are not draggable without onDrop", async () => {
    mount(calendar());
    await screen.findByText("Standup");

    expect(eventIn("2026-05-20", "Standup").hasAttribute("draggable")).toBe(
      false,
    );
  });

  it("dropping an event on another day calls onDrop with the moved ISO start and end", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    const offsite = eventIn("2026-05-13", "Offsite");
    expect(offsite.getAttribute("draggable")).toBe("true");
    fireEvent.dragStart(offsite, { dataTransfer });
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "2");
    expect(offsite.hasAttribute("data-dragging")).toBe(true);

    fireEvent.dragOver(cell("2026-05-20"), { dataTransfer });
    fireEvent.drop(cell("2026-05-20"), { dataTransfer });
    fireEvent.dragEnd(offsite, { dataTransfer });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), {
      start: new Date(2026, 4, 19, 9).toISOString(),
      end: new Date(2026, 4, 21, 17).toISOString(),
    });
    expect(offsite.hasAttribute("data-dragging")).toBe(false);
  });

  it("an event with no end is dropped with no end", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(eventIn("2026-05-20", "Standup"), { dataTransfer });
    fireEvent.dragOver(cell("2026-05-22"), { dataTransfer });
    fireEvent.drop(cell("2026-05-22"), { dataTransfer });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0]?.[1]).toStrictEqual({
      start: new Date(2026, 4, 22, 9).toISOString(),
    });
  });

  it("a multi-day event dragged from its second day moves by the day difference", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(eventIn("2026-05-13", "Offsite"), { dataTransfer });
    // Grabbed on the 13th, dropped on the 12th: one day back, so the start moves from the 12th to the 11th.
    fireEvent.dragOver(cell("2026-05-12"), { dataTransfer });
    fireEvent.drop(cell("2026-05-12"), { dataTransfer });

    expect(onDrop.mock.calls[0]?.[1]).toStrictEqual({
      start: new Date(2026, 4, 11, 9).toISOString(),
      end: new Date(2026, 4, 13, 17).toISOString(),
    });
  });

  it("dropping on the original day calls nothing", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    fireEvent.dragStart(eventIn("2026-05-13", "Offsite"), { dataTransfer });
    fireEvent.dragOver(cell("2026-05-13"), { dataTransfer });
    fireEvent.drop(cell("2026-05-13"), { dataTransfer });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("marks the target cell with data-over during a drag and clears it after", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    expect(fireEvent.dragOver(cell("2026-05-22"), { dataTransfer })).toBe(true);
    expect(cell("2026-05-22").hasAttribute("data-over")).toBe(false);

    fireEvent.dragStart(eventIn("2026-05-20", "Standup"), { dataTransfer });
    // preventDefault is what makes the cell a drop target.
    expect(fireEvent.dragOver(cell("2026-05-22"), { dataTransfer })).toBe(
      false,
    );
    expect(cell("2026-05-22").hasAttribute("data-over")).toBe(true);

    fireEvent.dragLeave(cell("2026-05-22"), { dataTransfer });
    expect(cell("2026-05-22").hasAttribute("data-over")).toBe(false);

    fireEvent.dragOver(cell("2026-05-23"), { dataTransfer });
    expect(cell("2026-05-23").hasAttribute("data-over")).toBe(true);
    fireEvent.drop(cell("2026-05-23"), { dataTransfer });
    expect(cell("2026-05-23").hasAttribute("data-over")).toBe(false);
  });

  it("dragend clears the drag, so a later drop calls nothing", async () => {
    const onDrop = vi.fn();
    mount(calendar({ onDrop }));
    await screen.findByText("Standup");

    const dataTransfer = stubTransfer();
    const standup = eventIn("2026-05-20", "Standup");
    fireEvent.dragStart(standup, { dataTransfer });
    fireEvent.dragOver(cell("2026-05-22"), { dataTransfer });
    fireEvent.dragEnd(standup, { dataTransfer });

    expect(standup.hasAttribute("data-dragging")).toBe(false);
    expect(cell("2026-05-22").hasAttribute("data-over")).toBe(false);
    fireEvent.drop(cell("2026-05-22"), { dataTransfer });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("a click on a draggable event still calls onSelectEvent", async () => {
    const onSelectEvent = vi.fn();
    mount(calendar({ onDrop: vi.fn(), onSelectEvent }));
    await screen.findByText("Standup");

    fireEvent.click(eventIn("2026-05-20", "Standup"));

    expect(onSelectEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
  });

  it("week and agenda events are not draggable", async () => {
    mount(calendar({ onDrop: vi.fn(), defaultView: "week" }));
    await screen.findAllByText("Offsite");
    expect(
      screen
        .getAllByRole("button", { name: "Offsite" })[0]
        ?.hasAttribute("draggable"),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(
      screen
        .getAllByRole("button", { name: "Offsite" })[0]
        ?.hasAttribute("draggable"),
    ).toBe(false);
  });
});

/** Shows the list params the calendar sets, and can drop the calendar to see them restored. `perPage` is the `<List>`'s own; omit it to leave the list at core's default. */
function Toggled({ perPage }: { perPage?: number }) {
  const [shown, setShown] = useState(true);
  return (
    <List title={false} perPage={perPage}>
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
