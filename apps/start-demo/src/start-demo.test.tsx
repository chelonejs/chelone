/**
 * The end-to-end proof for the three pieces the Start path rests on: the host
 * adapter (`router={tanstackHostRouterAdapter}`), the route-less admin
 * (`routes={false}`) and the loader prefetch (`listFetchParams` matching what
 * the list controller fetches with).
 *
 * Each test builds a real router from the generated route tree, moves it to a
 * path the way Start does — replace the history, then `load()` — and asserts
 * against the seeded rows.
 */

import { listFetchParams } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

afterEach(cleanup);

/** A router sitting at `path`, the way Start puts one there per request. */
function routerAt(path: string) {
  const router = getRouter();
  router.update({
    ...router.options,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return router;
}

/** A seed row, or a failure naming what is missing — no `!` at the call site. */
function seeded<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`the seed has no ${what}`);
  return row;
}

describe("the Start demo", () => {
  it("each getRouter call gets its own QueryClient and dataProvider", async () => {
    const first = getRouter().options.context;
    const second = getRouter().options.context;
    expect(first.queryClient).not.toBe(second.queryClient);
    expect(first.dataProvider).not.toBe(second.dataProvider);

    const title = seeded(seedData().posts[0], "post").title;
    await first.dataProvider.update("posts", {
      id: 1,
      data: {
        ...seeded(seedData().posts[0], "post"),
        title: "Renamed by the first router",
      },
    });
    const { data } = await second.dataProvider.getOne("posts", { id: 1 });
    expect(data.title).toBe(title);
  });

  it("the posts loader fills the query the list reads", async () => {
    const router = routerAt("/admin/posts");
    const context = router.options.context;
    const getList = vi.spyOn(context.dataProvider, "getList");

    await router.load();
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenCalledWith(
      "posts",
      listFetchParams(context, "posts", {}, ""),
    );

    render(<RouterProvider router={router} />);
    const title = seeded(seedData().posts[0], "post").title;
    expect(await screen.findByText(title)).toBeTruthy();
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("the edit loader fills the record", async () => {
    const router = routerAt("/admin/posts/1");
    const getOne = vi.spyOn(router.options.context.dataProvider, "getOne");

    await router.load();
    render(<RouterProvider router={router} />);

    const title = seeded(seedData().posts[0], "post").title;
    expect(await screen.findByDisplayValue(title)).toBeTruthy();
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it("a server render holds the list rows", async () => {
    const router = routerAt("/admin/comments");
    await router.load();
    const html = renderToString(<RouterProvider router={router} />);
    expect(html).toContain(seeded(seedData().comments[0], "comment").body);
  });
});
