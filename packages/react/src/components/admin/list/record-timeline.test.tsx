/**
 * `<RecordTimeline>`: the records of the ambient list as a dated activity
 * list. Mounted in a `<ReferenceManyField>` under the providers `<Admin>`
 * sets up; assertions are on DOM, roles and text.
 */
import {
  createI18n,
  createResourceRegistry,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceManyField } from "../fields/reference-many-field";
import { RecordTimeline, type RecordTimelineProps } from "./record-timeline";

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount({
  timeline = {},
  records = events,
  dataProvider = fakeDataProvider({ events: structuredClone(records) }),
  sort,
  messages = {},
}: {
  timeline?: Partial<RecordTimelineProps>;
  records?: LooseRecord[];
  dataProvider?: DataProvider;
  sort?: { field: string; order: "ASC" | "DESC" };
  messages?: Record<string, string>;
} = {}) {
  const registry = createResourceRegistry();
  registry.register({
    name: "events",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <CheloneProvider
          dataProvider={dataProvider}
          queryClient={queryClient}
          i18n={i18n}
        >
          <ResourceRegistryProvider registry={registry}>
            {children}
          </ResourceRegistryProvider>
        </CheloneProvider>
      </MemoryRouter>
    );
  }
  return render(
    <Providers>
      <RecordContextProvider value={{ id: 1 }}>
        <ReferenceManyField reference="events" target="post_id" sort={sort}>
          <RecordTimeline
            messageSource="message"
            timestampSource="at"
            {...timeline}
          />
        </ReferenceManyField>
      </RecordContextProvider>
    </Providers>,
  );
}

const entries = () =>
  waitFor(() => {
    const found = document.querySelectorAll(
      '[data-slot="record-timeline-entry"]',
    );
    expect(found.length).toBeGreaterThan(0);
    return Array.from(found);
  });

describe("<RecordTimeline>", () => {
  it("renders an entry per record of a ReferenceManyField, in the field's sort order", async () => {
    mount({ sort: { field: "at", order: "DESC" } });
    const desc = await entries();
    expect(document.querySelector("ol")?.dataset.slot).toBe("record-timeline");
    expect(desc.map((entry) => entry.getAttribute("data-entry-id"))).toEqual([
      "1",
      "2",
    ]);
    expect(desc.every((entry) => entry.tagName === "LI")).toBe(true);
    cleanup();

    mount({ sort: { field: "at", order: "ASC" } });
    const asc = await entries();
    expect(asc.map((entry) => entry.getAttribute("data-entry-id"))).toEqual([
      "2",
      "1",
    ]);
  });

  it("shows the message, the user and a relative time with the ISO date in dateTime", async () => {
    mount({
      timeline: { userSource: "by" },
      sort: { field: "at", order: "DESC" },
    });
    const [first] = await entries();
    expect(first?.textContent).toContain("Created the post");
    expect(first?.textContent).toContain("Ada");
    const time = first?.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe("2026-03-10T10:00:00.000Z");
    expect(time?.textContent).toBe("2 hours ago");
    expect(time?.getAttribute("title")).toBe(
      new Date("2026-03-10T10:00:00.000Z").toLocaleString("en"),
    );
  });

  it("an entry with no user or no valid date leaves that part out", async () => {
    mount({
      timeline: { userSource: "by" },
      records: [
        { id: 1, post_id: 1, message: "No user", at: "2026-03-10T10:00:00Z" },
        { id: 2, post_id: 1, message: "No date", at: "soon", by: "Ada" },
      ],
      sort: { field: "id", order: "ASC" },
    });
    const [noUser, noDate] = await entries();
    expect(noUser?.querySelector("time")).not.toBeNull();
    expect(
      noUser?.querySelector('[data-slot="record-timeline-user"]'),
    ).toBeNull();
    expect(noDate?.querySelector("time")).toBeNull();
    expect(noDate?.textContent).toContain("Ada");
  });

  it("picks the icon from icons by the icon source and falls back to the clock", async () => {
    const Star = ({ className }: { className?: string }) => (
      <svg data-testid="star" className={className} />
    );
    mount({
      timeline: { iconSource: "kind", icons: { publish: Star } },
      sort: { field: "id", order: "ASC" },
    });
    const [create, publish] = await entries();
    expect(create?.querySelector('[data-testid="star"]')).toBeNull();
    const clock = create?.querySelector("svg");
    expect(clock).not.toBeNull();
    expect(clock?.closest('[aria-hidden="true"]')).not.toBeNull();
    const star = publish?.querySelector('[data-testid="star"]');
    expect(star).not.toBeNull();
    expect(star?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("falls back to the clock for an icon key that only Object.prototype has", async () => {
    const Star = ({ className }: { className?: string }) => (
      <svg data-testid="star" className={className} />
    );
    mount({
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
    const found = await entries();
    expect(found).toHaveLength(2);
    for (const entry of found) {
      expect(entry.querySelector('[data-testid="star"]')).toBeNull();
      expect(entry.querySelector("svg")).not.toBeNull();
    }
  });

  it("shows the translated empty text with no records, and the empty node when given", async () => {
    mount({
      records: [],
      messages: { "chelone.record_timeline.empty": "Quiet" },
    });
    const empty = await waitFor(() => {
      const found = document.querySelector(
        '[data-slot="record-timeline-empty"]',
      );
      expect(found).not.toBeNull();
      return found;
    });
    expect(empty?.textContent).toBe("Quiet");
    cleanup();

    mount({ records: [], timeline: { empty: <p>Nothing here</p> } });
    expect(await screen.findByText("Nothing here")).toBeTruthy();
    expect(
      document.querySelector('[data-slot="record-timeline-empty"]'),
    ).toBeNull();
  });

  it("shows the loading node while pending", async () => {
    const dataProvider = fakeDataProvider({ events });
    dataProvider.getManyReference = () => new Promise(() => {});
    mount({
      dataProvider,
      timeline: { loading: <p>Loading the timeline</p> },
    });
    expect(await screen.findByText("Loading the timeline")).toBeTruthy();
    expect(document.querySelector("ol")).toBeNull();
  });

  it("renders a message and user that hold markup as text", async () => {
    const message = "<img src=x onerror=alert(1)>";
    const user = "<script>alert(1)</script>";
    mount({
      timeline: { userSource: "by" },
      records: [
        { id: 1, post_id: 1, message, at: "2026-03-10T10:00:00Z", by: user },
      ],
    });
    const [entry] = await entries();
    expect(entry?.textContent).toContain(message);
    expect(entry?.textContent).toContain(user);
    expect(entry?.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });
});
