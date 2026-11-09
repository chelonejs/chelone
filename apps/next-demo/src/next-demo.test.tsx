/**
 * The end-to-end proof for the Next path: the server prefetch
 * (`prefetchList` / `prefetchOne`), the client shell (`<AdminShell>` over
 * `nextRouterAdapter`) and the page views read the same query, so the first
 * paint costs no browser fetch.
 *
 * Next's app router context is internal, so `next/navigation` and `next/link`
 * are mocked with a small in-memory router, as in `@chelone/react`'s
 * `next-router-adapter.test.tsx`. Each test renders what Next would: the
 * layout's shell around the page's `<Prefetched>`.
 */

import { fakeDataProvider } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import { AdminShell } from "./admin-shell";
import { Prefetched } from "./prefetched";
import type { NextDemoResources } from "./resources";
import { prefetchList, prefetchOne } from "./server-context";
import { CommentList, PostEdit, PostList } from "./views";

const next = vi.hoisted(() => {
  const mount = "/admin";

  interface Entry {
    pathname: string;
    searchParams: URLSearchParams;
    params: Record<string, string | string[] | undefined>;
  }

  function entryOf(href: string): Entry {
    const url = new URL(href, "http://localhost");
    const rest = url.pathname.startsWith(`${mount}/`)
      ? url.pathname.slice(mount.length + 1).split("/")
      : [];
    return {
      pathname: url.pathname,
      searchParams: url.searchParams,
      params: rest[1] === undefined ? {} : { id: rest[1] },
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
    reset(href: string) {
      current = entryOf(href);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => current,
    router,
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
    ({ href, replace: _replace, ...rest }, ref) =>
      createElement("a", { ...rest, ref, href }),
  );
  return { default: Link };
});

beforeEach(() => {
  next.reset("/admin/posts");
});

afterEach(cleanup);

/** A seed row, or a failure naming what is missing, with no `!` at the call site. */
function seeded<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`the seed has no ${what}`);
  return row;
}

/** The browser's provider, seeded like the server's, with `getList`/`getOne` watched. */
function browserProvider() {
  const dataProvider = fakeDataProvider<NextDemoResources>(seedData());
  return {
    getList: vi.spyOn(dataProvider, "getList"),
    getOne: vi.spyOn(dataProvider, "getOne"),
    dataProvider,
  };
}

describe("the Next demo", () => {
  it("the posts prefetch is what the list reads", async () => {
    const { dataProvider, getList } = browserProvider();
    const state = await prefetchList("posts", "");

    render(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={state}>
          <PostList />
        </Prefetched>
      </AdminShell>,
    );

    const titles = seedData()
      .posts.slice(0, 10)
      .map((post) => post.title);
    for (const title of titles) {
      expect(await screen.findByText(title)).toBeTruthy();
    }
    expect(screen.queryByText(seeded(seedData().posts[10], "post").title)).toBe(
      null,
    );
    expect(getList).not.toHaveBeenCalled();
  });

  it("a sort in the URL reaches the prefetch", async () => {
    next.reset("/admin/posts?sort=title&order=ASC");
    const { dataProvider, getList } = browserProvider();
    const state = await prefetchList("posts", "sort=title&order=ASC");

    render(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={state}>
          <PostList />
        </Prefetched>
      </AdminShell>,
    );

    await screen.findByText("A Note on Recursion");
    const firstRow = screen.getAllByRole("row")[1];
    expect(firstRow?.textContent).toContain("A Note on Recursion");
    expect(getList).not.toHaveBeenCalled();
  });

  it("the edit page reads its prefetched post", async () => {
    next.reset("/admin/posts/1");
    const { dataProvider, getOne } = browserProvider();
    const state = await prefetchOne("posts", 1);

    render(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={state}>
          <PostEdit id="1" />
        </Prefetched>
      </AdminShell>,
    );

    const title = seeded(seedData().posts[0], "post").title;
    expect(await screen.findByDisplayValue(title)).toBeTruthy();
    expect(getOne).not.toHaveBeenCalled();
  });

  it("the comments prefetch is what the comments list reads", async () => {
    next.reset("/admin/comments");
    const { dataProvider, getList } = browserProvider();
    const state = await prefetchList("comments", "");

    render(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={state}>
          <CommentList />
        </Prefetched>
      </AdminShell>,
    );

    const body = seeded(seedData().comments[0], "comment").body;
    expect((await screen.findAllByText(body)).length).toBeGreaterThan(0);
    expect(getList).not.toHaveBeenCalled();
  });

  it("a saved title survives the next page's stale prefetch", async () => {
    next.reset("/admin/posts/1");
    const { dataProvider } = browserProvider();
    const stale = await prefetchOne("posts", 1);
    const title = seeded(seedData().posts[0], "post").title;

    const { rerender } = render(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={stale}>
          <PostEdit id="1" />
        </Prefetched>
      </AdminShell>,
    );
    fireEvent.change(await screen.findByDisplayValue(title), {
      target: { value: "Renamed in the browser" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(next.router.push).toHaveBeenCalled());

    // The server renders the list from its unchanged seed, after the save.
    next.reset("/admin/posts");
    const staleList = await prefetchList("posts", "");
    rerender(
      <AdminShell session={{ user: "Ada" }} dataProvider={dataProvider}>
        <Prefetched state={staleList}>
          <PostList />
        </Prefetched>
      </AdminShell>,
    );

    expect(await screen.findByText("Renamed in the browser")).toBeTruthy();
    expect(screen.queryByText(title)).toBe(null);
  });

  it("the bare paths redirect", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/",
          destination: "/admin/posts",
        }),
        expect.objectContaining({
          source: "/admin",
          destination: "/admin/posts",
        }),
      ]),
    );
    for (const redirect of redirects ?? []) {
      expect(redirect.destination).toBe("/admin/posts");
    }
  });
});
