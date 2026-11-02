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
}: {
  list: () => VNodeChild;
  dataProvider?: DataProvider;
  edit?: boolean;
  path?: string;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(path);
  const MeetingList = defineComponent({
    setup: () => () => h(List, { resource: "meetings" }, { default: list }),
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
      starts_at_gte: new Date(2026, 3, 26).toISOString(),
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });
  });

  it("Previous and Next move the month and refetch with the new range", async () => {
    const { getList, dataProvider } = providerWith();
    const { wrapper } = await mountList({ list: calendar(), dataProvider });

    await headerButton(wrapper, "Next").trigger("click");
    await flushPromises();
    expect(title(wrapper)).toBe("June 2026");
    expect(lastFilter(getList).filter.starts_at_gte).toBe(
      new Date(2026, 4, 31).toISOString(),
    );

    await headerButton(wrapper, "Previous").trigger("click");
    await headerButton(wrapper, "Previous").trigger("click");
    await flushPromises();
    expect(title(wrapper)).toBe("April 2026");
    expect(lastFilter(getList).filter.starts_at_gte).toBe(
      new Date(2026, 2, 29).toISOString(),
    );
  });

  it("Today returns to the current month", async () => {
    const { wrapper } = await mountList({ list: calendar() });

    await headerButton(wrapper, "Next").trigger("click");
    await headerButton(wrapper, "Next").trigger("click");
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
            show.value ? h(CalendarList, { startSource: "starts_at" }) : null,
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
    expect(Object.keys(listContext?.filter ?? {})).toContain("starts_at_gte");

    show.value = false;
    await flushPromises();
    expect(wrapper.find("[data-slot=calendar-header]").exists()).toBe(false);
    expect(listContext?.filter).toEqual({});
    expect(listContext?.perPage).toBe(initialPerPage);
  });

  it("restores the list default perPage when the URL already carried the calendar's own", async () => {
    // Back from an event's page seeds perPage=1000 from the URL.
    let listContext: ReturnType<typeof useListContext> | undefined;
    const show = ref(true);
    const Toggle = defineComponent({
      setup() {
        listContext = useListContext();
        return () =>
          show.value ? h(CalendarList, { startSource: "starts_at" }) : null;
      },
    });
    const { wrapper } = await mountList({
      list: () => h(Toggle),
      path: "/meetings?perPage=1000",
    });
    expect(listContext?.perPage).toBe(1000);

    show.value = false;
    await flushPromises();
    expect(wrapper.find("[data-slot=calendar-header]").exists()).toBe(false);
    expect(listContext?.perPage).toBe(10);
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
      starts_at_gte: new Date(2026, 3, 26).toISOString(),
      starts_at_lte: new Date(2026, 5, 6, 23, 59, 59, 999).toISOString(),
    });

    await headerButton(wrapper, "Next").trigger("click");
    await flushPromises();
    expect(lastFilter(getList).filter).toEqual({
      kind: "work",
      starts_at_gte: new Date(2026, 4, 31).toISOString(),
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
