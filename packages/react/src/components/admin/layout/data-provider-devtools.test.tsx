/**
 * `<DataProviderDevtools>` mounted the way an app does: once, in the layout,
 * under a real `<Admin>` whose data provider the log wraps. Assertions are on
 * DOM, roles and the log's store; jsdom applies no CSS, so placement is not
 * checked.
 */

import { createDataProviderLog, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Admin, Layout, Resource, useGetList } from "../../../index";
import {
  DataProviderDevtools,
  type DataProviderDevtoolsProps,
} from "./data-provider-devtools";

afterEach(() => {
  cleanup();
});

function PostsPage() {
  const { data } = useGetList("posts");
  return <p>{data ? `${data.data.length} posts` : "loading"}</p>;
}

function mount(
  props: Partial<DataProviderDevtoolsProps> = {},
  options: Parameters<typeof createDataProviderLog>[0] = {},
  provider: ReturnType<typeof fakeDataProvider> = fakeDataProvider({
    posts: [{ id: 1, title: "Hello" }],
  }),
) {
  const log = createDataProviderLog(options);
  const dataProvider = log.wrap(provider);
  function AppLayout({ children }: { children?: ReactNode }) {
    return (
      <>
        <DataProviderDevtools log={log} {...props} />
        <Layout>{children}</Layout>
      </>
    );
  }
  render(
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin dataProvider={dataProvider} queryClient={new QueryClient()}>
        <Admin.Layout>
          <AppLayout />
        </Admin.Layout>
        <Resource name="posts" list={PostsPage} />
      </Admin>
    </MemoryRouter>,
  );
  return { log, dataProvider };
}

/** The component's root in either state: the trigger button closed, the panel open. */
function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    '[data-slot="data-provider-devtools"]',
  );
  if (!el) throw new Error("no data provider devtools");
  return el;
}

const isOpen = () => root().getAttribute("data-open") === "true";
const panel = () => screen.getByRole("region", { name: "Data provider" });
const trigger = () => screen.getByRole("button", { name: /^Data provider/ });
const badge = () => {
  const el = document.querySelector(
    '[data-slot="data-provider-devtools-badge"]',
  );
  if (!el) throw new Error("no data provider devtools badge");
  return el.textContent?.trim() ?? "";
};
const entries = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="data-provider-devtools-entry"]',
  ),
];

describe("<DataProviderDevtools>", () => {
  it("lists the calls an Admin page makes through the wrapped provider", async () => {
    mount();

    await screen.findByText("1 posts");

    const [entry] = entries();
    expect(entry?.getAttribute("data-slot")).toBe(
      "data-provider-devtools-entry",
    );
    expect(entry?.getAttribute("data-status")).toBe("ok");
    expect(entry?.textContent).toContain("getList");
    expect(entry?.textContent).toContain("posts");
    expect(within(panel()).getByText("1")).toBeTruthy();
    expect(panel().getAttribute("data-slot")).toBe("data-provider-devtools");
    expect(panel().getAttribute("data-open")).toBe("true");
  });

  it("marks a failed call and shows its error", async () => {
    const { dataProvider } = mount(
      {},
      {},
      {
        ...fakeDataProvider({ posts: [] }),
        getOne: async () => {
          throw new Error("record is gone");
        },
      },
    );

    await act(async () => {
      await dataProvider.getOne("posts", { id: 9 }).catch(() => undefined);
    });

    const failed = entries().find(
      (li) => li.getAttribute("data-status") === "error",
    );
    expect(failed?.textContent).toContain("getOne");
    expect(failed?.textContent).toContain("record is gone");
  });

  it("shows entries newest first with their duration", async () => {
    let tick = 0;
    const durations = [12.34, 5];
    const { dataProvider } = mount(
      {},
      {
        now: () => {
          tick += 1;
          // each call reads the timer at its start and at its end
          return tick % 2 === 1 ? 0 : (durations[tick / 2 - 1] ?? 0);
        },
      },
    );
    await screen.findByText("1 posts");
    await act(async () => {
      await dataProvider.getOne("posts", { id: 1 });
    });

    const [newest, oldest] = entries();
    expect(newest?.textContent).toContain("getOne");
    expect(newest?.textContent).toContain("5.0ms");
    expect(oldest?.textContent).toContain("getList");
    expect(oldest?.textContent).toContain("12.3ms");
  });

  it("Clear empties the list", async () => {
    const { log } = mount();
    await screen.findByText("1 posts");
    expect(entries().length).toBeGreaterThan(0);

    fireEvent.click(within(panel()).getByRole("button", { name: "Clear" }));

    expect(entries()).toHaveLength(0);
    expect(log.store.getSnapshot().entries).toHaveLength(0);
    expect(within(panel()).getByText("No calls yet")).toBeTruthy();
  });

  it("closed shows a trigger button with the call count, and opens the panel", async () => {
    mount({ defaultOpen: false });
    await screen.findByText("1 posts");

    expect(isOpen()).toBe(false);
    expect(entries()).toHaveLength(0);
    const button = trigger();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(badge()).toBe("1");

    fireEvent.click(button);

    expect(isOpen()).toBe(true);
    expect(entries().length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(panel());
    expect(
      within(panel())
        .getByRole("button", { name: "Hide" })
        .getAttribute("aria-expanded"),
    ).toBe("true");

    fireEvent.click(within(panel()).getByRole("button", { name: "Hide" }));

    expect(isOpen()).toBe(false);
    expect(entries()).toHaveLength(0);
    expect(badge()).toBe("1");
    expect(document.activeElement).toBe(trigger());
  });

  it("the shortcut toggles the panel and leaves focus where it was", async () => {
    mount();
    await screen.findByText("1 posts");
    const [outside] = screen.getAllByRole("link");
    if (!outside) throw new Error("no app link to focus");
    outside.focus();

    const press = () =>
      fireEvent.keyDown(window, { key: "d", ctrlKey: true, shiftKey: true });

    expect(press()).toBe(false);
    expect(isOpen()).toBe(false);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
    press();
    expect(isOpen()).toBe(true);
    expect(document.activeElement).toBe(outside);
  });

  it("the shortcut prop replaces the default", async () => {
    mount({ shortcut: "mod+j" });
    await screen.findByText("1 posts");

    fireEvent.keyDown(window, { key: "d", ctrlKey: true, shiftKey: true });
    expect(isOpen()).toBe(true);

    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    expect(isOpen()).toBe(false);
  });

  it("shows params that cannot be stringified as [unserializable]", async () => {
    const { dataProvider } = mount();
    const circular: { self?: object } = {};
    circular.self = circular;

    await act(async () => {
      await dataProvider.getOne("posts", { id: 1, meta: circular });
    });

    const [newest] = entries();
    expect(newest?.querySelector("details")?.textContent).toContain(
      "[unserializable]",
    );
  });

  it("cuts a long value to 2000 characters", async () => {
    const { dataProvider } = mount();

    await act(async () => {
      await dataProvider.getOne("posts", { id: 1, meta: "x".repeat(5000) });
    });

    const [newest] = entries();
    const shown = newest?.querySelector("pre")?.textContent ?? "";
    expect(shown.length).toBe(2000);
  });

  it("renders hostile errors and params as text", async () => {
    const { dataProvider } = mount(
      {},
      {},
      {
        ...fakeDataProvider({ posts: [] }),
        getOne: async () => {
          throw new Error("<img src=x onerror=alert(1)>");
        },
      },
    );

    await act(async () => {
      await dataProvider
        .getOne("posts", { id: "<script>alert(1)</script>" })
        .catch(() => undefined);
    });

    await waitFor(() => expect(entries().length).toBeGreaterThan(0));
    const failed = entries().find(
      (li) => li.getAttribute("data-status") === "error",
    );
    expect(failed?.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(failed?.textContent).toContain("<script>alert(1)</script>");
    expect(panel().querySelector("img")).toBeNull();
    expect(panel().querySelector("script")).toBeNull();
  });
});
