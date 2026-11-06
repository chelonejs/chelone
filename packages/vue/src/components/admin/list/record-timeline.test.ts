/**
 * `<RecordTimeline>`: the records of the ambient list as a dated activity
 * list. Mounted in a `<ReferenceManyField>` under `<Admin>`; assertions are on
 * DOM, roles and text.
 */

import {
  createI18n,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideRecordContext } from "../../../record/record-context";
import ReferenceManyField from "../fields/reference-many-field.vue";
import RecordTimeline, {
  type RecordTimelineProps,
} from "./record-timeline.vue";

const NOW = new Date("2026-03-10T12:00:00.000Z");

const events = [
  {
    id: 1,
    post_id: 1,
    message: "Created the post",
    at: "2026-03-10T10:00:00.000Z",
    by: "Ada",
    kind: "create",
  },
  {
    id: 2,
    post_id: 1,
    message: "Published the post",
    at: "2026-03-09T12:00:00.000Z",
    by: "Grace",
    kind: "publish",
  },
  {
    id: 3,
    post_id: 2,
    message: "Another post",
    at: "2026-03-01T12:00:00.000Z",
    by: "Linus",
    kind: "create",
  },
];

const mounted: VueWrapper[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.useRealTimers();
});

const Star = defineComponent({
  render: () => h("svg", { "data-testid": "star" }),
});

async function mountTimeline({
  timeline = {},
  slots = {},
  records = events,
  dataProvider = fakeDataProvider({ events: structuredClone(records) }),
  sort,
  messages = {},
}: {
  timeline?: Partial<RecordTimelineProps>;
  slots?: Record<string, () => VNodeChild>;
  records?: LooseRecord[];
  dataProvider?: DataProvider;
  sort?: { field: string; order: "ASC" | "DESC" };
  messages?: Record<string, string>;
} = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Post = defineComponent({
    setup() {
      provideRecordContext({ id: 1 });
      return () =>
        h(
          ReferenceManyField,
          { reference: "events", target: "post_id", sort },
          {
            default: () =>
              h(
                RecordTimeline,
                {
                  messageSource: "message",
                  timestampSource: "at",
                  ...timeline,
                },
                slots,
              ),
          },
        );
    },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          queryClient,
          i18n: createI18n({
            locale: "en",
            messages: { en: defineMessages(messages) },
          }),
        },
        { default: () => h(Post), layout: () => h("div") },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

const entries = (wrapper: VueWrapper) =>
  wrapper.findAll('[data-slot="record-timeline-entry"]');

describe("<RecordTimeline>", () => {
  it("renders an entry per record of a ReferenceManyField, in the field's sort order", async () => {
    const desc = await mountTimeline({ sort: { field: "at", order: "DESC" } });
    expect(desc.get("ol").attributes("data-slot")).toBe("record-timeline");
    expect(
      entries(desc).map((entry) => entry.attributes("data-entry-id")),
    ).toEqual(["1", "2"]);
    expect(entries(desc).every((entry) => entry.element.tagName === "LI")).toBe(
      true,
    );

    const asc = await mountTimeline({ sort: { field: "at", order: "ASC" } });
    expect(
      entries(asc).map((entry) => entry.attributes("data-entry-id")),
    ).toEqual(["2", "1"]);
  });

  it("shows the message, the user and a relative time with the ISO date in dateTime", async () => {
    const wrapper = await mountTimeline({
      timeline: { userSource: "by" },
      sort: { field: "at", order: "DESC" },
    });
    const [first] = entries(wrapper);
    expect(first?.text()).toContain("Created the post");
    expect(first?.text()).toContain("Ada");
    const time = first?.get("time");
    expect(time?.attributes("datetime")).toBe("2026-03-10T10:00:00.000Z");
    expect(time?.text()).toBe("2 hours ago");
    expect(time?.attributes("title")).toBe(
      new Date("2026-03-10T10:00:00.000Z").toLocaleString("en"),
    );
  });

  it("an entry with no user or no valid date leaves that part out", async () => {
    const wrapper = await mountTimeline({
      timeline: { userSource: "by" },
      records: [
        { id: 1, post_id: 1, message: "No user", at: "2026-03-10T10:00:00Z" },
        { id: 2, post_id: 1, message: "No date", at: "soon", by: "Ada" },
      ],
      sort: { field: "id", order: "ASC" },
    });
    const [noUser, noDate] = entries(wrapper);
    expect(noUser?.find("time").exists()).toBe(true);
    expect(noUser?.find('[data-slot="record-timeline-user"]').exists()).toBe(
      false,
    );
    expect(noDate?.find("time").exists()).toBe(false);
    expect(noDate?.text()).toContain("Ada");
  });

  it("picks the icon from icons by the icon source and falls back to the clock", async () => {
    const wrapper = await mountTimeline({
      timeline: { iconSource: "kind", icons: { publish: Star } },
      sort: { field: "id", order: "ASC" },
    });
    const [create, publish] = entries(wrapper);
    expect(create?.find('[data-testid="star"]').exists()).toBe(false);
    const clock = create?.find("svg");
    expect(clock?.exists()).toBe(true);
    expect(clock?.element.closest('[aria-hidden="true"]')).not.toBeNull();
    const star = publish?.find('[data-testid="star"]');
    expect(star?.exists()).toBe(true);
    expect(star?.element.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("falls back to the clock for an icon key that only Object.prototype has", async () => {
    const wrapper = await mountTimeline({
      timeline: { iconSource: "kind", icons: { publish: Star } },
      records: [
        {
          id: 1,
          post_id: 1,
          message: "A",
          at: "2026-03-10T10:00:00Z",
          kind: "constructor",
        },
        {
          id: 2,
          post_id: 1,
          message: "B",
          at: "2026-03-10T10:00:00Z",
          kind: "hasOwnProperty",
        },
      ],
      sort: { field: "id", order: "ASC" },
    });
    expect(entries(wrapper)).toHaveLength(2);
    for (const entry of entries(wrapper)) {
      expect(entry.find('[data-testid="star"]').exists()).toBe(false);
      expect(entry.find("svg").exists()).toBe(true);
    }
  });

  it("shows the translated empty text with no records, and the empty slot when given", async () => {
    const translated = await mountTimeline({
      records: [],
      messages: { "chelone.record_timeline.empty": "Quiet" },
    });
    expect(translated.get('[data-slot="record-timeline-empty"]').text()).toBe(
      "Quiet",
    );

    const custom = await mountTimeline({
      records: [],
      slots: { empty: () => h("p", "Nothing here") },
    });
    expect(custom.text()).toContain("Nothing here");
    expect(custom.find('[data-slot="record-timeline-empty"]').exists()).toBe(
      false,
    );
  });

  it("shows the loading slot while pending", async () => {
    const dataProvider = fakeDataProvider({ events });
    dataProvider.getManyReference = () => new Promise(() => {});
    const wrapper = await mountTimeline({
      dataProvider,
      slots: { loading: () => h("p", "Loading the timeline") },
    });
    expect(wrapper.text()).toContain("Loading the timeline");
    expect(wrapper.find("ol").exists()).toBe(false);
  });

  it("renders a message and user that hold markup as text", async () => {
    const message = "<img src=x onerror=alert(1)>";
    const user = "<script>alert(1)</script>";
    const wrapper = await mountTimeline({
      timeline: { userSource: "by" },
      records: [
        { id: 1, post_id: 1, message, at: "2026-03-10T10:00:00Z", by: user },
      ],
    });
    const [entry] = entries(wrapper);
    expect(entry?.text()).toContain(message);
    expect(entry?.text()).toContain(user);
    expect(entry?.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
  });
});
