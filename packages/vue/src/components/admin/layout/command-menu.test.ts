/**
 * `<CommandMenu>` — mounted the way an app mounts it: wrapping the layout in
 * the `#layout` slot of `<Admin>`. Each test drives the menu through window
 * key events and the rendered options, and reads the router and the data
 * provider for what the menu did.
 */

import {
  type AuthProvider,
  type CheloneStore,
  type CommandAction,
  createI18n,
  createNotificationStore,
  createStore,
  type DataProvider,
  fakeDataProvider,
  type GetListParams,
  type GetListResult,
  type RecentEntry,
  recentsKey,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Component,
  defineComponent,
  h,
  nextTick,
  ref,
  type VNodeChild,
} from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import CommandMenu from "./command-menu.vue";
import {
  type CommandMenuAction,
  useCommandMenu,
  useRegisterCommand,
} from "./command-menu-context";
import ThemeProvider from "./theme-provider.vue";

const Blank = defineComponent({ setup: () => () => h("div") });

const mounted: VueWrapper[] = [];

beforeEach(() => {
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const posts = [
  { id: 1, title: "Alpha" },
  { id: 2, title: "Beta" },
];

function makeDataProvider(
  getList: (resource: string, params: GetListParams) => GetListResult = () => ({
    data: [],
    total: 0,
  }),
): DataProvider {
  return {
    ...fakeDataProvider({}),
    getList: vi.fn(async (resource: string, params: GetListParams) =>
      getList(resource, params),
    ),
  };
}

const authProvider = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada" }),
  ...over,
});

interface MountOptions {
  props?: Record<string, unknown>;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  store?: CheloneStore | null;
  basename?: string;
  /** Rendered inside the menu, as the layout would be. */
  layout?: () => VNodeChild;
  resources?: VNodeChild[];
}

async function mountMenu(options: MountOptions = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  await router.push("/");
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const dataProvider = options.dataProvider ?? makeDataProvider();
  const menuProps = ref(options.props ?? {});
  const wrapper = mount(Admin, {
    props: {
      dataProvider,
      authProvider: options.authProvider,
      basename: options.basename,
      notifications,
      store:
        options.store === null ? undefined : (options.store ?? createStore()),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      i18n: createI18n({ locale: "en", messages: { en: {} } }),
    },
    slots: {
      default: () =>
        options.resources ?? [
          h(Resource, { name: "posts", list: Blank, show: Blank, edit: Blank }),
          h(Resource, { name: "comments", list: Blank, edit: Blank }),
          h(Resource, { name: "tags", edit: Blank }),
        ],
      layout: () =>
        h(ThemeProvider, null, () =>
          h(CommandMenu, menuProps.value, {
            default: options.layout ?? (() => h("main", "app")),
          }),
        ),
    },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await flushPromises();
  return {
    wrapper,
    router,
    notify,
    dataProvider,
    setMenuProps: (next: Record<string, unknown>) => {
      menuProps.value = next;
    },
  };
}

/** Poll `predicate`, flushing promises and timers between attempts. */
async function until(predicate: () => boolean, tries = 100): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    if (predicate()) return;
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("until: condition never became true");
}

function press(init: KeyboardEventInit, target: EventTarget = window): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, ...init }),
  );
}

const dialog = () => document.body.querySelector('[role="dialog"]');
const input = () =>
  document.body.querySelector<HTMLInputElement>('[role="combobox"]');
const options = () =>
  [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].filter(
    (option) => option.style.display !== "none",
  );
const optionTexts = () =>
  options().map((option) => option.textContent?.trim() ?? "");
const option = (text: string) =>
  options().find((o) => o.textContent?.trim().startsWith(text));
const headings = () =>
  [
    ...document.body.querySelectorAll('[data-slot="command-group-heading"]'),
  ].map((heading) => heading.textContent?.trim());

async function openMenu(): Promise<void> {
  press({ key: "k", ctrlKey: true });
  await until(() => dialog() !== null);
  await flushPromises();
}

async function type(text: string): Promise<void> {
  const field = input();
  if (!field) throw new Error("the menu is closed");
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

async function pick(text: string): Promise<void> {
  const target = option(text);
  if (!target) throw new Error(`no option "${text}": ${optionTexts()}`);
  target.click();
  await flushPromises();
}

describe("CommandMenu hotkey", () => {
  it("CommandMenu is closed until the hotkey and opens on Ctrl+K and Meta+K", async () => {
    await mountMenu();
    expect(dialog()).toBeNull();

    press({ key: "k", ctrlKey: true });
    await until(() => dialog() !== null);

    press({ key: "k", ctrlKey: true });
    await until(() => dialog() === null);

    press({ key: "k", metaKey: true });
    await until(() => dialog() !== null);
    expect(input()).not.toBeNull();
  });

  it("CommandMenu closes on Escape and clears the query", async () => {
    await mountMenu();
    await openMenu();
    await type("zzz");
    expect(input()?.value).toBe("zzz");

    press({ key: "Escape" }, document);
    await until(() => dialog() === null);

    await openMenu();
    expect(input()?.value).toBe("");
  });

  it("CommandMenu opens on a custom hotkey and not at all with hotkey false", async () => {
    const { setMenuProps } = await mountMenu({ props: { hotkey: "mod+j" } });

    press({ key: "k", ctrlKey: true });
    await flushPromises();
    expect(dialog()).toBeNull();

    press({ key: "j", ctrlKey: true });
    await until(() => dialog() !== null);
    press({ key: "Escape" }, document);
    await until(() => dialog() === null);

    // The listener reads the newest hotkey, not the one it mounted with.
    setMenuProps({ hotkey: "mod+u" });
    await flushPromises();
    press({ key: "j", ctrlKey: true });
    await flushPromises();
    expect(dialog()).toBeNull();
    press({ key: "u", ctrlKey: true });
    await until(() => dialog() !== null);
    press({ key: "Escape" }, document);
    await until(() => dialog() === null);

    setMenuProps({ hotkey: false });
    await flushPromises();
    press({ key: "u", ctrlKey: true });
    press({ key: "k", ctrlKey: true });
    await flushPromises();
    expect(dialog()).toBeNull();
  });

  it("CommandMenu ignores a bare-key hotkey typed in an input", async () => {
    await mountMenu({ props: { hotkey: "/" } });
    const field = document.createElement("input");
    document.body.append(field);

    press({ key: "/" }, field);
    await flushPromises();
    expect(dialog()).toBeNull();

    press({ key: "/" }, document.body);
    await until(() => dialog() !== null);
  });

  it("CommandMenu removes its keydown listener when it unmounts", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { wrapper } = await mountMenu();

    const added = add.mock.calls.filter(([type]) => type === "keydown");
    expect(added).toHaveLength(1);
    expect(
      remove.mock.calls.filter(([type]) => type === "keydown"),
    ).toHaveLength(0);

    wrapper.unmount();
    mounted.splice(mounted.indexOf(wrapper), 1);

    expect(
      remove.mock.calls.filter(
        ([type, listener]) => type === "keydown" && listener === added[0]?.[1],
      ),
    ).toHaveLength(1);
  });
});

describe("CommandMenu resources", () => {
  it("CommandMenu lists the resources that have a list view and navigates to one", async () => {
    const { router } = await mountMenu();
    await openMenu();

    expect(optionTexts()).toContain("Posts");
    expect(optionTexts()).toContain("Comments");
    expect(optionTexts()).not.toContain("Tags");

    await pick("Comments");
    await until(() => router.currentRoute.value.path === "/comments");
    await until(() => dialog() === null);
  });

  it("CommandMenu honours the basename when it navigates", async () => {
    const { router } = await mountMenu({ basename: "/admin" });
    await openMenu();

    await pick("Posts");
    await until(() => router.currentRoute.value.path === "/admin/posts");
  });

  it("CommandMenu hides a resource the user cannot list", async () => {
    await mountMenu({
      authProvider: authProvider({
        canAccess: async ({ resource }) => resource !== "comments",
      }),
    });
    await openMenu();
    await until(() => optionTexts().includes("Posts"));

    expect(optionTexts()).not.toContain("Comments");
  });

  it("CommandMenu limits the resources to the resources prop", async () => {
    await mountMenu({ props: { resources: ["comments"] } });
    await openMenu();

    expect(optionTexts()).toContain("Comments");
    expect(optionTexts()).not.toContain("Posts");
  });

  it("CommandMenu remembers a pick and shows it under Recent with an empty query", async () => {
    const { router } = await mountMenu();
    await openMenu();
    expect(headings()).not.toContain("Recent");

    await pick("Posts");
    await until(() => router.currentRoute.value.path === "/posts");
    await until(() => dialog() === null);

    await openMenu();
    expect(headings()).toContain("Recent");
    const recent = document.body.querySelector(
      '[data-slot="command-group"][aria-labelledby]',
    );
    expect(recent?.textContent).toContain("Recent");
    expect(recent?.textContent).toContain("Posts");

    // A typed query hides the Recent group.
    await type("com");
    expect(headings()).not.toContain("Recent");
  });
});

describe("CommandMenu recents", () => {
  it("ten recent picks are kept by default", async () => {
    const store = createStore();
    const entries: RecentEntry[] = Array.from({ length: 12 }, (_, i) => ({
      type: "record",
      resource: "posts",
      id: i + 1,
      label: `Post ${i + 1}`,
    }));
    store.setItem(recentsKey, entries);
    await mountMenu({ store });
    await openMenu();

    const recent = [
      ...document.body.querySelectorAll('[data-slot="command-group"]'),
    ].find((group) => group.textContent?.startsWith("Recent"));
    expect(recent?.querySelectorAll('[role="option"]')).toHaveLength(10);
  });
});

describe("CommandMenu record search", () => {
  const searching = () =>
    makeDataProvider((resource, params) => {
      const search = Object.values(params.filter ?? {})[0] ?? "";
      if (typeof search !== "string")
        throw new Error("Expected a search string");
      const needle = search.toLowerCase();
      return {
        data:
          resource === "posts"
            ? posts.filter((post) => post.title.toLowerCase().includes(needle))
            : [],
        total: 1,
      };
    });

  it("CommandMenu searches records after the debounce and opens the show view", async () => {
    const dataProvider = searching();
    const { router } = await mountMenu({
      dataProvider,
      props: { searchDebounceMs: 40, perResourceLimit: 3 },
    });
    await openMenu();
    const getList = vi.mocked(dataProvider.getList);
    expect(getList).not.toHaveBeenCalled();

    await type("alp");
    expect(getList).not.toHaveBeenCalled();

    await until(() => option("Alpha") !== undefined);
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        filter: { q: "alp" },
        pagination: { page: 1, perPage: 3 },
      }),
    );
    expect(headings()).toContain("Posts");

    await pick("Alpha");
    await until(() => router.currentRoute.value.path === "/posts/1/show");
  });

  it("CommandMenu sends no search request for a resource the user cannot list", async () => {
    const dataProvider = searching();
    await mountMenu({
      dataProvider,
      authProvider: authProvider({
        canAccess: async ({ resource }) => resource !== "comments",
      }),
      props: { searchDebounceMs: 10 },
    });
    await openMenu();
    await type("alp");

    const getList = vi.mocked(dataProvider.getList);
    await until(() => option("Alpha") !== undefined);
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const searched = getList.mock.calls.map(([resource]) => resource);
    expect(searched).toContain("posts");
    expect(searched).not.toContain("comments");
  });

  it("CommandMenu uses the searchFields entry as the filter key", async () => {
    const dataProvider = searching();
    await mountMenu({
      dataProvider,
      props: { searchDebounceMs: 10, searchFields: { posts: "title" } },
    });
    await openMenu();
    await type("bet");

    await until(() => option("Beta") !== undefined);
    expect(dataProvider.getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({ filter: { title: "bet" } }),
    );
  });

  it("CommandMenu opens the edit view of a record whose resource has no show view", async () => {
    const dataProvider = makeDataProvider((resource) => ({
      data: resource === "comments" ? [{ id: 7, name: "Nice post" }] : [],
      total: 1,
    }));
    const { router } = await mountMenu({
      dataProvider,
      props: { searchDebounceMs: 10 },
    });
    await openMenu();
    await type("nice");

    await until(() => option("Nice post") !== undefined);
    await pick("Nice post");
    await until(() => router.currentRoute.value.path === "/comments/7");
  });

  it("CommandMenu shows a record the provider matched even when its text does not match the query", async () => {
    const dataProvider = makeDataProvider((resource) => ({
      data: resource === "posts" ? [{ id: 9, title: "Zed" }] : [],
      total: 1,
    }));
    await mountMenu({ dataProvider, props: { searchDebounceMs: 10 } });
    await openMenu();
    await type("alp");

    await until(() => option("Zed") !== undefined);
  });
});

describe("CommandMenu actions", () => {
  it("CommandMenu shows Refresh and the three theme actions", async () => {
    await mountMenu();
    await openMenu();

    for (const label of [
      "Refresh",
      "Light theme",
      "Dark theme",
      "System theme",
    ]) {
      expect(optionTexts()).toContain(label);
    }

    await pick("Dark theme");
    await until(() => document.documentElement.classList.contains("dark"));
  });

  it("CommandMenu shows Log out only when an auth provider exists", async () => {
    await mountMenu();
    await openMenu();
    expect(optionTexts()).not.toContain("Log out");
    press({ key: "Escape" }, document);
    await until(() => dialog() === null);
    wrapperUnmount();

    const logout = vi.fn(async () => {});
    await mountMenu({ authProvider: authProvider({ logout }) });
    await openMenu();
    await until(() => optionTexts().includes("Log out"));

    await pick("Log out");
    await until(() => logout.mock.calls.length === 1);
  });

  it("CommandMenu runs an actions prop entry, closes, and groups it under its group name", async () => {
    const onSelect = vi.fn();
    await mountMenu({
      props: {
        actions: [
          {
            id: "new-post",
            label: "Write a post",
            group: "Authoring",
            keywords: ["draft"],
            onSelect,
          },
        ],
      },
    });
    await openMenu();

    expect(headings()).toContain("Authoring");
    await pick("Write a post");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await until(() => dialog() === null);
  });

  it("CommandMenu hides a registered command whose when returns false", async () => {
    const visible = ref(false);
    const Registrar = defineComponent({
      setup() {
        useRegisterCommand({
          id: "gated",
          label: "Gated command",
          when: () => visible.value,
          onSelect: () => {},
        });
        return () => null;
      },
    });
    await mountMenu({ layout: () => h(Registrar) });
    await openMenu();
    expect(optionTexts()).not.toContain("Gated command");

    visible.value = true;
    await until(() => optionTexts().includes("Gated command"));
  });

  it("a rejected onSelect notifies an error and closes the menu", async () => {
    const { notify } = await mountMenu({
      props: {
        actions: [
          {
            id: "boom",
            label: "Explode",
            onSelect: () => Promise.reject(new Error("no")),
          },
        ],
      },
    });
    await openMenu();

    await pick("Explode");
    await until(() => notify.mock.calls.length > 0);
    expect(notify).toHaveBeenCalledWith("chelone.notification.http_error", {
      type: "error",
    });
    await until(() => dialog() === null);
  });

  it("an onSelect that returns a value that is not a promise closes the menu without an error", async () => {
    const onSelect = vi.fn(() => window.location.href);
    const action: CommandAction<string, Component> = {
      id: "open",
      label: "Open page",
      onSelect,
    };
    const { notify } = await mountMenu({ props: { actions: [action] } });
    await openMenu();

    await pick("Open page");
    await until(() => dialog() === null);
    await flushPromises();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it("an onSelect that returns nothing closes the menu without an error", async () => {
    const onSelect = vi.fn(() => {});
    const { notify } = await mountMenu({
      props: { actions: [{ id: "quiet", label: "Be quiet", onSelect }] },
    });
    await openMenu();

    await pick("Be quiet");
    await until(() => dialog() === null);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("useRegisterCommand", () => {
  function registrar(
    action: () => CommandMenuAction,
    show = ref(true),
  ): { layout: () => VNodeChild } {
    const Registrar = defineComponent({
      setup() {
        useRegisterCommand(action);
        return () => null;
      },
    });
    return { layout: () => (show.value ? h(Registrar) : h("main", "app")) };
  }

  it("useRegisterCommand adds a command on setup and removes it when the scope is disposed", async () => {
    const show = ref(true);
    await mountMenu(
      registrar(
        () => ({ id: "extra", label: "Extra command", onSelect: () => {} }),
        show,
      ),
    );
    await openMenu();
    expect(optionTexts()).toContain("Extra command");

    show.value = false;
    await until(() => !optionTexts().includes("Extra command"));
  });

  it("useRegisterCommand registers again when its action ref changes", async () => {
    const label = ref("First label");
    await mountMenu(
      registrar(() => ({
        id: "dynamic",
        label: label.value,
        onSelect: () => {},
      })),
    );
    await openMenu();
    expect(optionTexts()).toContain("First label");

    label.value = "Second label";
    await until(() => optionTexts().includes("Second label"));
    expect(optionTexts()).not.toContain("First label");
  });

  it("useCommandMenu throws outside a CommandMenu", () => {
    const Outside = defineComponent({
      setup() {
        useCommandMenu();
        return () => null;
      },
    });
    const silence = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(Outside)).toThrow(/CommandMenu/);
    silence.mockRestore();
  });

  it("useCommandMenu opens and closes the menu from a descendant", async () => {
    let menu: ReturnType<typeof useCommandMenu> | undefined;
    const Opener = defineComponent({
      setup() {
        menu = useCommandMenu();
        return () => null;
      },
    });
    await mountMenu({ layout: () => h(Opener) });
    expect(menu?.isOpen.value).toBe(false);

    menu?.open();
    await until(() => dialog() !== null);
    expect(menu?.isOpen.value).toBe(true);

    menu?.setQuery("abc");
    await until(() => input()?.value === "abc");

    menu?.close();
    await until(() => dialog() === null);
  });
});

/**
 * A `matchMedia` double with a fixed answer. jsdom ships none, so a narrow
 * screen is faked here.
 */
function fakeMatchMedia(matches: boolean): (query: string) => MediaQueryList {
  return (query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

describe("CommandMenu on a narrow screen", () => {
  it("CommandMenu opens in the same dialog on a narrow screen", async () => {
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("matchMedia", fakeMatchMedia(true));
    try {
      await mountMenu();
      await openMenu();

      expect(
        document.body.querySelector('[data-slot="command-dialog"]'),
      ).not.toBeNull();
      expect(
        document.body.querySelector('[data-slot="sheet-content"]'),
      ).toBeNull();
      expect(input()).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("CommandMenu focuses the search box when it opens on a narrow screen", async () => {
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("matchMedia", fakeMatchMedia(true));
    try {
      await mountMenu();
      await openMenu();

      await until(() => document.activeElement === input());
      expect(document.activeElement).toBe(input());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// Used by the Log out test, which mounts twice.
function wrapperUnmount(): void {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
}
