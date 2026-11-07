/**
 * `<DataProviderDevtools>` mounted the way an app does: once, in the `#layout`
 * slot of a real `<Admin>` whose data provider the log wraps. Assertions are on
 * DOM, roles and the log's store; jsdom applies no CSS, so placement is not
 * checked.
 */

import { createDataProviderLog, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { useGetList } from "../../../data/queries";
import DataProviderDevtools, {
  type DataProviderDevtoolsProps,
} from "./data-provider-devtools.vue";

const mounted: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
});

const PostsPage = defineComponent({
  setup() {
    const { data } = useGetList("posts");
    return () =>
      h("p", data.value ? `${data.value.data.length} posts` : "loading");
  },
});

async function mountPanel(
  props: Partial<DataProviderDevtoolsProps> = {},
  options: Parameters<typeof createDataProviderLog>[0] = {},
  provider: ReturnType<typeof fakeDataProvider> = fakeDataProvider({
    posts: [{ id: 1, title: "Hello" }],
  }),
) {
  const log = createDataProviderLog(options);
  const dataProvider = log.wrap(provider);
  const shownLog = shallowRef(log);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/posts", component: PostsPage }],
  });
  await router.push("/posts");
  const wrapper = mount(Admin, {
    props: { dataProvider, queryClient: new QueryClient() },
    slots: {
      default: () => h(Resource, { name: "posts", list: PostsPage }),
      layout: () => [
        h(DataProviderDevtools, { ...props, log: shownLog.value }),
        h(RouterView),
      ],
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, log, dataProvider, shownLog };
}

/** The component's root in either state: the trigger button closed, the panel open. */
function panel(): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(
    '[data-slot="data-provider-devtools"]',
  );
  if (!el) throw new Error("no data provider devtools panel");
  return el;
}

/** The round trigger button, which is the root only while the panel is closed. */
function trigger(): HTMLButtonElement {
  const el = document.body.querySelector<HTMLButtonElement>(
    'button[data-slot="data-provider-devtools"]',
  );
  if (!el) throw new Error("no data provider devtools trigger");
  return el;
}

function badge(): string {
  const el = document.body.querySelector(
    '[data-slot="data-provider-devtools-badge"]',
  );
  if (!el) throw new Error("no data provider devtools badge");
  return el.textContent?.trim() ?? "";
}

const byName = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === name,
  );

function button(name: string): HTMLButtonElement {
  const found = byName(panel(), name);
  if (!found) throw new Error(`no "${name}" button`);
  return found;
}

const entries = () => [
  ...panel().querySelectorAll<HTMLElement>(
    '[data-slot="data-provider-devtools-entry"]',
  ),
];

describe("DataProviderDevtools", () => {
  it("lists the calls an Admin page makes through the wrapped provider", async () => {
    await mountPanel();

    const [entry] = entries();
    expect(document.body.textContent).toContain("1 posts");
    expect(entry?.getAttribute("data-status")).toBe("ok");
    expect(entry?.textContent).toContain("getList");
    expect(entry?.textContent).toContain("posts");
    expect(panel().getAttribute("aria-label")).toBe("Data provider");
    expect(panel().getAttribute("data-open")).toBe("true");
    expect(panel().querySelector("header")?.textContent).toContain("1");
  });

  it("marks a failed call and shows its error", async () => {
    const { dataProvider } = await mountPanel(
      {},
      {},
      {
        ...fakeDataProvider({ posts: [] }),
        getOne: async () => {
          throw new Error("record is gone");
        },
      },
    );

    await dataProvider.getOne("posts", { id: 9 }).catch(() => undefined);
    await flushPromises();

    const failed = entries().find(
      (li) => li.getAttribute("data-status") === "error",
    );
    expect(failed?.textContent).toContain("getOne");
    expect(failed?.textContent).toContain("record is gone");
  });

  it("shows entries newest first with their duration", async () => {
    let tick = 0;
    const durations = [12.34, 5];
    const { dataProvider } = await mountPanel(
      {},
      {
        now: () => {
          tick += 1;
          // each call reads the timer at its start and at its end
          return tick % 2 === 1 ? 0 : (durations[tick / 2 - 1] ?? 0);
        },
      },
    );
    await dataProvider.getOne("posts", { id: 1 });
    await flushPromises();

    const [newest, oldest] = entries();
    expect(newest?.textContent).toContain("getOne");
    expect(newest?.textContent).toContain("5.0ms");
    expect(oldest?.textContent).toContain("getList");
    expect(oldest?.textContent).toContain("12.3ms");
  });

  it("Clear empties the list", async () => {
    const { log } = await mountPanel();
    expect(entries().length).toBeGreaterThan(0);

    button("Clear").click();
    await flushPromises();

    expect(entries()).toHaveLength(0);
    expect(log.store.getSnapshot().entries).toHaveLength(0);
    expect(panel().textContent).toContain("No calls yet");
  });

  it("closed shows a trigger button with the call count, and opens the panel", async () => {
    await mountPanel({ defaultOpen: false });

    expect(panel().getAttribute("data-open")).toBe("false");
    expect(entries()).toHaveLength(0);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(badge()).toBe("1");

    trigger().click();
    await flushPromises();

    expect(panel().getAttribute("data-open")).toBe("true");
    expect(entries().length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(panel());
    expect(button("Hide").getAttribute("aria-expanded")).toBe("true");

    button("Hide").click();
    await flushPromises();

    expect(panel().getAttribute("data-open")).toBe("false");
    expect(entries()).toHaveLength(0);
    expect(badge()).toBe("1");
    expect(document.activeElement).toBe(trigger());
  });

  it("the shortcut toggles the panel, leaves focus alone, and stops after unmount", async () => {
    const { wrapper } = await mountPanel();
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    const press = () => {
      const event = new KeyboardEvent("keydown", {
        key: "d",
        ctrlKey: true,
        shiftKey: true,
        cancelable: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
      return event;
    };

    expect(press().defaultPrevented).toBe(true);
    await flushPromises();
    expect(panel().getAttribute("data-open")).toBe("false");
    expect(document.activeElement).toBe(field);
    press();
    await flushPromises();
    expect(panel().getAttribute("data-open")).toBe("true");
    expect(document.activeElement).toBe(field);

    wrapper.unmount();
    mounted.length = 0;
    expect(press().defaultPrevented).toBe(false);
  });

  it("the shortcut prop replaces the default", async () => {
    await mountPanel({ shortcut: "mod+j" });
    const press = (key: string, shiftKey: boolean) =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, ctrlKey: true, shiftKey }),
      );

    press("d", true);
    await flushPromises();
    expect(panel().getAttribute("data-open")).toBe("true");

    press("j", false);
    await flushPromises();
    expect(panel().getAttribute("data-open")).toBe("false");
  });

  it("follows a new log prop, and Clear empties the log on screen", async () => {
    const { shownLog } = await mountPanel();
    const other = createDataProviderLog();
    const otherProvider = other.wrap(fakeDataProvider({ posts: [] }));
    expect(entries().length).toBeGreaterThan(0);

    shownLog.value = other;
    await flushPromises();
    expect(entries()).toHaveLength(0);

    await otherProvider.getOne("posts", { id: 3 }).catch(() => undefined);
    await flushPromises();
    expect(entries().map((el) => el.textContent)).toEqual([
      expect.stringContaining("getOne"),
    ]);

    button("Clear").click();
    await flushPromises();
    expect(other.store.getSnapshot().entries).toHaveLength(0);
    expect(entries()).toHaveLength(0);
  });

  it("shows params that cannot be stringified as [unserializable]", async () => {
    const { dataProvider } = await mountPanel();
    const circular: { self?: object } = {};
    circular.self = circular;

    await dataProvider.getOne("posts", { id: 1, meta: circular });
    await flushPromises();

    const [newest] = entries();
    expect(newest?.querySelector("details")?.textContent).toContain(
      "[unserializable]",
    );
  });

  it("cuts a long value to 2000 characters", async () => {
    const { dataProvider } = await mountPanel();

    await dataProvider.getOne("posts", { id: 1, meta: "x".repeat(5000) });
    await flushPromises();

    const [newest] = entries();
    expect(newest?.querySelector("pre")?.textContent?.length).toBe(2000);
  });

  it("renders hostile errors and params as text", async () => {
    const { dataProvider } = await mountPanel(
      {},
      {},
      {
        ...fakeDataProvider({ posts: [] }),
        getOne: async () => {
          throw new Error("<img src=x onerror=alert(1)>");
        },
      },
    );

    await dataProvider
      .getOne("posts", { id: "<script>alert(1)</script>" })
      .catch(() => undefined);
    await flushPromises();

    const failed = entries().find(
      (li) => li.getAttribute("data-status") === "error",
    );
    expect(failed?.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(failed?.textContent).toContain("<script>alert(1)</script>");
    expect(panel().querySelector("img")).toBeNull();
    expect(panel().querySelector("script")).toBeNull();
  });
});
