import { matchPath } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import { BasenameKey } from "./adapter";
import {
  useCreatePath,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useRedirect,
  useRedirectOptional,
} from "./nav-composables";
import { provideVueRouterAdapter } from "./vue-router-adapter";

const Blank = defineComponent({ setup: () => () => h("div") });

const ROUTES: RouteRecordRaw[] = [
  { path: "/", component: Blank },
  { path: "/posts", component: Blank },
  { path: "/posts/create", component: Blank },
  { path: "/posts/:id", component: Blank },
  { path: "/posts/:id/show", component: Blank },
];

/**
 * Mount a component whose setup runs `consumer()` under a real vue-router + the
 * vue-router adapter, capturing the composable's return. `provideAdapter` and
 * `basename` toggle the router-optional and basename paths. Returns the router
 * (to assert navigation) and the captured value.
 */
async function mountConsumer<T>(
  consumer: () => T,
  opts: {
    start?: string;
    provideAdapter?: boolean;
    basename?: string;
  } = {},
): Promise<{ router: Router; captured: T }> {
  const { start = "/", provideAdapter = true, basename } = opts;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ROUTES,
  });
  await router.push(start);
  await router.isReady();

  let captured!: T;
  const Child = defineComponent({
    setup() {
      captured = consumer();
      return () => h("div");
    },
  });
  const Root = defineComponent({
    setup() {
      if (provideAdapter) provideVueRouterAdapter();
      if (basename !== undefined) provide(BasenameKey, basename);
      return () => h(Child);
    },
  });
  mount(Root, { global: { plugins: [router] } });
  return { router, captured };
}

describe("nav-composables — vue-router adapter bridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when no RouterAdapter is provided", () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ROUTES,
    });
    const Bad = defineComponent({
      setup() {
        useNavigate();
        return () => h("div");
      },
    });
    expect(() => mount(Bad, { global: { plugins: [router] } })).toThrow(
      /no RouterAdapter/,
    );
  });

  it("useNavigate pushes a path", async () => {
    const { router, captured: navigate } = await mountConsumer(() =>
      useNavigate(),
    );
    navigate("/posts/2");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/2");
  });

  it("useNavigate replaces when { replace } is set", async () => {
    const { router, captured: navigate } = await mountConsumer(
      () => useNavigate(),
      { start: "/posts" },
    );
    navigate("/posts/create", { replace: true });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/create");
  });

  it("useNavigate moves through history on a numeric delta", async () => {
    const { router, captured: navigate } = await mountConsumer(
      () => useNavigate(),
      { start: "/" },
    );
    navigate("/posts");
    await flushPromises();
    navigate("/posts/2");
    await flushPromises();
    navigate(-1);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts");
  });

  it("useLocation reflects the current route (reactively)", async () => {
    const { router, captured: location } = await mountConsumer(
      () => useLocation(),
      { start: "/posts?page=2#top" },
    );
    expect(location.value.pathname).toBe("/posts");
    expect(location.value.searchParams.get("page")).toBe("2");
    expect(location.value.hash).toBe("#top");

    await router.push("/posts/7");
    expect(location.value.pathname).toBe("/posts/7");
  });

  it("useParams reflects the current route params (reactively)", async () => {
    const { router, captured: params } = await mountConsumer(
      () => useParams(),
      { start: "/posts/42" },
    );
    expect(params.value.id).toBe("42");

    await router.push("/posts/99");
    expect(params.value.id).toBe("99");
  });

  it("useMatch matches the current pathname against a pattern", async () => {
    const { captured: match } = await mountConsumer(
      () => useMatch("/posts/:id"),
      { start: "/posts/5" },
    );
    expect(match.value).not.toBeNull();
    expect(match.value?.params.id).toBe("5");
  });

  it("useMatch honors end:false — a parent stays matched on a child route", async () => {
    const { captured: match } = await mountConsumer(
      () => useMatch({ path: "/posts", end: false }),
      { start: "/posts/5" },
    );
    expect(match.value).not.toBeNull();
  });

  it("useMatch defaults to exact (end:true) — no child match", async () => {
    const { captured: match } = await mountConsumer(
      () => useMatch({ path: "/posts", end: true }),
      { start: "/posts/5" },
    );
    expect(match.value).toBeNull();
  });

  it("useMatch string form is exact — no child match", async () => {
    const { captured: match } = await mountConsumer(() => useMatch("/posts"), {
      start: "/posts/5",
    });
    expect(match.value).toBeNull();
  });

  it("useMatch end:false is segment-safe (no bare-prefix false positive)", async () => {
    const { captured: match } = await mountConsumer(
      () => useMatch({ path: "/post", end: false }),
      { start: "/posts" },
    );
    expect(match.value).toBeNull();
  });

  it("useCreatePath builds paths via core createPath", async () => {
    const { captured: createPathFn } = await mountConsumer(() =>
      useCreatePath(),
    );
    expect(createPathFn({ resource: "posts", type: "edit", id: 2 })).toBe(
      "/posts/2",
    );
    expect(createPathFn({ resource: "posts", type: "list" })).toBe("/posts");
    expect(createPathFn({ resource: "posts", type: "create" })).toBe(
      "/posts/create",
    );
    expect(createPathFn({ resource: "posts", type: "show", id: 3 })).toBe(
      "/posts/3/show",
    );
  });

  it("useCreatePath applies the ambient basename", async () => {
    const { captured: createPathFn } = await mountConsumer(
      () => useCreatePath(),
      { basename: "/admin" },
    );
    expect(createPathFn({ resource: "posts", type: "edit", id: 2 })).toBe(
      "/admin/posts/2",
    );
  });

  it("useRedirect('edit') navigates to the edit path", async () => {
    const { router, captured: redirect } = await mountConsumer(() =>
      useRedirect(),
    );
    redirect("edit", "posts", 2);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/2");
  });

  it("useRedirect('list') navigates to the list path", async () => {
    const { router, captured: redirect } = await mountConsumer(
      () => useRedirect(),
      { start: "/posts/2" },
    );
    redirect("list", "posts");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts");
  });

  it("useRedirect(false) is a no-op", async () => {
    const { router, captured: redirect } = await mountConsumer(
      () => useRedirect(),
      { start: "/posts" },
    );
    redirect(false);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts");
  });

  it("useRedirect(fn) navigates to the raw-path result verbatim", async () => {
    const { router, captured: redirect } = await mountConsumer(() =>
      useRedirect(),
    );
    redirect(() => "posts/2/show", "posts", 2);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/2/show");
  });

  it("useRedirect(http URL) hard-navigates via window.location (no router push)", async () => {
    const { router, captured: redirect } = await mountConsumer(() =>
      useRedirect(),
    );
    const original = Object.getOwnPropertyDescriptor(window, "location");
    const holder = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: holder as unknown as Location,
    });
    try {
      redirect("https://example.com/x");
      await flushPromises();
    } finally {
      if (original) Object.defineProperty(window, "location", original);
    }
    expect(holder.href).toBe("https://example.com/x");
    // The router was NOT pushed — we stayed on the initial route.
    expect(router.currentRoute.value.path).toBe("/");
  });
});

describe("useRedirectOptional — router-optional degrade", () => {
  it("returns a real redirect when an adapter is present", async () => {
    const { router, captured: redirect } = await mountConsumer(() =>
      useRedirectOptional(),
    );
    redirect("edit", "posts", 2);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts/2");
  });

  it("returns a stable no-op when no adapter is present (no throw)", () => {
    let redirectA!: ReturnType<typeof useRedirectOptional>;
    let redirectB!: ReturnType<typeof useRedirectOptional>;
    const Consumer = defineComponent({
      setup() {
        redirectA = useRedirectOptional();
        redirectB = useRedirectOptional();
        return () => h("div");
      },
    });
    // No router, no adapter — must not throw, and calling it is a safe no-op.
    expect(() => mount(Consumer)).not.toThrow();
    expect(redirectA).toBe(redirectB); // one stable identity
    expect(() => redirectA("edit", "posts", 2)).not.toThrow();
  });
});

describe("adapter.matchPath — delegates to core", () => {
  it("matches the same as core matchPath", async () => {
    const { captured: match } = await mountConsumer(
      () => useMatch("/posts/:id"),
      { start: "/posts/8" },
    );
    expect(match.value).toEqual(matchPath("/posts/:id", "/posts/8"));
  });
});
