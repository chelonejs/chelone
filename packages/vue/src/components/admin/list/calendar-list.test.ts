/**
 * `<CalendarList>`: the records of the ambient `<List>` as events in a month
 * grid. Mounted as `<Admin><Resource list edit/></Admin>` with a memory router;
 * assertions are on DOM, roles, hrefs and data-provider calls. The clock is
 * fixed to 15 May 2026 (a Friday), so the grid runs from Sunday 26 April to
 * Saturday 6 June: six whole weeks.
 */

import {
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { useListContext } from "../../../list/list-context";
import List from "../view/list.vue";
import CalendarList from "./calendar-list.vue";

const MEETINGS = [
  {
    id: 1,
    name: "Kickoff",
    starts_at: "2026-05-04T09:00:00",
    ends_at: "2026-05-04T10:00:00",
    kind: "work",
  },
  {
    id: 2,
    name: "Conference",
    starts_at: "2026-05-12",
    ends_at: "2026-05-16",
    kind: "trip",
  },
  { id: 3, name: "Retro", starts_at: "2026-05-29T15:00:00", kind: "work" },
];

const View = defineComponent({ render: () => h("div") });

const mounted: VueWrapper[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 4, 15, 12));
});
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.useRealTimers();
});

const cells = (wrapper: VueWrapper) => wrapper.findAll('[role="gridcell"]');
const cell = (wrapper: VueWrapper, date: string) => {
  const found = cells(wrapper).find(
    (node) => node.attributes("data-date") === date,
  );
  if (!found) throw new Error(`no cell for ${date}`);
  return found;
};
const eventsIn = (wrapper: VueWrapper, date: string) =>
  cell(wrapper, date)
    .findAll("[data-slot=calendar-event]")
    .map((node) => node.text());
const title = (wrapper: VueWrapper) =>
  wrapper.get("[data-slot=calendar-title]").text();
const headerButton = (wrapper: VueWrapper, label: string) =>
  wrapper.get(`[data-slot=calendar-header] [aria-label="${label}"]`);
const button = (wrapper: VueWrapper, text: string) => {
  const found = wrapper
    .findAll("[data-slot=calendar-header] button")
    .find((node) => node.text() === text);
  if (!found) throw new Error(`no button ${text}`);
  return found;
};

const providerWith = (rows: LooseRecord[] = MEETINGS) => {
  const base = fakeDataProvider({ meetings: rows });
  // The fake compares filters by equality, so it cannot answer a range.
  const getList = vi.fn(async () => ({ data: rows, total: rows.length }));
  return {
    getList,
    dataProvider: { ...base, getList } as unknown as DataProvider,
  };
};
interface ListCall {
  filter: Record<string, unknown>;
  pagination: { perPage: number };
}
const lastFilter = (getList: ReturnType<typeof providerWith>["getList"]) =>
  (getList.mock.calls.at(-1) as unknown as [string, ListCall])[1];

async function mountList({
  list,
  dataProvider = providerWith().dataProvider,
  edit = true,
  path = "/meetings",
  perPage,
}: {
  list: () => VNodeChild;
  dataProvider?: DataProvider;
  edit?: boolean;
  path?: string;
  perPage?: number;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(path);
  const MeetingList = defineComponent({
    setup: () => () =>
      h(List, { resource: "meetings", perPage }, { default: list }),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        {
          default: () =>
            h(Resource, {
              name: "meetings",
              list: MeetingList,
              edit: edit ? View : undefined,
            }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}

const calendar =
  (props: Record<string, unknown> = {}, slots = {}) =>
  () =>
    h(
      CalendarList,
      { startSource: "starts_at", endSource: "ends_at", ...props },
      slots,
    );

describe("<CalendarList> month view", () => {
  it("renders the month title and a gridcell for every day of whole weeks", async () => {
    const { wrapper } = await mountList({ list: calendar() });

    expect(title(wrapper)).toBe("May 2026");
    expect(wrapper.find('[role="grid"]').exists()).toBe(true);
    expect(cells(wrapper)).toHaveLength(42);
    expect(cells(wrapper)[0]?.attributes("data-date")).toBe("2026-04-26");
    expect(cells(wrapper).at(-1)?.attributes("data-date")).toBe("2026-06-06");
    expect(
      wrapper.findAll('[role="columnheader"]').map((node) => node.text()),
    ).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(wrapper.findAll('[role="row"]')).toHaveLength(7);
  });

  it("renders an event in its day cell and a multi-day event in every day it covers", async () => {
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name" }),
    });

    expect(eventsIn(wrapper, "2026-05-04")).toEqual(["Kickoff"]);
    expect(eventsIn(wrapper, "2026-05-03")).toEqual([]);
    for (const day of ["12", "13", "14", "15"]) {
      expect(eventsIn(wrapper, `2026-05-${day}`)).toEqual(["Conference"]);
    }
    expect(eventsIn(wrapper, "2026-05-11")).toEqual([]);
    expect(eventsIn(wrapper, "2026-05-16")).toEqual([]);
    expect(eventsIn(wrapper, "2026-05-29")).toEqual(["Retro"]);
  });

  it("asks the data provider for the visible range with perPage 1000", async () => {
    const { getList, dataProvider } = providerWith();
    await mountList({ list: calendar(), dataProvider });

    const params = lastFilter(getList);
    expect(params.pagination.perPage).toBe(1000);
    expect(params.filter).toEqual({
      ends_at_gte: new Date(2026, 3, 26).toISOString(),
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });
  });

  it("fetches a multi-day event that starts before the visible range", async () => {
    const { getList, dataProvider } = providerWith([
      {
        id: 9,
        name: "Residency",
        start: "2026-04-20T09:00:00",
        end: "2026-04-28T17:00:00",
      },
    ]);
    const { wrapper } = await mountList({
      list: calendar({
        startSource: "start",
        endSource: "end",
        titleSource: "name",
      }),
      dataProvider,
    });

    expect(lastFilter(getList).filter).toEqual({
      start_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      end_gte: new Date(2026, 3, 26).toISOString(),
    });
    for (const day of ["2026-04-26", "2026-04-27", "2026-04-28"]) {
      expect(eventsIn(wrapper, day)).toEqual(["Residency"]);
    }
  });

  it("Previous and Next move the month and refetch with the new range", async () => {
    const { getList, dataProvider } = providerWith();
    const { wrapper } = await mountList({ list: calendar(), dataProvider });

    await headerButton(wrapper, "Go to next page").trigger("click");
    await flushPromises();
    expect(title(wrapper)).toBe("June 2026");
    expect(lastFilter(getList).filter.ends_at_gte).toBe(
      new Date(2026, 4, 31).toISOString(),
    );

    await headerButton(wrapper, "Go to previous page").trigger("click");
    await headerButton(wrapper, "Go to previous page").trigger("click");
    await flushPromises();
    expect(title(wrapper)).toBe("April 2026");
    expect(lastFilter(getList).filter.ends_at_gte).toBe(
      new Date(2026, 2, 29).toISOString(),
    );
  });

  it("Today returns to the current month", async () => {
    const { wrapper } = await mountList({ list: calendar() });

    await headerButton(wrapper, "Go to next page").trigger("click");
    await headerButton(wrapper, "Go to next page").trigger("click");
    expect(title(wrapper)).toBe("July 2026");

    await button(wrapper, "Today").trigger("click");
    expect(title(wrapper)).toBe("May 2026");
  });

  it("weekStartsOn sets the first weekday column and the first cell", async () => {
    const { wrapper } = await mountList({
      list: calendar({ weekStartsOn: 1 }),
    });

    expect(
      wrapper.findAll('[role="columnheader"]').map((node) => node.text())[0],
    ).toBe("Mon");
    expect(cells(wrapper)[0]?.attributes("data-date")).toBe("2026-04-27");
    expect(cells(wrapper).at(-1)?.attributes("data-date")).toBe("2026-05-31");
    expect(cells(wrapper)).toHaveLength(35);
  });

  it("rangeFilter replaces the default filter keys", async () => {
    const { getList, dataProvider } = providerWith();
    await mountList({
      list: calendar({
        rangeFilter: (range: { start: Date; end: Date }) => ({
          from: range.start.toISOString(),
          to: range.end.toISOString(),
        }),
      }),
      dataProvider,
    });

    expect(lastFilter(getList).filter).toEqual({
      from: new Date(2026, 3, 26).toISOString(),
      to: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });
  });

  it("removes its range filter and restores perPage on unmount", async () => {
    const { dataProvider } = providerWith();
    let listContext: ReturnType<typeof useListContext> | undefined;
    const show = ref(true);
    const Toggle = defineComponent({
      setup() {
        listContext = useListContext();
        const perPageBefore = listContext.perPage;
        return () =>
          h("div", [
            show.value
              ? h(CalendarList, {
                  startSource: "starts_at",
                  endSource: "ends_at",
                })
              : null,
            h("span", { "data-testid": "per-page-before" }, perPageBefore),
          ]);
      },
    });
    const { wrapper } = await mountList({
      list: () => h(Toggle),
      dataProvider,
    });
    const initialPerPage = Number(
      wrapper.get("[data-testid=per-page-before]").text(),
    );
    expect(initialPerPage).not.toBe(1000);
    expect(listContext?.perPage).toBe(1000);
    expect(Object.keys(listContext?.filter ?? {})).toContain("ends_at_gte");

    show.value = false;
    await flushPromises();
    expect(wrapper.find("[data-slot=calendar-header]").exists()).toBe(false);
    expect(listContext?.filter).toEqual({});
    expect(listContext?.perPage).toBe(initialPerPage);
  });

  it("restores the list's own perPage when the URL already carried the calendar's own", async () => {
    // Back from an event's page seeds perPage=1000 from the URL.
    let listContext: ReturnType<typeof useListContext> | undefined;
    const show = ref(true);
    const Toggle = defineComponent({
      setup() {
        listContext = useListContext();
        return () =>
          show.value
            ? h(CalendarList, {
                startSource: "starts_at",
                endSource: "ends_at",
              })
            : null;
      },
    });
    const { wrapper } = await mountList({
      list: () => h(Toggle),
      path: "/meetings?perPage=1000",
      perPage: 25,
    });
    expect(listContext?.perPage).toBe(1000);

    show.value = false;
    await flushPromises();
    expect(wrapper.find("[data-slot=calendar-header]").exists()).toBe(false);
    expect(listContext?.perPage).toBe(25);
  });

  it("drops a starts_at_gte a list URL kept from before endSource bounded the end", async () => {
    const stale = JSON.stringify({
      starts_at_gte: new Date(2026, 3, 26).toISOString(),
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      kind: "work",
    });
    const { getList, dataProvider } = providerWith();
    let listContext: ReturnType<typeof useListContext> | undefined;
    const Probe = defineComponent({
      setup() {
        listContext = useListContext();
        return () => null;
      },
    });
    await mountList({
      list: () => h("div", [h(Probe), calendar()()]),
      dataProvider,
      path: `/meetings?filter=${encodeURIComponent(stale)}&perPage=1000`,
    });

    const expected = {
      kind: "work",
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
      ends_at_gte: new Date(2026, 3, 26).toISOString(),
    };
    expect(lastFilter(getList).filter).toEqual(expected);
    expect(listContext?.filter).toEqual(expected);
  });

  it("moves the today mark to the next day at midnight", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 4, 15, 23, 59));
    const { wrapper } = await mountList({ list: calendar() });
    const marked = () =>
      cells(wrapper)
        .filter((node) => node.attributes("aria-current") === "date")
        .map((node) => node.attributes("data-date"));
    expect(marked()).toEqual(["2026-05-15"]);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(marked()).toEqual(["2026-05-16"]);
  });

  it("keeps the filters the user set", async () => {
    const { getList, dataProvider } = providerWith();
    let listContext: ReturnType<typeof useListContext> | undefined;
    const Probe = defineComponent({
      setup() {
        listContext = useListContext();
        return () => null;
      },
    });
    const { wrapper } = await mountList({
      list: () => h("div", [h(Probe), calendar()()]),
      dataProvider,
    });

    listContext?.setFilters({ kind: "work" });
    await flushPromises();
    expect(lastFilter(getList).filter).toEqual({
      kind: "work",
      ends_at_gte: new Date(2026, 3, 26).toISOString(),
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });

    await headerButton(wrapper, "Go to next page").trigger("click");
    await flushPromises();
    expect(lastFilter(getList).filter).toEqual({
      kind: "work",
      ends_at_gte: new Date(2026, 4, 31).toISOString(),
      starts_at_lte: new Date(2026, 6, 4, 23, 59, 59, 999).toISOString(),
    });
  });

  it("a select-event listener receives the record and without one the event links to the edit page", async () => {
    const onSelectEvent = vi.fn();
    const linked = await mountList({ list: calendar({ titleSource: "name" }) });
    const link = cell(linked.wrapper, "2026-05-04").get(
      "[data-slot=calendar-event]",
    );
    expect(link.element.tagName).toBe("A");
    expect(link.attributes("href")).toBe("/meetings/1");
    await link.trigger("click");
    await flushPromises();
    expect(linked.router.currentRoute.value.path).toBe("/meetings/1");

    const listened = await mountList({
      list: calendar({ titleSource: "name", onSelectEvent }),
    });
    const event = cell(listened.wrapper, "2026-05-04").get(
      "[data-slot=calendar-event]",
    );
    expect(event.attributes("href")).toBeUndefined();
    await event.trigger("click");
    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectEvent.mock.calls[0]?.[0]).toMatchObject({ id: 1 });
    expect(listened.router.currentRoute.value.path).toBe("/meetings");
  });

  it("an empty cell emits select-slot with the whole day, an event click does not", async () => {
    const onSelectSlot = vi.fn();
    const onSelectEvent = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onSelectSlot, onSelectEvent }),
    });

    await cell(wrapper, "2026-05-20").trigger("click");
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    expect(onSelectSlot).toHaveBeenCalledWith({
      startISO: new Date(2026, 4, 20).toISOString(),
      endISO: new Date(2026, 4, 20, 23, 59, 59, 999).toISOString(),
      allDay: true,
    });

    await cell(wrapper, "2026-05-04")
      .get("[data-slot=calendar-event]")
      .trigger("click");
    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
  });

  it("colorMap colors an event by its colorSource value", async () => {
    const { wrapper } = await mountList({
      list: calendar({
        titleSource: "name",
        colorSource: "kind",
        colorMap: { work: "#3b82f6", trip: "#22c55e" },
      }),
    });

    const color = (date: string) =>
      cell(wrapper, date)
        .get("[data-slot=calendar-event]")
        .attributes("data-color");
    expect(color("2026-05-04")).toBe("#3b82f6");
    expect(color("2026-05-12")).toBe("#22c55e");
  });

  it("the event and header slots replace the defaults", async () => {
    const { wrapper } = await mountList({
      list: calendar(
        { titleSource: "name" },
        {
          event: (info: { title: string; record: LooseRecord }) =>
            h("em", { "data-testid": "custom-event" }, `custom ${info.title}`),
          header: (info: {
            anchor: Date;
            view: string;
            onNavigate: (direction: "next" | "previous" | "today") => void;
          }) =>
            h(
              "button",
              {
                "data-testid": "custom-header",
                onClick: () => info.onNavigate("next"),
              },
              `${info.view} ${info.anchor.getMonth() + 1}`,
            ),
        },
      ),
    });

    expect(wrapper.find("[data-slot=calendar-header]").exists()).toBe(false);
    expect(wrapper.find("[data-slot=calendar-event]").exists()).toBe(false);
    expect(
      cell(wrapper, "2026-05-04").get("[data-testid=custom-event]").text(),
    ).toBe("custom Kickoff");

    const header = wrapper.get("[data-testid=custom-header]");
    expect(header.text()).toBe("month 5");
    await header.trigger("click");
    expect(header.text()).toBe("month 6");
  });
});

// 10 to 16 May is the week of the fixed clock; the agenda runs 1 to 29 May.
const SCHEDULE = [
  ...MEETINGS,
  {
    id: 4,
    name: "Standup",
    starts_at: "2026-05-13T09:30:00",
    ends_at: "2026-05-13T10:00:00",
    kind: "work",
  },
  { id: 5, name: "Prep", starts_at: "2026-05-04T08:00:00", kind: "work" },
];

const hourCell = (wrapper: VueWrapper, date: string, hour: number) => {
  const found = cells(wrapper).find(
    (node) =>
      node.attributes("data-date") === date &&
      node.attributes("data-hour") === String(hour),
  );
  if (!found) throw new Error(`no cell for ${date} ${hour}h`);
  return found;
};
const eventsInHour = (wrapper: VueWrapper, date: string, hour: number) =>
  hourCell(wrapper, date, hour)
    .findAll("[data-slot=calendar-event]")
    .map((node) => node.text());
const switcherButton = (wrapper: VueWrapper, text: string) => {
  const found = wrapper
    .findAll("[data-slot=calendar-view-switcher] button")
    .find((node) => node.text() === text);
  if (!found) throw new Error(`no view button ${text}`);
  return found;
};

describe("<CalendarList> week view", () => {
  const week = (props: Record<string, unknown> = {}) =>
    calendar({ titleSource: "name", defaultView: "week", ...props });

  it("renders 7 day headers and 24 hour rows", async () => {
    const { wrapper } = await mountList({ list: week() });

    expect(wrapper.find("[data-slot=calendar-week]").exists()).toBe(true);
    expect(
      wrapper.findAll('[role="columnheader"]').map((node) => node.text()),
    ).toEqual([
      "Sun 10",
      "Mon 11",
      "Tue 12",
      "Wed 13",
      "Thu 14",
      "Fri 15",
      "Sat 16",
    ]);
    expect(wrapper.findAll('[role="rowheader"]')).toHaveLength(24);
    expect(wrapper.findAll('[role="rowheader"]')[0]?.text()).toBe("12 AM");
    expect(wrapper.findAll('[role="rowheader"]')[13]?.text()).toBe("1 PM");
    expect(cells(wrapper)).toHaveLength(7 * 24);
    expect(cells(wrapper)[0]?.attributes("data-date")).toBe("2026-05-10");
    expect(cells(wrapper).at(-1)?.attributes("data-date")).toBe("2026-05-16");
  });

  it("asks the data provider for the visible week", async () => {
    const { getList, dataProvider } = providerWith();
    await mountList({ list: week(), dataProvider });

    expect(lastFilter(getList).filter).toEqual({
      ends_at_gte: new Date(2026, 4, 10).toISOString(),
      starts_at_lte: new Date(2026, 4, 16, 23, 59, 59, 999).toISOString(),
    });
  });

  it("places an event in the cell of its start hour", async () => {
    const { dataProvider } = providerWith(SCHEDULE);
    const { wrapper } = await mountList({ list: week(), dataProvider });

    expect(eventsInHour(wrapper, "2026-05-13", 9)).toEqual(["Standup"]);
    expect(eventsInHour(wrapper, "2026-05-13", 10)).toEqual([]);
    expect(eventsInHour(wrapper, "2026-05-12", 9)).toEqual([]);
    // A multi-day event shows once, in the hour it starts.
    expect(eventsInHour(wrapper, "2026-05-12", 0)).toEqual(["Conference"]);
    expect(eventsInHour(wrapper, "2026-05-13", 0)).toEqual([]);
    expect(wrapper.findAll("[data-slot=calendar-event]")).toHaveLength(2);
  });

  it("an empty hour cell emits select-slot with that hour and allDay false", async () => {
    const onSelectSlot = vi.fn();
    const { wrapper } = await mountList({ list: week({ onSelectSlot }) });

    await hourCell(wrapper, "2026-05-14", 14).trigger("click");
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    expect(onSelectSlot).toHaveBeenCalledWith({
      startISO: new Date(2026, 4, 14, 14).toISOString(),
      endISO: new Date(2026, 4, 14, 15).toISOString(),
      allDay: false,
    });

    await hourCell(wrapper, "2026-05-14", 23).trigger("click");
    expect(onSelectSlot).toHaveBeenLastCalledWith({
      startISO: new Date(2026, 4, 14, 23).toISOString(),
      endISO: new Date(2026, 4, 15).toISOString(),
      allDay: false,
    });
  });

  it("an event click emits select-event and not select-slot", async () => {
    const onSelectSlot = vi.fn();
    const onSelectEvent = vi.fn();
    const { dataProvider } = providerWith(SCHEDULE);
    const { wrapper } = await mountList({
      list: week({ onSelectSlot, onSelectEvent }),
      dataProvider,
    });

    await hourCell(wrapper, "2026-05-13", 9)
      .get("[data-slot=calendar-event]")
      .trigger("click");
    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectEvent.mock.calls[0]?.[0]).toMatchObject({ id: 4 });
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("without a listener an event links to the edit page", async () => {
    const { dataProvider } = providerWith(SCHEDULE);
    const { wrapper } = await mountList({ list: week(), dataProvider });

    const link = hourCell(wrapper, "2026-05-13", 9).get(
      "[data-slot=calendar-event]",
    );
    expect(link.attributes("href")).toBe("/meetings/4");
  });

  it("Next moves a week and refetches the new range", async () => {
    const { getList, dataProvider } = providerWith();
    const { wrapper } = await mountList({ list: week(), dataProvider });

    await headerButton(wrapper, "Go to next page").trigger("click");
    await flushPromises();
    expect(cells(wrapper)[0]?.attributes("data-date")).toBe("2026-05-17");
    expect(lastFilter(getList).filter).toEqual({
      ends_at_gte: new Date(2026, 4, 17).toISOString(),
      starts_at_lte: new Date(2026, 4, 23, 23, 59, 59, 999).toISOString(),
    });

    await headerButton(wrapper, "Go to previous page").trigger("click");
    await headerButton(wrapper, "Go to previous page").trigger("click");
    await flushPromises();
    expect(cells(wrapper)[0]?.attributes("data-date")).toBe("2026-05-03");
  });
});

describe("<CalendarList> agenda view", () => {
  const agenda = (props: Record<string, unknown> = {}) =>
    calendar({ titleSource: "name", defaultView: "agenda", ...props });
  const days = (wrapper: VueWrapper) =>
    wrapper.findAll("[data-slot=calendar-agenda-day]");

  it("groups events by day in start order", async () => {
    const { dataProvider } = providerWith(SCHEDULE);
    const { wrapper } = await mountList({ list: agenda(), dataProvider });

    expect(wrapper.find("[data-slot=calendar-agenda]").exists()).toBe(true);
    expect(days(wrapper).map((node) => node.attributes("data-date"))).toEqual([
      "2026-05-04",
      "2026-05-12",
      "2026-05-13",
      "2026-05-29",
    ]);
    expect(days(wrapper)[0]?.get("h3").text()).toBe("Monday, May 4");
    expect(
      days(wrapper).map((node) =>
        node.findAll("[data-slot=calendar-event]").map((event) => event.text()),
      ),
    ).toEqual([["Prep", "Kickoff"], ["Conference"], ["Standup"], ["Retro"]]);
  });

  it("shows the empty label when the range holds no event", async () => {
    const { dataProvider } = providerWith([]);
    const { wrapper } = await mountList({ list: agenda(), dataProvider });

    expect(days(wrapper)).toHaveLength(0);
    expect(wrapper.get("[data-slot=calendar-agenda-empty]").text()).toBe(
      "No events",
    );
  });

  it("Next moves a fortnight and refetches the new range", async () => {
    const { getList, dataProvider } = providerWith();
    const { wrapper } = await mountList({ list: agenda(), dataProvider });
    expect(lastFilter(getList).filter).toEqual({
      ends_at_gte: new Date(2026, 4, 1).toISOString(),
      starts_at_lte: new Date(2026, 4, 29, 23, 59, 59, 999).toISOString(),
    });

    await headerButton(wrapper, "Go to next page").trigger("click");
    await flushPromises();
    expect(lastFilter(getList).filter).toEqual({
      ends_at_gte: new Date(2026, 4, 15).toISOString(),
      starts_at_lte: new Date(2026, 5, 12, 23, 59, 59, 999).toISOString(),
    });
  });

  it("an event click emits select-event", async () => {
    const onSelectEvent = vi.fn();
    const { wrapper } = await mountList({ list: agenda({ onSelectEvent }) });

    await days(wrapper)[0]?.get("[data-slot=calendar-event]").trigger("click");
    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectEvent.mock.calls[0]?.[0]).toMatchObject({ id: 1 });
  });
});

describe("<CalendarList> views", () => {
  it("the switcher changes the view and marks the current one", async () => {
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name" }),
    });
    const pressed = () =>
      wrapper
        .findAll("[data-slot=calendar-view-switcher] button")
        .filter((node) => node.attributes("aria-pressed") === "true")
        .map((node) => node.text());

    expect(
      wrapper
        .findAll("[data-slot=calendar-view-switcher] button")
        .map((node) => node.text()),
    ).toEqual(["Month", "Week", "Agenda"]);
    expect(pressed()).toEqual(["Month"]);
    expect(wrapper.find("[data-slot=calendar-month]").exists()).toBe(true);

    await switcherButton(wrapper, "Week").trigger("click");
    await flushPromises();
    expect(pressed()).toEqual(["Week"]);
    expect(wrapper.find("[data-slot=calendar-week]").exists()).toBe(true);
    expect(wrapper.find("[data-slot=calendar-month]").exists()).toBe(false);

    await switcherButton(wrapper, "Agenda").trigger("click");
    await flushPromises();
    expect(pressed()).toEqual(["Agenda"]);
    expect(wrapper.find("[data-slot=calendar-agenda]").exists()).toBe(true);

    await switcherButton(wrapper, "Month").trigger("click");
    await flushPromises();
    expect(pressed()).toEqual(["Month"]);
    expect(title(wrapper)).toBe("May 2026");
  });

  it("changing the view refetches the range of the new view", async () => {
    const { getList, dataProvider } = providerWith();
    const { wrapper } = await mountList({ list: calendar(), dataProvider });

    await switcherButton(wrapper, "Week").trigger("click");
    await flushPromises();
    expect(lastFilter(getList).filter.ends_at_gte).toBe(
      new Date(2026, 4, 10).toISOString(),
    );
  });

  it("the views prop limits the switcher and defaultView picks the first view", async () => {
    const limited = await mountList({
      list: calendar({ views: ["week", "agenda"], defaultView: "agenda" }),
    });
    expect(
      limited.wrapper
        .findAll("[data-slot=calendar-view-switcher] button")
        .map((node) => node.text()),
    ).toEqual(["Week", "Agenda"]);
    expect(limited.wrapper.find("[data-slot=calendar-agenda]").exists()).toBe(
      true,
    );

    // The default view is not offered: the first offered view is shown.
    const fallback = await mountList({
      list: calendar({ views: ["week", "agenda"] }),
    });
    expect(fallback.wrapper.find("[data-slot=calendar-week]").exists()).toBe(
      true,
    );
    expect(fallback.wrapper.find("[data-slot=calendar-month]").exists()).toBe(
      false,
    );

    // The order given is the order offered, and the first one opens.
    const reordered = await mountList({
      list: calendar({ views: ["agenda", "week"] }),
    });
    expect(
      reordered.wrapper
        .findAll("[data-slot=calendar-view-switcher] button")
        .map((node) => node.text()),
    ).toEqual(["Agenda", "Week"]);
    expect(reordered.wrapper.find("[data-slot=calendar-agenda]").exists()).toBe(
      true,
    );

    // One view needs no switcher.
    const single = await mountList({ list: calendar({ views: ["month"] }) });
    expect(
      single.wrapper.find("[data-slot=calendar-view-switcher]").exists(),
    ).toBe(false);
  });

  it("the event slot applies in the week and agenda views", async () => {
    const { dataProvider } = providerWith(SCHEDULE);
    const { wrapper } = await mountList({
      list: calendar(
        { titleSource: "name", defaultView: "week" },
        {
          event: (info: { title: string }) =>
            h("em", { "data-testid": "custom-event" }, `custom ${info.title}`),
        },
      ),
      dataProvider,
    });

    expect(wrapper.find("[data-slot=calendar-event]").exists()).toBe(false);
    expect(
      hourCell(wrapper, "2026-05-13", 9)
        .get("[data-testid=custom-event]")
        .text(),
    ).toBe("custom Standup");

    await switcherButton(wrapper, "Agenda").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-slot=calendar-event]").exists()).toBe(false);
    expect(
      wrapper.findAll("[data-testid=custom-event]").map((node) => node.text()),
    ).toEqual([
      "custom Prep",
      "custom Kickoff",
      "custom Conference",
      "custom Standup",
      "custom Retro",
    ]);
  });
});

describe("<CalendarList> drag", () => {
  const dataTransfer = () => ({
    effectAllowed: "uninitialized",
    dropEffect: "none",
    setData: vi.fn(),
    getData: vi.fn(),
  });
  const eventIn = (wrapper: VueWrapper, date: string, text: string) => {
    const found = cell(wrapper, date)
      .findAll("[data-slot=calendar-event]")
      .find((node) => node.text() === text);
    if (!found) throw new Error(`no event ${text} on ${date}`);
    return found;
  };
  // The drag attributes sit on the list item around an event, so they cover a
  // custom `#event` slot too.
  const item = (node: { element: Element }) => {
    const found = node.element.closest("li");
    if (!found) throw new Error("event outside a list item");
    return found;
  };
  const draggable = () => calendar({ titleSource: "name", onDrop: vi.fn() });

  it("events are not draggable without a drop listener", async () => {
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name" }),
    });

    const event = eventIn(wrapper, "2026-05-04", "Kickoff");
    expect(item(event).hasAttribute("draggable")).toBe(false);
    const transfer = dataTransfer();
    await event.trigger("dragstart", { dataTransfer: transfer });
    expect(transfer.setData).not.toHaveBeenCalled();
    expect(item(event).hasAttribute("data-dragging")).toBe(false);
    await cell(wrapper, "2026-05-06").trigger("dragover", {
      dataTransfer: transfer,
    });
    expect(cell(wrapper, "2026-05-06").attributes("data-over")).toBeUndefined();
  });

  it("dropping an event on another day emits drop with the moved ISO start and end", async () => {
    const onDrop = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onDrop }),
    });

    const event = eventIn(wrapper, "2026-05-04", "Kickoff");
    expect(item(event).getAttribute("draggable")).toBe("true");
    const transfer = dataTransfer();
    await event.trigger("dragstart", { dataTransfer: transfer });
    expect(item(event).hasAttribute("data-dragging")).toBe(true);
    expect(transfer.effectAllowed).toBe("move");
    expect(transfer.setData).toHaveBeenCalled();
    await cell(wrapper, "2026-05-06").trigger("dragover", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-05-06").trigger("drop", {
      dataTransfer: transfer,
    });
    await event.trigger("dragend", { dataTransfer: transfer });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0]?.[0]).toMatchObject({ id: 1 });
    expect(onDrop.mock.calls[0]?.[1]).toEqual({
      start: new Date(2026, 4, 6, 9).toISOString(),
      end: new Date(2026, 4, 6, 10).toISOString(),
    });
    expect(item(event).hasAttribute("data-dragging")).toBe(false);
  });

  it("an event with no end is dropped with no end", async () => {
    const onDrop = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onDrop }),
    });

    const transfer = dataTransfer();
    await eventIn(wrapper, "2026-05-29", "Retro").trigger("dragstart", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-06-02").trigger("drop", {
      dataTransfer: transfer,
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0]?.[0]).toMatchObject({ id: 3 });
    expect(onDrop.mock.calls[0]?.[1]).toEqual({
      start: new Date(2026, 5, 2, 15).toISOString(),
    });
    expect("end" in (onDrop.mock.calls[0]?.[1] as object)).toBe(false);
  });

  it("a multi-day event dragged from its second day moves by the day difference", async () => {
    const onDrop = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onDrop }),
    });

    const transfer = dataTransfer();
    await eventIn(wrapper, "2026-05-13", "Conference").trigger("dragstart", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-05-15").trigger("drop", {
      dataTransfer: transfer,
    });

    expect(onDrop.mock.calls[0]?.[1]).toEqual({
      start: new Date(2026, 4, 14).toISOString(),
      end: new Date(2026, 4, 18).toISOString(),
    });
  });

  it("dropping on the original day emits nothing", async () => {
    const onDrop = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onDrop }),
    });

    const transfer = dataTransfer();
    await eventIn(wrapper, "2026-05-13", "Conference").trigger("dragstart", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-05-13").trigger("drop", {
      dataTransfer: transfer,
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("marks the target cell with data-over during a drag and clears it after", async () => {
    const { wrapper } = await mountList({ list: draggable() });

    const transfer = dataTransfer();
    await eventIn(wrapper, "2026-05-04", "Kickoff").trigger("dragstart", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-05-06").trigger("dragover", {
      dataTransfer: transfer,
    });
    expect(cell(wrapper, "2026-05-06").attributes("data-over")).toBeDefined();
    expect(cell(wrapper, "2026-05-07").attributes("data-over")).toBeUndefined();

    await cell(wrapper, "2026-05-07").trigger("dragover", {
      dataTransfer: transfer,
    });
    expect(cell(wrapper, "2026-05-06").attributes("data-over")).toBeUndefined();
    expect(cell(wrapper, "2026-05-07").attributes("data-over")).toBeDefined();

    await cell(wrapper, "2026-05-07").trigger("drop", {
      dataTransfer: transfer,
    });
    expect(cell(wrapper, "2026-05-07").attributes("data-over")).toBeUndefined();

    await eventIn(wrapper, "2026-05-04", "Kickoff").trigger("dragstart", {
      dataTransfer: transfer,
    });
    await cell(wrapper, "2026-05-08").trigger("dragover", {
      dataTransfer: transfer,
    });
    await eventIn(wrapper, "2026-05-04", "Kickoff").trigger("dragend", {
      dataTransfer: transfer,
    });
    expect(cell(wrapper, "2026-05-08").attributes("data-over")).toBeUndefined();
  });

  it("an event in the event slot drags like the default one", async () => {
    const onDrop = vi.fn();
    const { wrapper } = await mountList({
      list: calendar(
        { titleSource: "name", onDrop },
        { event: (info: { title: string }) => h("em", {}, info.title) },
      ),
    });

    const custom = cell(wrapper, "2026-05-04").get("em");
    expect(item(custom).getAttribute("draggable")).toBe("true");
    const transfer = dataTransfer();
    await custom.trigger("dragstart", { dataTransfer: transfer });
    await cell(wrapper, "2026-05-06").trigger("drop", {
      dataTransfer: transfer,
    });

    expect(onDrop.mock.calls[0]?.[0]).toMatchObject({ id: 1 });
    expect(onDrop.mock.calls[0]?.[1]).toEqual({
      start: new Date(2026, 4, 6, 9).toISOString(),
      end: new Date(2026, 4, 6, 10).toISOString(),
    });
  });

  it("a click on a draggable event still emits select-event", async () => {
    const onSelectEvent = vi.fn();
    const { wrapper } = await mountList({
      list: calendar({ titleSource: "name", onDrop: vi.fn(), onSelectEvent }),
    });

    await eventIn(wrapper, "2026-05-04", "Kickoff").trigger("click");

    expect(onSelectEvent).toHaveBeenCalledTimes(1);
    expect(onSelectEvent.mock.calls[0]?.[0]).toMatchObject({ id: 1 });
  });
});
