// @vitest-environment node

import {
  createI18n,
  defineResources,
  fakeDataProvider,
  type GetListParams,
  type Identifier,
  loadServerListPage,
  type PageInfo,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ServerList } from "./server-list";

interface Post {
  id: number;
  title: string;
  views: number;
  author_id: number;
  editor_id: number;
}

interface User {
  id: number;
  name: string;
  handle: string;
}

interface Label {
  id: number;
  slug: string;
}

const users = new Map<Identifier, User>([
  [10, { id: 10, name: "Ada", handle: "@ada" }],
]);
const editors = new Map<Identifier, Label>([[20, { id: 20, slug: "news" }]]);

const posts: Post[] = [
  { id: 1, title: "Hello", views: 12, author_id: 10, editor_id: 20 },
  { id: 2, title: "World", views: 34, author_id: 11, editor_id: 20 },
];

/** A loaded page: the fixture rows on page 1, two per page, of six, unsorted. */
function fixturePage(
  overrides: {
    params?: GetListParams;
    data?: Post[];
    total?: number;
    pageInfo?: PageInfo;
  } = {},
) {
  return {
    params: overrides.params ?? {
      pagination: { page: 1, perPage: 2 },
      filter: {},
    },
    data: overrides.data ?? posts,
    total: "total" in overrides ? overrides.total : 6,
    pageInfo: overrides.pageInfo,
    references: { author_id: users, editor_id: editors },
  };
}

interface Tag {
  attrs: Record<string, string>;
  /** The inner markup. */
  html: string;
  /** The inner text, tags stripped. */
  text: string;
}

/**
 * Every `<name>` element in `markup`, outermost first. The node environment
 * has no DOM to parse with, and the markup is React's own, so attributes are
 * always double-quoted and no element nests inside one of its own name.
 */
function tags(markup: string, name: string): Tag[] {
  const pattern = new RegExp(`<${name}(\\s[^>]*)?>(.*?)</${name}>`, "gs");
  return [...markup.matchAll(pattern)].map(([, rawAttrs = "", html = ""]) => ({
    attrs: Object.fromEntries(
      [...rawAttrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(
        ([, key = "", value = ""]) => [key, value.replaceAll("&amp;", "&")],
      ),
    ),
    html,
    text: html.replace(/<[^>]+>/g, ""),
  }));
}

/** The text of each cell, row by row. */
function cellTexts(markup: string): string[][] {
  return tags(tags(markup, "tbody")[0]?.html ?? "", "tr").map((row) =>
    tags(row.html, "td").map((cell) => cell.text),
  );
}

describe("ServerList", () => {
  it("renders one row per record and one cell per column, the default cell printing the value", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage()}
        path="/posts"
        columns={[
          { source: "title", label: "Title" },
          { source: "views", label: "Views" },
        ]}
      />,
    );
    expect(cellTexts(markup)).toEqual([
      ["Hello", "12"],
      ["World", "34"],
    ]);
    expect(tags(markup, "th").map((th) => th.text)).toEqual(["Title", "Views"]);
  });

  it("links a sortable header to page 1 with that sort, toggling the order when it is already the sort", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage({
          params: {
            pagination: { page: 3, perPage: 2 },
            sort: { field: "views", order: "ASC" },
            filter: {},
          },
        })}
        path="/posts"
        columns={[
          { source: "title", label: "Title", sortable: true },
          { source: "views", label: "Views", sortable: true },
          { source: "id", label: "Id" },
        ]}
      />,
    );
    const [title, views, id] = tags(markup, "th");
    expect(tags(title?.html ?? "", "a")[0]?.attrs.href).toBe(
      "/posts?sort=title&order=ASC&page=1&perPage=2",
    );
    expect(tags(views?.html ?? "", "a")[0]?.attrs.href).toBe(
      "/posts?sort=views&order=DESC&page=1&perPage=2",
    );
    expect(tags(id?.html ?? "", "a")).toEqual([]);
    expect(title?.attrs["aria-sort"]).toBe("none");
    expect(views?.attrs["aria-sort"]).toBe("ascending");
    expect(id?.attrs["aria-sort"]).toBeUndefined();
  });

  it("marks a descending sort and sorts it ascending next", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage({
          params: {
            pagination: { page: 1, perPage: 2 },
            sort: [{ field: "title", order: "DESC" }],
          },
        })}
        path="/posts"
        columns={[{ source: "title", label: "Title", sortable: true }]}
      />,
    );
    const [title] = tags(markup, "th");
    expect(title?.attrs["aria-sort"]).toBe("descending");
    expect(tags(title?.html ?? "", "a")[0]?.attrs.href).toBe(
      "/posts?sort=title&order=ASC&page=1&perPage=2",
    );
  });

  describe("pagination", () => {
    const columns = [{ source: "title", label: "Title" }] as const;
    /** The previous and next links, by their English labels. */
    function pageLinks(markup: string) {
      const links = tags(tags(markup, "nav")[0]?.html ?? "", "a");
      return {
        previous: links.find((a) => a.text === "Go to previous page"),
        next: links.find((a) => a.text === "Go to next page"),
      };
    }

    it("disables previous on page 1, and keeps the sort, filter and perPage in next", () => {
      const markup = renderToStaticMarkup(
        <ServerList
          page={fixturePage({
            params: {
              pagination: { page: 1, perPage: 2 },
              sort: { field: "views", order: "DESC" },
              filter: { q: "he" },
            },
          })}
          path="/posts"
          columns={[...columns]}
        />,
      );
      const { previous, next } = pageLinks(markup);
      expect(previous?.attrs).toEqual({
        "aria-disabled": "true",
        class: expect.any(String),
      });
      expect(next?.attrs.href).toBe(
        `/posts?filter=${encodeURIComponent('{"q":"he"}')}&sort=views&order=DESC&page=2&perPage=2`,
      );
      expect(markup).toContain("1-2 of 6");
    });

    it("disables next on the last page by total, and keeps the params in previous", () => {
      const markup = renderToStaticMarkup(
        <ServerList
          page={fixturePage({
            params: {
              pagination: { page: 3, perPage: 2 },
              sort: { field: "title", order: "ASC" },
              filter: { views_gte: 10 },
            },
          })}
          path="/posts"
          columns={[...columns]}
        />,
      );
      const { previous, next } = pageLinks(markup);
      expect(next?.attrs.href).toBeUndefined();
      expect(next?.attrs["aria-disabled"]).toBe("true");
      expect(previous?.attrs.href).toBe(
        `/posts?filter=${encodeURIComponent('{"views_gte":10}')}&sort=title&order=ASC&page=2&perPage=2`,
      );
      expect(markup).toContain("5-6 of 6");
    });

    it("follows pageInfo.hasNextPage with no total", () => {
      const params = { pagination: { page: 2, perPage: 2 } };
      const last = renderToStaticMarkup(
        <ServerList
          page={fixturePage({
            params,
            total: undefined,
            pageInfo: { hasNextPage: false },
          })}
          path="/posts"
          columns={[...columns]}
        />,
      );
      expect(pageLinks(last).next?.attrs.href).toBeUndefined();
      expect(pageLinks(last).next?.attrs["aria-disabled"]).toBe("true");
      expect(pageLinks(last).previous?.attrs.href).toBe(
        "/posts?page=1&perPage=2",
      );

      const more = renderToStaticMarkup(
        <ServerList
          page={fixturePage({
            params,
            total: undefined,
            pageInfo: { hasNextPage: true },
          })}
          path="/posts"
          columns={[...columns]}
        />,
      );
      expect(pageLinks(more).next?.attrs.href).toBe("/posts?page=3&perPage=2");
    });

    it("keeps a multi-key sort on the next page", async () => {
      const resources = defineResources({
        posts: {
          schema: z.object({
            id: z.number(),
            title: z.string(),
            status: z.string(),
          }),
        },
      });
      const ctx = {
        dataProvider: fakeDataProvider<typeof resources>({
          posts: [1, 2, 3, 4].map((id) => ({
            id,
            title: `Post ${id}`,
            status: "draft",
          })),
        }),
        queryClient: new QueryClient(),
      };
      const options = {
        perPage: 2,
        sort: [
          { field: "status", order: "ASC" },
          { field: "id", order: "DESC" },
        ] as const,
      };
      const first = await loadServerListPage(ctx, "posts", {
        options: { ...options, sort: [...options.sort] },
        references: {},
      });
      const next = pageLinks(
        renderToStaticMarkup(
          <ServerList
            page={first}
            path="/posts"
            columns={[{ source: "title", label: "Title" }]}
          />,
        ),
      ).next?.attrs.href;
      expect(next).toBe("/posts?page=2&perPage=2");

      const second = await loadServerListPage(ctx, "posts", {
        options: { ...options, sort: [...options.sort] },
        search: new URL(next ?? "", "http://localhost").search,
        references: {},
      });
      expect(second.params.sort).toEqual(first.params.sort);
      expect(second.params.pagination).toEqual({ page: 2, perPage: 2 });
    });

    it("translates the labels through i18n", () => {
      const i18n = createI18n({
        locale: "fr",
        messages: {
          fr: {
            "chelone.navigation.next": "Suivant",
            "chelone.navigation.page_range_info":
              "{offsetBegin} à {offsetEnd} sur {total}",
          },
        },
      });
      const markup = renderToStaticMarkup(
        <ServerList
          page={fixturePage()}
          path="/posts"
          i18n={i18n}
          columns={[...columns]}
        />,
      );
      expect(markup).toContain(">Suivant</a>");
      expect(markup).toContain("1 à 2 sur 6");
      // A key the catalog misses falls back to English.
      expect(markup).toContain(">Go to previous page</a>");
    });
  });

  it("prints a reference column's representation path, else the default representation, else the raw id", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage()}
        path="/posts"
        columns={[
          {
            source: "author_id",
            label: "Author",
            reference: true,
            representation: "handle",
          },
          { source: "author_id", label: "Author name", reference: true },
          { source: "editor_id", label: "Editor", reference: true },
        ]}
      />,
    );
    expect(cellTexts(markup)).toEqual([
      ["@ada", "Ada", "#20"],
      // Post 2's author, 11, is not in the page's references.
      ["11", "11", "#20"],
    ]);
  });

  it("renders a cell function in place of the default cell", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage()}
        path="/posts"
        columns={[
          {
            source: "title",
            label: "Title",
            cell: (record) => <strong>{record.title.toUpperCase()}</strong>,
          },
        ]}
      />,
    );
    expect(cellTexts(markup)).toEqual([["HELLO"], ["WORLD"]]);
  });

  it("renders rowActions in a last cell of each row", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage()}
        path="/posts"
        columns={[{ source: "title", label: "Title" }]}
        rowActions={(record) => (
          <a href={`/posts/${record.id}`}>Edit {record.title}</a>
        )}
      />,
    );
    expect(cellTexts(markup)).toEqual([
      ["Hello", "Edit Hello"],
      ["World", "Edit World"],
    ]);
    expect(tags(markup, "th")).toHaveLength(2);
  });

  it("prints the no-results text for an empty page", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage({ data: [], total: 0 })}
        path="/posts"
        columns={[{ source: "title", label: "Title" }]}
      />,
    );
    expect(markup).toContain("No results found");
    expect(tags(markup, "table")).toEqual([]);
  });

  it("links a page past the end back to the last page with records", () => {
    const columns = [{ source: "title", label: "Title" }] as const;
    const byTotal = renderToStaticMarkup(
      <ServerList
        page={fixturePage({
          params: {
            pagination: { page: 99, perPage: 2 },
            sort: { field: "title", order: "ASC" },
          },
          data: [],
          total: 6,
        })}
        path="/posts"
        columns={[...columns]}
      />,
    );
    expect(byTotal).toContain("No results found");
    const links = tags(tags(byTotal, "nav")[0]?.html ?? "", "a");
    expect(links.map((a) => [a.text, a.attrs.href])).toEqual([
      ["Go to previous page", "/posts?sort=title&order=ASC&page=3&perPage=2"],
      ["Go to next page", undefined],
    ]);

    const byPageInfo = renderToStaticMarkup(
      <ServerList
        page={fixturePage({
          params: { pagination: { page: 5, perPage: 2 } },
          data: [],
          total: undefined,
          pageInfo: { hasNextPage: false },
        })}
        path="/posts"
        columns={[...columns]}
      />,
    );
    expect(
      tags(tags(byPageInfo, "nav")[0]?.html ?? "", "a")[0]?.attrs.href,
    ).toBe("/posts?page=4&perPage=2");
  });

  it("renders no script", () => {
    const markup = renderToStaticMarkup(
      <ServerList
        page={fixturePage()}
        path="/posts"
        columns={[{ source: "title", label: "Title", sortable: true }]}
        rowActions={() => <button type="button">Delete</button>}
      />,
    );
    expect(markup).not.toMatch(/<script/i);
  });
});
