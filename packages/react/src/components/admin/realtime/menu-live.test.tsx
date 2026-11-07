import {
  createI18n,
  createStore,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SidebarMenu,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { MenuLive, MenuLiveItemLink } from "./menu-live";

afterEach(cleanup);

function setup(initialPath = "/") {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    fakeDataProvider({ posts: [], comments: [] }),
    transport,
  );
  const subscribe = vi.spyOn(transport, "subscribe");
  const store = createStore();
  const queryClient = new QueryClient();
  const i18n = createI18n({ locale: "en", messages: { en: {} } });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
      store={store}
    >
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </RouterAdapterProvider>
    </CheloneProvider>
  );
  const emit = (topic: string, type = "created") =>
    act(async () => {
      await dataProvider.publish(topic, { type, payload: {} });
    });
  return { Providers, store, subscribe, emit };
}

const badge = () => screen.queryByTestId("menu-live-badge");

describe("<MenuLiveItemLink>", () => {
  it("shows no badge before any event", async () => {
    const { Providers } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(badge()).toBeNull();
  });

  it("shows 1 after a created event on the resource topic", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("1");
  });

  it("counts only the listed event types", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink
          to="/posts"
          resource="posts"
          label="Posts"
          events={["deleted"]}
        />
      </Providers>,
    );
    await emit("resource/posts", "created");
    expect(badge()).toBeNull();
    await emit("resource/posts", "deleted");
    expect(badge()?.textContent).toBe("1");
  });

  it("shows 99+ above 99", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    for (let i = 0; i < 99; i++) await emit("resource/posts");
    expect(badge()?.textContent).toBe("99");
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("99+");
  });

  it("badgeLabel formats the count", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink
          to="/posts"
          resource="posts"
          label="Posts"
          badgeLabel={(count) => `${count} new`}
        />
      </Providers>,
    );
    await emit("resource/posts");
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("2 new");
  });

  it("clears the count while its route is active", async () => {
    const { Providers, emit } = setup("/other");
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("1");

    fireEvent.click(screen.getByRole("link", { name: /posts/i }));
    expect(badge()).toBeNull();

    await emit("resource/posts");
    expect(badge()).toBeNull();
  });

  it("keeps the count when only a prefix of the route matches", async () => {
    const { Providers, emit } = setup("/posts-archive");
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("1");
  });

  it("keeps the count in the store under realtime.unread.posts", async () => {
    const { Providers, store, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    await emit("resource/posts");
    expect(store.getItem("realtime.unread.posts")).toBe(1);
  });

  it("shows a count already in the store", async () => {
    const { Providers, store } = setup();
    store.setItem("realtime.unread.posts", 4);
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    expect(badge()?.textContent).toBe("4");
  });

  it("counts an event once when two links share a resource", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
        <MenuLiveItemLink to="/posts" resource="posts" label="Mobile posts" />
      </Providers>,
    );
    await emit("resource/posts");
    const badges = screen.getAllByTestId("menu-live-badge");
    expect(badges.map((b) => b.textContent)).toEqual(["1", "1"]);
  });

  it("keeps counting after one of two links unmounts", async () => {
    const { Providers, emit } = setup();
    const both = (
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
        <MenuLiveItemLink to="/posts" resource="posts" label="Mobile posts" />
      </Providers>
    );
    const { rerender } = render(both);
    rerender(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
      </Providers>,
    );
    await emit("resource/posts");
    expect(badge()?.textContent).toBe("1");
  });

  it("a deleted link beside a default link on the same resource counts only deleted events", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
        <MenuLiveItemLink
          to="/trash"
          resource="posts"
          label="Trash"
          events={["deleted"]}
        />
      </Providers>,
    );
    await emit("resource/posts", "created");
    await emit("resource/posts", "created");
    await emit("resource/posts", "deleted");

    const posts = screen.getByRole("link", { name: /posts/i });
    const trash = screen.getByRole("link", { name: /trash/i });
    expect(posts.textContent).toContain("2");
    expect(trash.textContent).toContain("1");
    expect(trash.textContent).not.toContain("3");
  });

  it("shares one subscription between links whose events differ only in order", async () => {
    const { Providers, subscribe, emit } = setup();
    render(
      <Providers>
        <MenuLiveItemLink
          to="/a"
          resource="posts"
          label="A"
          events={["deleted", "created"]}
        />
        <MenuLiveItemLink
          to="/b"
          resource="posts"
          label="B"
          events={["created", "deleted"]}
        />
      </Providers>,
    );
    await emit("resource/posts", "created");
    expect(
      screen.getAllByTestId("menu-live-badge").map((b) => b.textContent),
    ).toEqual(["1", "1"]);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("opening one link's route clears only that link's count", async () => {
    const { Providers, store, emit } = setup("/other");
    render(
      <Providers>
        <MenuLiveItemLink to="/posts" resource="posts" label="Posts" />
        <MenuLiveItemLink
          to="/trash"
          resource="posts"
          label="Trash"
          events={["deleted"]}
        />
      </Providers>,
    );
    await emit("resource/posts", "created");
    await emit("resource/posts", "deleted");

    fireEvent.click(screen.getByRole("link", { name: /trash/i }));

    expect(store.getItem("realtime.unread.posts")).toBe(1);
    expect(store.getItem("realtime.unread.posts.deleted")).toBe(0);
    expect(screen.getByRole("link", { name: /posts/i }).textContent).toContain(
      "1",
    );
  });

  it("an inline events array does not resubscribe", async () => {
    const { Providers, subscribe } = setup();
    const link = (
      <Providers>
        <MenuLiveItemLink
          to="/posts"
          resource="posts"
          label="Posts"
          events={["created", "deleted"]}
        />
      </Providers>
    );
    const { rerender } = render(link);
    const calls = subscribe.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    rerender(
      <Providers>
        <MenuLiveItemLink
          to="/posts"
          resource="posts"
          label="Posts"
          events={["created", "deleted"]}
        />
      </Providers>,
    );
    expect(subscribe.mock.calls.length).toBe(calls);
  });
});

describe("MenuLive", () => {
  it("MenuLive does not subscribe with a provider that is not realtime", () => {
    render(
      <CheloneProvider
        dataProvider={fakeDataProvider({ posts: [] })}
        queryClient={new QueryClient()}
        i18n={createI18n({ locale: "en", messages: { en: {} } })}
        store={createStore()}
      >
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <MenuLive
              items={[{ to: "/posts", resource: "posts", label: "Posts" }]}
            />
          </MemoryRouter>
        </RouterAdapterProvider>
      </CheloneProvider>,
    );

    expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
    expect(badge()).toBeNull();
  });
});

describe("<MenuLive>", () => {
  it("renders one link per item", async () => {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <MenuLive
          items={[
            { to: "/posts", resource: "posts", label: "Posts" },
            { to: "/comments", resource: "comments", label: "Comments" },
          ]}
        />
      </Providers>,
    );
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    await emit("resource/comments");
    expect(badge()?.textContent).toBe("1");
  });
});

describe("<MenuLive> in a sidebar", () => {
  const items = [{ to: "/posts", resource: "posts", label: "Posts" }];

  function renderInSidebar(defaultOpen: boolean) {
    const { Providers, emit } = setup();
    render(
      <Providers>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SidebarMenu>
            <MenuLive items={items} />
          </SidebarMenu>
        </SidebarProvider>
      </Providers>,
    );
    return { emit };
  }

  it("renders each item as a sidebar menu button", () => {
    renderInSidebar(true);
    const link = screen.getByRole("link", { name: /posts/i });
    expect(link.getAttribute("data-slot")).toBe("sidebar-menu-button");
    expect(link.closest("li")?.getAttribute("data-slot")).toBe(
      "sidebar-menu-item",
    );
  });

  it("shows no tooltip on an expanded sidebar", async () => {
    renderInSidebar(true);
    fireEvent.focus(screen.getByRole("link", { name: /posts/i }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the label as a tooltip on a collapsed sidebar, and keeps the badge", async () => {
    const { emit } = renderInSidebar(false);
    await emit("resource/posts");
    const link = screen.getByRole("link", { name: /posts/i });
    expect(badge()?.textContent).toBe("1");

    fireEvent.focus(link);
    expect((await screen.findByRole("tooltip")).textContent).toBe("Posts");
  });

  it("closes the mobile drawer when an entry is followed", () => {
    const { Providers } = setup();
    function Drawer() {
      const { openMobile, setOpenMobile } = useSidebar();
      return (
        <button type="button" onClick={() => setOpenMobile(true)}>
          {openMobile ? "drawer open" : "drawer closed"}
        </button>
      );
    }
    render(
      <Providers>
        <SidebarProvider>
          <Drawer />
          <SidebarMenu>
            <MenuLive items={items} />
          </SidebarMenu>
        </SidebarProvider>
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "drawer closed" }));
    expect(screen.getByRole("button", { name: "drawer open" })).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /posts/i }));

    expect(screen.getByRole("button", { name: "drawer closed" })).toBeTruthy();
  });
});

describe("<MenuLive> outside a sidebar", () => {
  it("renders a plain link, not a sidebar menu button", () => {
    const { Providers } = setup();
    render(
      <Providers>
        <MenuLive
          items={[{ to: "/posts", resource: "posts", label: "Posts" }]}
        />
      </Providers>,
    );
    const link = screen.getByRole("link", { name: /posts/i });
    expect(link.getAttribute("data-slot")).toBeNull();
    expect(screen.getByRole("navigation")).toBeTruthy();
  });
});
