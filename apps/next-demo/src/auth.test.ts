/**
 * The Next demo's sign-in, proven from the outside: `proxy` is what Next runs
 * before any `/admin` page or prefetch, so a logged-out visit never reaches a
 * page that would read the data provider. The session cookie is the only state.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeSession } from "./auth";
import { LoginForm } from "./login-form";
import { proxy } from "./proxy";

const server = vi.hoisted(() => ({ getList: vi.fn() }));
const jar = vi.hoisted(() => ({
  set: vi.fn(
    (_name: string, _value: string, _options: { httpOnly?: boolean }) => {},
  ),
  delete: vi.fn((_name: string) => {}),
}));
const browser = vi.hoisted(() => ({
  replace: vi.fn(),
  signIn: vi.fn(async (_email: string) => {}),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  useRouter: () => ({
    replace: browser.replace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/headers", () => ({ cookies: async () => jar }));

vi.mock("./session-actions", () => ({
  signIn: browser.signIn,
  signOut: vi.fn(async () => {}),
}));

// jsdom has no `matchMedia`, which the login page's toaster reads.
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("./server-context", () => ({
  serverContext: () => ({ dataProvider: { getList: server.getList } }),
}));

const signedIn = `next-demo-session=${encodeSession({ user: "ada@example.com" })}`;

function visit(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3100"), {
    headers: cookie === undefined ? {} : { cookie },
  });
}

describe("a logged-out visit", () => {
  it("redirects to login before the page loads", async () => {
    const response = await proxy(visit("/admin/posts"));

    const location = new URL(response.headers.get("location") ?? "");
    expect(response.status).toBe(307);
    expect(location.pathname + location.search).toBe(
      "/login?redirect=%2Fadmin%2Fposts",
    );
    expect(server.getList).not.toHaveBeenCalled();
  });
});

describe("a signed-in visit", () => {
  it("passes through", async () => {
    const response = await proxy(visit("/admin/posts", signedIn));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("a token left in the URL", () => {
  it("is not copied into the redirect", async () => {
    const response = await proxy(visit("/admin/posts?access_token=leak"));

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.searchParams.get("redirect")).toBe("/admin/posts");
    expect(location.toString()).not.toContain("access_token");
    expect(location.toString()).not.toContain("leak");
  });
});

/** Fills the rendered login form with any email and password and submits it. */
async function signInWith(redirect: string | undefined) {
  render(createElement(LoginForm, { redirect }));
  fireEvent.change(await screen.findByLabelText(/email/i), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "anything" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("a sign-in", () => {
  it("goes on to the page that sent the visitor to login", async () => {
    await signInWith("/admin/posts?page=2");

    await waitFor(() =>
      expect(browser.replace).toHaveBeenCalledWith("/admin/posts?page=2"),
    );
    expect(browser.signIn).toHaveBeenCalledWith("ada@example.com");
  });

  it("never follows an off-site redirect", async () => {
    await signInWith("//evil.example");

    await waitFor(() => expect(browser.replace).toHaveBeenCalledWith("/"));
    expect(browser.replace).toHaveBeenCalledTimes(1);
  });
});

describe("the session value", () => {
  it("never reaches the URL or the HTML", async () => {
    const actions =
      await vi.importActual<typeof import("./session-actions")>(
        "./session-actions",
      );
    await actions.signIn("ada@example.com");
    const [name, value, options] = jar.set.mock.calls[0] ?? [];
    if (name === undefined || value === undefined) {
      throw new Error("signIn set no cookie");
    }

    expect(options?.httpOnly).toBe(true);
    const redirected = await proxy(visit("/admin/posts?page=2"));
    expect(redirected.headers.get("location")).not.toContain(value);
    expect(renderToString(createElement(LoginForm, {}))).not.toContain(value);
    // The cookie is what signs the next visit in.
    const signedInVisit = await proxy(
      visit("/admin/posts", `${name}=${value}`),
    );
    expect(signedInVisit.headers.get("x-middleware-next")).toBe("1");
  });

  it("is cleared by a sign-out", async () => {
    const actions =
      await vi.importActual<typeof import("./session-actions")>(
        "./session-actions",
      );
    await actions.signOut();

    expect(jar.delete).toHaveBeenCalledWith("next-demo-session");
  });

  it("is forged when it does not hold a session", async () => {
    const response = await proxy(
      visit("/admin/posts", "next-demo-session=not-a-session"),
    );

    expect(response.status).toBe(307);
  });
});
