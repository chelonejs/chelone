/**
 * The end-to-end proof for the three pieces the Start path rests on: the host
 * adapter (`router={tanstackHostRouterAdapter}`), the route-less admin
 * (`routes={false}`) and the loader prefetch (`listFetchParams` matching what
 * the list controller fetches with).
 *
 * Each test builds a real router from the generated route tree, moves it to a
 * path the way Start does — replace the history, then `load()` — and asserts
 * against the seeded rows. The session comes from a gateway in a variable, so
 * the suite drives a sign-in and a sign-out with no server and no cookie.
 */

import { listFetchParams } from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type DemoSession,
  makeSessionAuthProvider,
  memorySessionGateway,
  parseSessionCookie,
  type SessionGateway,
} from "./auth";
import { getRouter } from "./router";

afterEach(cleanup);

/** The router type `getRouter()` builds, for a helper that returns it. */
type StartDemoRouter = Awaited<ReturnType<typeof getRouter>>;

/** A router sitting at `path`, the way Start puts one there per request. */
async function routerAt(path: string, gateway: SessionGateway) {
  const router = await getRouter({ sessionGateway: gateway });
  router.update({
    ...router.options,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return router;
}

const signedOut = (): SessionGateway => memorySessionGateway();

/** A session whose token is a value the leak test can search the page for. */
const signedIn = (): SessionGateway =>
  memorySessionGateway({
    token: "session-token-7f3c",
    user: "demo@example.com",
  });

/** A seed row, or a failure naming what is missing — no `!` at the call site. */
function seeded<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`the seed has no ${what}`);
  return row;
}

/** A session, or a failure naming what is missing. */
function session(row: DemoSession | undefined): DemoSession {
  if (row === undefined) throw new Error("no session was written");
  return row;
}

/** Sign in through the form on the page, as a visitor does. */
async function signInWithForm(email: string) {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "hunter2" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

/** Where the admin shell says the page rendered. */
async function renderedAdmin() {
  return screen.findByTestId("start-demo-layout");
}

function hrefOf(router: StartDemoRouter) {
  return router.state.location.href;
}

describe("the Start demo", () => {
  it("each getRouter call gets its own QueryClient and dataProvider", async () => {
    const first = (await getRouter({ sessionGateway: signedIn() })).options
      .context;
    const second = (await getRouter({ sessionGateway: signedIn() })).options
      .context;
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
    const router = await routerAt("/admin/posts", signedIn());
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
    const router = await routerAt("/admin/posts/1", signedIn());
    const getOne = vi.spyOn(router.options.context.dataProvider, "getOne");

    await router.load();
    render(<RouterProvider router={router} />);

    const title = seeded(seedData().posts[0], "post").title;
    expect(await screen.findByDisplayValue(title)).toBeTruthy();
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it("a server render holds the list rows", async () => {
    const router = await routerAt("/admin/comments", signedIn());
    await router.load();
    const html = renderToString(<RouterProvider router={router} />);
    expect(html).toContain(seeded(seedData().comments[0], "comment").body);
  });

  it("a server render holds the rows of a URL with a query string", async () => {
    // 12 seeded posts at 10 per page: page 2 holds only the last two titles.
    const router = await routerAt("/admin/posts?page=2", signedIn());
    await router.load();
    const html = renderToString(<RouterProvider router={router} />);
    expect(html).toContain(seeded(seedData().posts[10], "post").title);
    expect(html).not.toContain(seeded(seedData().posts[4], "post").title);
  });

  it("a client move to a paged URL shows that page's rows", async () => {
    const router = await routerAt("/admin/posts", signedIn());
    await router.load();
    render(<RouterProvider router={router} />);
    const firstPage = seeded(seedData().posts[0], "post").title;
    expect(await screen.findByText(firstPage)).toBeTruthy();

    router.history.push("/admin/posts?page=2");

    const secondPage = seeded(seedData().posts[10], "post").title;
    expect(await screen.findByText(secondPage)).toBeTruthy();
    expect(
      screen.queryByText(seeded(seedData().posts[4], "post").title),
    ).toBeNull();
  });
});

describe("the Start demo's auth", () => {
  it("a logged-out visit lands on login before the page loads", async () => {
    const router = await routerAt("/admin/posts", signedOut());
    const getList = vi.spyOn(router.options.context.dataProvider, "getList");

    await router.load();

    expect(hrefOf(router)).toBe("/login?redirect=%2Fadmin%2Fposts");
    expect(getList).not.toHaveBeenCalled();
  });

  it("a sign-in returns to the entered page", async () => {
    const router = await routerAt(
      "/login?redirect=%2Fadmin%2Fposts",
      signedOut(),
    );
    await router.load();
    render(<RouterProvider router={router} />);

    await signInWithForm("demo@example.com");

    expect(await renderedAdmin()).toBeTruthy();
    expect(router.state.location.pathname).toBe("/admin/posts");
  });

  it("a sign-in never follows an off-site redirect", async () => {
    const router = await routerAt(
      "/login?redirect=%2F%2Fevil.example",
      signedOut(),
    );
    await router.load();
    render(<RouterProvider router={router} />);

    await signInWithForm("demo@example.com");

    expect(await renderedAdmin()).toBeTruthy();
    expect(router.state.location.pathname).toBe("/admin/posts");
    expect(hrefOf(router)).not.toContain("evil.example");
  });

  it("the session value never reaches the URL or the HTML", async () => {
    const gateway = signedOut();
    const router = await routerAt("/login?redirect=%2Fadmin%2Fposts", gateway);
    await router.load();
    render(<RouterProvider router={router} />);

    await signInWithForm("demo@example.com");
    await renderedAdmin();

    const token = session(await gateway.read()).token;
    expect(hrefOf(router)).not.toContain(token);

    // The same session, read the way a server request reads it.
    const server: StartDemoRouter = await routerAt(
      "/admin/posts",
      memorySessionGateway(session(await gateway.read())),
    );
    await server.load();
    const html = renderToString(<RouterProvider router={server} />);
    expect(html).not.toContain(token);
    expect(html).toContain(seeded(seedData().posts[0], "post").title);
  });

  it("a hand-written cookie is a name, never something that runs", () => {
    const hostile = parseSessionCookie("token-1.<iframe src=evil></iframe>");
    expect(hostile).toEqual({
      token: "token-1",
      user: "<iframe src=evil></iframe>",
    });
    // A stray `%` is a name too: decoding it is not allowed to throw.
    expect(parseSessionCookie("token-1.%zz")?.user).toBe("%zz");
    expect(parseSessionCookie("")).toBeUndefined();
    expect(parseSessionCookie(".no-token")).toBeUndefined();
  });

  it("a failed cookie write signs nobody in and the next one still writes", async () => {
    const inner = memorySessionGateway();
    let failing = true;
    const written: (DemoSession | undefined)[] = [];
    const gateway: SessionGateway = {
      read: inner.read,
      write: async (next) => {
        if (failing) throw new Error("connection dropped");
        written.push(next);
        await inner.write(next);
      },
    };
    const auth = await makeSessionAuthProvider(new QueryClient(), gateway);

    await expect(auth.login({ email: "a@example.com" })).rejects.toThrow(
      "connection dropped",
    );
    await expect(auth.checkAuth({})).rejects.toThrow();

    failing = false;
    await auth.login({ email: "a@example.com" });
    await expect(auth.checkAuth({})).resolves.toBeUndefined();
    expect(session(written.at(-1)).user).toBe("a@example.com");
    expect(session(await inner.read()).user).toBe("a@example.com");
  });
});
