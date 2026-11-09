/**
 * `nextRouterAdapter` joins a Next.js App Router app's own router. Next's app
 * router context is internal, so `next/navigation` and `next/link` are mocked
 * here with a small in-memory router that mounts the admin at
 * `app/admin/[[...slug]]`, and the tests read what the adapter asks of it.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Admin } from "../admin/admin";
import { TextInput } from "../components/admin/inputs/text-input";
import { Menu } from "../components/admin/layout/menu";
import { DataTable } from "../components/admin/list/data-table";
import { ListPagination } from "../components/admin/list/list-pagination";
import { Edit } from "../components/admin/views/edit";
import { List } from "../components/admin/views/list";
import { useWarnWhenUnsavedChanges } from "../form/warn-unsaved-changes";
import { Resource } from "../resource/resource";
import { useRouterAdapter } from "./adapter";
import {
  useBlocker,
  useCanBlock,
  useLocation,
  useNavigate,
  useParams,
  useRevalidate,
} from "./nav-hooks";
import { NextOutletProvider, nextRouterAdapter } from "./next-router-adapter";

const next = vi.hoisted(() => {
  /** The admin's app route: `app/admin/[[...slug]]/page.tsx`. */
  const mount = "/admin";

  interface Entry {
    pathname: string;
    searchParams: URLSearchParams;
    params: Record<string, string | string[] | undefined>;
  }

  function entryOf(href: string): Entry {
    const url = new URL(href, "http://localhost");
    const rest = url.pathname.startsWith(`${mount}/`)
      ? url.pathname.slice(mount.length + 1)
      : "";
    return {
      pathname: url.pathname,
      searchParams: url.searchParams,
      params: rest === "" ? {} : { slug: rest.split("/") },
    };
  }

  const listeners = new Set<() => void>();
  let current = entryOf("/");

  function go(href: string) {
    current = entryOf(href);
    for (const listener of listeners) listener();
  }

  const router = {
    push: vi.fn((href: string) => go(href)),
    replace: vi.fn((href: string) => go(href)),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };

  return {
    router,
    reset(href: string) {
      current = entryOf(href);
      for (const fn of Object.values(router)) fn.mockClear();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => current,
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const useEntry = () => useSyncExternalStore(next.subscribe, next.snapshot);
  return {
    usePathname: () => useEntry().pathname,
    useSearchParams: () => useEntry().searchParams,
    useParams: () => useEntry().params,
    useRouter: () => next.router,
  };
});

vi.mock("next/link", async () => {
  const { createElement, forwardRef } = await import("react");
  interface MockLinkProps
    extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    href: string;
    replace?: boolean;
  }
  const Link = forwardRef<HTMLAnchorElement, MockLinkProps>(
    ({ href, replace, onClick, ...rest }, ref) =>
      createElement("a", {
        ...rest,
        ref,
        href,
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          if (replace) next.router.replace(href);
          else next.router.push(href);
        },
      }),
  );
  return { default: Link };
});

beforeEach(() => {
  next.reset("/admin/posts");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function posts(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Post ${index + 1}`,
  }));
}

function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider>
      <nav>
        <Menu />
      </nav>
      <main data-testid="layout">{children}</main>
    </SidebarProvider>
  );
}

/** The app's `app/admin/layout.tsx`, with `page` as the layout's `children`. */
function renderLayout(page: ReactNode, rows = posts(3)) {
  return render(
    <NextOutletProvider outlet={page}>
      <Admin
        router={nextRouterAdapter}
        routes={false}
        basename="/admin"
        dataProvider={fakeDataProvider({ posts: rows })}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Resource name="posts" list={() => null} edit={() => null} />
        <Admin.Layout>
          <AppLayout />
        </Admin.Layout>
      </Admin>
    </NextOutletProvider>,
  );
}

const PostList = (
  <List resource="posts">
    <DataTable>
      <DataTable.Col source="title" />
    </DataTable>
    <ListPagination />
  </List>
);

describe("nextRouterAdapter under <Admin routes={false}>", () => {
  it("the outlet shows the page Next hands the layout", async () => {
    renderLayout(PostList);

    const layout = await screen.findByTestId("layout");
    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(layout.contains(screen.getByText("Post 3"))).toBe(true);
  });
});

describe("nextRouterAdapter drives Next's router", () => {
  it("a page change pushes the list state into the URL", async () => {
    renderLayout(PostList, posts(15));
    await screen.findByText("Post 1");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(next.router.replace).toHaveBeenCalled());
    const [href] = next.router.replace.mock.calls.at(-1) ?? [""];
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/admin/posts");
    expect(url.searchParams.get("page")).toBe("2");
    expect(await screen.findByText("Post 11")).toBeTruthy();
  });

  it("useLocation reads Next's pathname and search", async () => {
    next.reset("/admin/posts?page=2&perPage=5");
    function Probe() {
      const { pathname, search, searchParams, state } = useLocation();
      return (
        <output data-testid="location">
          {JSON.stringify({
            pathname,
            search,
            perPage: searchParams.get("perPage"),
            state,
          })}
        </output>
      );
    }
    renderLayout(<Probe />);

    expect(
      JSON.parse((await screen.findByTestId("location")).textContent),
    ).toEqual({
      pathname: "/admin/posts",
      search: "?page=2&perPage=5",
      perPage: "5",
      state: null,
    });
  });

  it("a catch-all segment is the '*' param", async () => {
    next.reset("/admin/posts/7");
    function Probe() {
      return <output data-testid="splat">{useParams()["*"]}</output>;
    }
    renderLayout(<Probe />);

    expect((await screen.findByTestId("splat")).textContent).toBe("posts/7");
  });

  it("a menu link is an anchor to the resource", async () => {
    function ReplaceLink() {
      const { Link } = useRouterAdapter();
      return (
        <Link to="/admin/posts/create" replace>
          New post
        </Link>
      );
    }
    renderLayout(<ReplaceLink />);

    const menuLink = await screen.findByRole("link", { name: /posts/i });
    expect(menuLink.getAttribute("href")).toBe("/admin/posts");

    fireEvent.click(screen.getByRole("link", { name: "New post" }));
    expect(next.router.replace).toHaveBeenCalledWith("/admin/posts/create");
    expect(next.router.push).not.toHaveBeenCalled();
  });

  it("a numeric navigate moves through the browser history", async () => {
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
    function Back() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate(-1)}>
          Back
        </button>
      );
    }
    renderLayout(<Back />);

    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(go).toHaveBeenCalledWith(-1);
  });

  it("nothing blocks", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    next.reset("/admin/posts/1");
    const seen: { canBlock?: boolean; blocker?: string } = {};
    function Warn() {
      useWarnWhenUnsavedChanges(true);
      seen.canBlock = useCanBlock();
      seen.blocker = useBlocker(true).state;
      return null;
    }
    renderLayout(
      <Edit resource="posts" id={1}>
        <TextInput source="title" />
        <Warn />
      </Edit>,
    );

    const title = await screen.findByDisplayValue("Post 1");
    fireEvent.change(title, { target: { value: "Edited" } });
    expect(seen).toEqual({ canBlock: false, blocker: "unblocked" });

    fireEvent.click(screen.getByRole("link", { name: /posts/i }));
    expect(next.router.push).toHaveBeenCalledWith("/admin/posts");
  });

  it("useRevalidate refreshes the route", async () => {
    function Refresh() {
      const revalidate = useRevalidate();
      return (
        <button type="button" onClick={revalidate}>
          Refresh
        </button>
      );
    }
    renderLayout(<Refresh />);

    fireEvent.click(await screen.findByRole("button", { name: "Refresh" }));
    expect(next.router.refresh).toHaveBeenCalledTimes(1);
  });
});
