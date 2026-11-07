/**
 * `<CommandMenu>` mounted the way an app does: wrapping `<Layout>` in the
 * `Admin.Layout` slot, under a real `<Admin>` with resources. Assertions are
 * on DOM, roles, data-provider calls and the router location; jsdom applies no
 * CSS, so nothing here checks styling.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  createStore,
  type DataProvider,
  fakeDataProvider,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin, Layout, Resource } from "../../../index";
import { useLocation } from "../../../router";
import { CommandMenu, type CommandMenuProps } from "./command-menu";
import { useCommandMenu, useRegisterCommand } from "./command-menu-context";

afterEach(() => {
  cleanup();
  window.innerWidth = 1024;
});

function seed() {
  return {
    posts: [
      { id: 1, title: "Alpha", q: "alpha" },
      { id: 2, title: "Beta", q: "beta" },
    ],
    authors: [{ id: 10, name: "Ada Lovelace" }],
    tags: [{ id: 7, name: "Gamma" }],
    settings: [],
  };
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function makeAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

interface AppOptions {
  menu?: Omit<CommandMenuProps, "children">;
  menuChildren?: ReactNode;
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  basename?: string;
  initialEntries?: string[];
  notifications?: ReturnType<typeof createNotificationStore>;
  store?: ReturnType<typeof createStore>;
}

const stubPage = () => <div />;

type Hit = Record<string, unknown> & { id: number };

/** A provider whose `getList` answers with `hits[resource]` and is a spy. */
function searchProvider(hits: Record<string, Hit[]>) {
  const getList = vi.fn(async (resource: string) => {
    const data = hits[resource] ?? [];
    return { data, total: data.length };
  });
  const dataProvider: DataProvider = { ...fakeDataProvider(seed()), getList };
  return { getList, dataProvider };
}

const typeQuery = (value: string) =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });

function mount(options: AppOptions = {}) {
  const notifications = options.notifications ?? createNotificationStore();
  const store = options.store ?? createStore();
  const dataProvider = options.dataProvider ?? fakeDataProvider(seed());
  function AppLayout({ children }: { children?: ReactNode }) {
    return (
      <CommandMenu {...options.menu}>
        {options.menuChildren}
        <LocationProbe />
        <Layout>{children}</Layout>
      </CommandMenu>
    );
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <MemoryRouter initialEntries={options.initialEntries ?? ["/posts"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={createI18n({ locale: "en", messages: { en: {} } })}
        notifications={notifications}
        authProvider={options.authProvider}
        store={store}
        basename={options.basename}
      >
        <Admin.Layout>
          <AppLayout />
        </Admin.Layout>
        <Resource
          name="posts"
          list={stubPage}
          show={stubPage}
          edit={stubPage}
        />
        <Resource name="authors" list={stubPage} edit={stubPage} />
        <Resource name="tags" list={stubPage} show={stubPage} />
        <Resource name="settings" create={stubPage} />
      </Admin>
    </MemoryRouter>,
  );
  return { view, notifications, store, dataProvider, queryClient };
}

const pressHotkey = (init: KeyboardEventInit = { key: "k", ctrlKey: true }) =>
  fireEvent.keyDown(window, init);

const openMenu = async () => {
  pressHotkey();
  return await screen.findByRole("dialog");
};

async function openAndPick(name: string) {
  await openMenu();
  return screen.getByRole("option", { name });
}

interface RegisteredProps {
  label: string;
  when?: () => boolean;
  onSelect?: () => void;
}

/** Test handle: `ctrl.set` changes the props of the mounted `<Registered>`. */
const ctrl: {
  set: (patch: Partial<RegisteredProps & { show: boolean }>) => void;
} = { set: () => {} };

function Command({ label, when, onSelect }: RegisteredProps) {
  useRegisterCommand({
    id: label.toLowerCase(),
    label,
    when,
    onSelect: onSelect ?? (() => {}),
  });
  return null;
}

function Registered(initial: RegisteredProps) {
  const [props, setProps] = useState({ show: true, ...initial });
  ctrl.set = (patch) => setProps((prev) => ({ ...prev, ...patch }));
  return props.show ? <Command {...props} /> : null;
}

describe("CommandMenu", () => {
  it("is closed until the hotkey and opens on Ctrl+K and Meta+K", async () => {
    mount();
    expect(screen.queryByRole("dialog")).toBeNull();

    pressHotkey({ key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    pressHotkey({ key: "k", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("closes on Escape and clears the query", async () => {
    mount();
    await openMenu();
    const input = elementOf(screen.getByRole("combobox"), HTMLInputElement);
    fireEvent.change(input, { target: { value: "alp" } });
    expect(input.value).toBe("alp");

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openMenu();
    expect(
      elementOf(screen.getByRole("combobox"), HTMLInputElement).value,
    ).toBe("");
  });

  it("opens on a custom hotkey and not at all with hotkey false", async () => {
    const first = mount({ menu: { hotkey: ["alt+p"] } });
    pressHotkey({ key: "k", ctrlKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    pressHotkey({ key: "p", altKey: true });
    expect(await screen.findByRole("dialog")).toBeTruthy();
    first.view.unmount();

    mount({ menu: { hotkey: false } });
    pressHotkey({ key: "k", ctrlKey: true });
    pressHotkey({ key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores a bare-key hotkey typed in an input", async () => {
    mount({
      menu: { hotkey: ["/"] },
      menuChildren: <input aria-label="elsewhere" />,
    });
    fireEvent.keyDown(screen.getByLabelText("elsewhere"), { key: "/" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("lists the resources that have a list view and navigates to one", async () => {
    mount();
    await openMenu();
    expect(screen.getByRole("option", { name: "Posts" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Authors" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Settings" })).toBeNull();

    fireEvent.click(screen.getByRole("option", { name: "Authors" }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/authors"),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("honours the basename when it navigates", async () => {
    mount({ basename: "/app", initialEntries: ["/app/posts"] });
    await openMenu();
    fireEvent.click(screen.getByRole("option", { name: "Authors" }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/app/authors"),
    );
  });

  it("hides a resource the user cannot list", async () => {
    mount({
      authProvider: makeAuthProvider({
        canAccess: async ({ resource }) => resource !== "authors",
      }),
    });
    await openMenu();
    expect(await screen.findByRole("option", { name: "Posts" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Authors" })).toBeNull();
  });

  it("limits the resources to the resources prop", async () => {
    mount({ menu: { resources: ["tags"] } });
    await openMenu();
    expect(screen.getByRole("option", { name: "Tags" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Posts" })).toBeNull();
  });

  it("searches records after the debounce and opens the show view", async () => {
    const { getList, dataProvider } = searchProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    mount({ dataProvider, menu: { searchDebounceMs: 50 } });
    await openMenu();
    typeQuery("alp");
    expect(getList).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("option", { name: "Alpha" }));
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        filter: { q: "alp" },
        pagination: { page: 1, perPage: 5 },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/posts/1/show"),
    );
  });

  it("records are searched 250ms after the last keystroke by default", async () => {
    const { getList, dataProvider } = searchProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    mount({ dataProvider });
    await openMenu();
    vi.useFakeTimers();
    try {
      typeQuery("alp");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(249);
      });
      expect(getList).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(getList).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the searchFields entry as the filter key", async () => {
    const { getList, dataProvider } = searchProvider({});
    mount({
      dataProvider,
      menu: {
        searchDebounceMs: 0,
        perResourceLimit: 3,
        searchFields: { posts: "title" },
      },
    });
    await openMenu();
    typeQuery("alp");
    await waitFor(() =>
      expect(getList).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({
          filter: { title: "alp" },
          pagination: { page: 1, perPage: 3 },
        }),
      ),
    );
    expect(getList).toHaveBeenCalledWith(
      "authors",
      expect.objectContaining({ filter: { q: "alp" } }),
    );
  });

  it("opens the edit view of a record whose resource has no show view", async () => {
    const { dataProvider } = searchProvider({
      authors: [{ id: 10, name: "Ada Lovelace" }],
    });
    mount({ dataProvider, menu: { searchDebounceMs: 0 } });
    await openMenu();
    typeQuery("ada");
    fireEvent.click(
      await screen.findByRole("option", { name: "Ada Lovelace" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/authors/10"),
    );
  });

  it("shows a record the provider matched even when its text does not match the query", async () => {
    const { dataProvider } = searchProvider({
      posts: [{ id: 2, title: "Beta" }],
    });
    mount({ dataProvider, menu: { searchDebounceMs: 0 } });
    await openMenu();
    typeQuery("zzz");
    expect(await screen.findByRole("option", { name: "Beta" })).toBeTruthy();
    expect(screen.queryByText("No results found.")).toBeNull();
  });

  it("remembers a pick and shows it under Recent with an empty query", async () => {
    const { dataProvider } = searchProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    const { store } = mount({ dataProvider, menu: { searchDebounceMs: 0 } });
    await openMenu();
    expect(screen.queryByText("Recent")).toBeNull();
    typeQuery("alp");
    fireEvent.click(await screen.findByRole("option", { name: "Alpha" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(store.getItem("command-menu.recents")).toEqual([
      { type: "record", resource: "posts", id: 1, label: "Alpha" },
    ]);

    // Move away, then open the menu again and pick the recent.
    fireEvent.click(await openAndPick("Authors"));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/authors"),
    );
    await openMenu();
    const recent = within(
      elementOf(
        screen.getByText("Recent").closest("[cmdk-group]"),
        HTMLElement,
      ),
    );
    fireEvent.click(recent.getByRole("option", { name: "Alpha" }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/posts/1/show"),
    );
  });

  it("hides a recent whose resource the user can no longer list", async () => {
    let denied: string | undefined;
    const { dataProvider } = searchProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    mount({
      dataProvider,
      menu: { searchDebounceMs: 0 },
      authProvider: makeAuthProvider({
        canAccess: async ({ resource }) => resource !== denied,
      }),
    });
    await openMenu();
    typeQuery("alp");
    fireEvent.click(await screen.findByRole("option", { name: "Alpha" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openMenu();
    fireEvent.click(await screen.findByRole("option", { name: "Authors" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    denied = "posts";
    await openMenu();
    const recent = await screen.findByText("Recent");
    const group = within(
      elementOf(recent.closest("[cmdk-group]"), HTMLElement),
    );
    expect(await group.findByRole("option", { name: "Authors" })).toBeTruthy();
    await waitFor(() =>
      expect(group.queryByRole("option", { name: "Alpha" })).toBeNull(),
    );
  });

  it("shows Refresh and the three theme actions", async () => {
    const { queryClient } = mount();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await openMenu();
    for (const name of [
      "Refresh data",
      "Switch to light theme",
      "Switch to dark theme",
      "Use system theme",
    ]) {
      expect(screen.getByRole("option", { name })).toBeTruthy();
    }

    fireEvent.click(
      screen.getByRole("option", { name: "Switch to dark theme" }),
    );
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openMenu();
    fireEvent.click(screen.getByRole("option", { name: "Refresh data" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it("shows Log out only when an auth provider exists", async () => {
    const first = mount();
    await openMenu();
    expect(screen.queryByRole("option", { name: "Log out" })).toBeNull();
    first.view.unmount();

    const logout = vi.fn(async () => {});
    mount({ authProvider: makeAuthProvider({ logout }) });
    await openMenu();
    fireEvent.click(await screen.findByRole("option", { name: "Log out" }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("runs an actions prop entry, closes, and groups it under its group name", async () => {
    const onSelect = vi.fn();
    mount({
      menu: {
        actions: [
          {
            id: "export",
            label: "Export everything",
            group: "Tools",
            shortcut: "E",
            keywords: ["csv"],
            onSelect,
          },
        ],
      },
    });
    await openMenu();
    const group = within(
      elementOf(screen.getByText("Tools").closest("[cmdk-group]"), HTMLElement),
    );
    expect(group.getByText("E")).toBeTruthy();

    // The keyword finds the action although the label has no "csv".
    typeQuery("csv");
    fireEvent.click(
      await screen.findByRole("option", { name: /Export everything/ }),
    );
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("hides a registered command whose when returns false", async () => {
    mount({
      menuChildren: (
        <>
          <Registered label="Shown" />
          <Registered label="Hidden" when={() => false} />
        </>
      ),
    });
    await openMenu();
    expect(screen.getByRole("option", { name: "Shown" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Hidden" })).toBeNull();
  });

  it("notifies an error when an async action rejects", async () => {
    // The layout's toaster drains the store, so spy on `notify` instead.
    const notifications = createNotificationStore();
    const notify = vi.spyOn(notifications, "notify");
    mount({
      notifications,
      menu: {
        actions: [
          {
            id: "boom",
            label: "Explode",
            onSelect: async () => {
              throw new Error("boom");
            },
          },
        ],
      },
    });
    await openMenu();
    fireEvent.click(screen.getByRole("option", { name: "Explode" }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith("chelone.notification.http_error", {
        type: "error",
        messageArgs: { _: "Error: boom" },
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens in the same dialog on a narrow screen", async () => {
    window.innerWidth = 500;
    mount();
    const dialog = await openMenu();
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(within(dialog).getByRole("option", { name: "Posts" })).toBeTruthy();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
  });

  it("opens in a dialog on a wide screen", async () => {
    mount();
    const dialog = await openMenu();
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
  });
});

describe("useRegisterCommand", () => {
  it("adds a command on mount and removes it on unmount", async () => {
    mount({ menuChildren: <Registered label="Do it" /> });
    await openMenu();
    expect(screen.getByRole("option", { name: "Do it" })).toBeTruthy();

    act(() => ctrl.set({ show: false }));
    expect(screen.queryByRole("option", { name: "Do it" })).toBeNull();
  });

  it("runs the latest onSelect without registering again", async () => {
    const first = vi.fn();
    const second = vi.fn();
    mount({ menuChildren: <Registered label="Do it" onSelect={first} /> });
    await openMenu();
    act(() => ctrl.set({ onSelect: second }));

    fireEvent.click(screen.getByRole("option", { name: "Do it" }));
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
  });

  it("registers again when the label changes", async () => {
    mount({ menuChildren: <Registered label="Do it" /> });
    await openMenu();
    act(() => ctrl.set({ label: "Do that" }));
    expect(screen.getByRole("option", { name: "Do that" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Do it" })).toBeNull();
  });
});

describe("useCommandMenu", () => {
  it("throws outside a CommandMenu", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCommandMenu())).toThrow(/<CommandMenu>/);
    vi.restoreAllMocks();
  });
});
