// @vitest-environment node

/**
 * The `/rsc` pages as Next serves them: each page function is awaited and its
 * element tree rendered with `renderToStaticMarkup`, which is the markup a
 * request gets. Next's app router context is internal, so `next/navigation` and
 * `next/link` are mocked with a small in-memory router, as in
 * `next-demo.test.tsx`; `notFound` stays the real one, so the show page answers
 * an unknown id with the very error Next turns into its 404.
 *
 * The pages render under `RscRouter`, the adapter `app/rsc/layout.tsx` puts
 * above them, because the filter bar and the delete button navigate through it.
 */

import { seedData } from "@chelone/demo-data";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PostShowPage from "./app/rsc/posts/[id]/page";
import PostsPage from "./app/rsc/posts/page";
import type { SearchParams } from "./app/search-of";
import { deletePost } from "./rsc-actions";
import { RscRouter } from "./rsc-router";
import { serverDataProvider } from "./server-data";

const next = vi.hoisted(() => {
  const router = {
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  };
  return { router };
});

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => next.router,
  };
});

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  interface MockLinkProps {
    href: string;
    children?: ReactNode;
  }
  return {
    default: ({ href, children }: MockLinkProps) =>
      createElement("a", { href }, children),
  };
});

/** A seed row, or a failure naming what is missing, with no `!` at the call site. */
function seeded<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`the seed has no ${what}`);
  return row;
}

/** Next's `searchParams` object for a query string. */
function searchParamsOf(search: string): SearchParams {
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) params[key] = value;
  return params;
}

/** The `/rsc/posts` markup for a query string, under the segment's adapter. */
async function listMarkup(search = ""): Promise<string> {
  const page = await PostsPage({
    searchParams: Promise.resolve(searchParamsOf(search)),
  });
  return renderToStaticMarkup(<RscRouter>{page}</RscRouter>);
}

/** The text inside markup, with every tag and attribute dropped. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Each body row's cell texts, in table order. */
function cellsOf(markup: string): string[][] {
  const body = markup.slice(markup.indexOf("<tbody"));
  const rows: string[][] = [];
  for (const row of body.split(/<tr[^>]*>/).slice(1)) {
    const cells: string[] = [];
    for (const cell of row.split(/<td[^>]*>/).slice(1)) {
      cells.push(textOf(cell.split("</td>")[0] ?? ""));
    }
    rows.push(cells);
  }
  return rows;
}

/** The `title` column of each body row. */
function titlesOf(markup: string): string[] {
  const titles: string[] = [];
  for (const row of cellsOf(markup)) {
    const title = row[1];
    if (title !== undefined) titles.push(title);
  }
  return titles;
}

/** Every `href` in the markup, with the `&amp;` a query string's `&` becomes decoded. */
function hrefsOf(markup: string): string[] {
  const hrefs: string[] = [];
  for (const match of markup.matchAll(/href="([^"]*)"/g)) {
    const href = match[1];
    if (href !== undefined) hrefs.push(href.replaceAll("&amp;", "&"));
  }
  return hrefs;
}

/** The error `notFound()` throws, which Next renders as its not-found page. */
function notFoundError(): Error {
  try {
    notFound();
  } catch (caught) {
    if (caught instanceof Error) return caught;
    throw new Error(`notFound() threw a non-error: ${String(caught)}`);
  }
  throw new Error("notFound() did not throw");
}

/** The Error a page function rejects with, or a failure naming that it did not. */
async function rejectionOf<Rendered>(
  page: () => Promise<Rendered>,
): Promise<Error> {
  try {
    await page();
  } catch (caught) {
    if (caught instanceof Error) return caught;
    throw new Error(`the page rejected with a non-error: ${String(caught)}`);
  }
  throw new Error("the page resolved, but it must reject");
}

describe("the Next server list", () => {
  it("renders the seeded first page, with a link per sort", async () => {
    const markup = await listMarkup();
    const seededPosts = seedData().posts;

    expect(titlesOf(markup)).toEqual(
      seededPosts.slice(0, 10).map((post) => post.title),
    );
    const secondPage = seeded(seededPosts[10], "post");
    expect(markup).not.toContain(secondPage.title);
    // The `id` header holds the page's sort, so its link flips it; an unsorted
    // column's link sorts it ascending.
    expect(hrefsOf(markup)).toEqual(
      expect.arrayContaining([
        "/rsc/posts?sort=id&order=DESC&page=1&perPage=10",
        "/rsc/posts?sort=title&order=ASC&page=1&perPage=10",
        "/rsc/posts?sort=views&order=ASC&page=1&perPage=10",
        "/rsc/posts?sort=id&order=ASC&page=2&perPage=10",
      ]),
    );
  });

  it("orders the rows by a sort in the search params", async () => {
    const markup = await listMarkup("sort=title&order=ASC");
    const { data } = await serverDataProvider.getList("posts", {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "title", order: "ASC" },
    });

    expect(titlesOf(markup)).toEqual(data.map((post) => post.title));
    expect(markup).toContain('aria-sort="ascending"');
    expect(hrefsOf(markup)).toContain(
      "/rsc/posts?sort=title&order=DESC&page=1&perPage=10",
    );
  });

  it("deletePost removes the row from the next server render", async () => {
    const seededPosts = seedData().posts;
    const gone = seeded(seededPosts[0], "post");
    const promoted = seeded(seededPosts[10], "post");

    expect(titlesOf(await listMarkup())).toContain(gone.title);

    await deletePost(gone.id);

    const titles = titlesOf(await listMarkup());
    expect(titles).not.toContain(gone.title);
    expect(titles).toContain(promoted.title);
  });
});

describe("the Next server show", () => {
  it("renders the post's title and fields", async () => {
    const post = seeded(
      seedData().posts.find((candidate) => candidate.status === "published"),
      "published post",
    );
    const markup = renderToStaticMarkup(
      <RscRouter>
        {
          await PostShowPage({
            params: Promise.resolve({ id: String(post.id) }),
          })
        }
      </RscRouter>,
    );

    expect(markup).toContain(post.title);
    expect(markup).toContain(String(post.views));
    expect(markup).toContain(post.status);
    expect(markup).toContain("post.title");
    expect(markup).toContain("post.views");
    expect(markup).toContain("post.status");
    expect(hrefsOf(markup)).toContain(`/admin/posts/${post.id}`);
  });

  it("answers an unknown id with notFound", async () => {
    const error = await rejectionOf(() =>
      PostShowPage({ params: Promise.resolve({ id: "999999" }) }),
    );

    expect(error.message).toBe(notFoundError().message);
  });
});
