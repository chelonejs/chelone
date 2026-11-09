/**
 * Type-level contract pins (W1-T3). The `RouterAdapter` surface, the neutral
 * blocker shape, and the nav-hook signatures are `any`-free and shaped as the
 * §0a-4 contract requires.
 */

import type { CheloneLocation, PathMatch, ResourceRecord } from "@chelone/core";
import { createElement } from "react";
import { Route as RRRoute, Routes as RRRoutes } from "react-router";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  AdapterIndexRouteProps,
  AdapterNavigate,
  AdapterPathRouteProps,
  AdapterRouteProps,
  RouterAdapter,
  RouterBlocker,
} from "./adapter";
import type { BlockerPredicate, RedirectTo } from "./nav-hooks";
import {
  useBasename,
  type useBlocker,
  type useCreatePath,
  useGetPathForRecord,
  useLocation,
  useNavigate,
  useParams,
  type useRedirect,
  useRevalidate,
} from "./nav-hooks";
import { nextRouterAdapter } from "./next-router-adapter";
import { reactRouterAdapter } from "./react-router-adapter";

declare const cp: ReturnType<typeof useCreatePath>;
declare const redirect: ReturnType<typeof useRedirect>;

describe("RouterAdapter type contract", () => {
  it("the default adapter satisfies RouterAdapter exactly", () => {
    expectTypeOf(reactRouterAdapter).toMatchTypeOf<RouterAdapter>();
  });

  it("the Next.js adapter satisfies RouterAdapter", () => {
    expectTypeOf(nextRouterAdapter).toEqualTypeOf<RouterAdapter>();
    assertType<RouterAdapter>(nextRouterAdapter);
  });

  it("react-router's Route and Routes are assignable to the adapter's", () => {
    // The adapter exposes react-router's own components by identity, so its
    // props must be a subset of react-router's — no cast in between.
    expectTypeOf(RRRoute).toMatchTypeOf<RouterAdapter["Route"]>();
    expectTypeOf(RRRoutes).toMatchTypeOf<RouterAdapter["Routes"]>();
  });

  it("an index route takes no children", () => {
    // @ts-expect-error an index route's `children` is `undefined`
    assertType<AdapterRouteProps>({
      index: true,
      children: createElement("div"),
    });
  });

  it("a path route keeps children and takes index only as false", () => {
    assertType<AdapterRouteProps>({
      path: "posts",
      index: false,
      element: createElement("div"),
      children: createElement("div"),
    });
    assertType<AdapterPathRouteProps>({ path: "posts" });
    assertType<AdapterIndexRouteProps>({
      index: true,
      element: createElement("div"),
    });
  });

  it("an adapter with no useRevalidate is still a RouterAdapter", () => {
    const { useRevalidate: _, ...withoutRevalidate } = {
      ...reactRouterAdapter,
      useRevalidate: () => () => {},
    };
    expectTypeOf(withoutRevalidate).not.toHaveProperty("useRevalidate");
    assertType<RouterAdapter>(withoutRevalidate);
  });

  it("useRevalidate returns a () => void", () => {
    expectTypeOf<
      NonNullable<RouterAdapter["useRevalidate"]>
    >().returns.toEqualTypeOf<() => void>();
    expectTypeOf(useRevalidate).returns.toEqualTypeOf<() => void>();
  });

  it("useLocation returns a CheloneLocation", () => {
    expectTypeOf<
      ReturnType<RouterAdapter["useLocation"]>
    >().toEqualTypeOf<CheloneLocation>();
  });

  it("useNavigate returns a ref-stable AdapterNavigate", () => {
    expectTypeOf<
      ReturnType<RouterAdapter["useNavigate"]>
    >().toEqualTypeOf<AdapterNavigate>();
  });

  it("navigate state is LocationState", () => {
    const check = (navigate: AdapterNavigate) => {
      navigate("/x", { state: { _scrollToTop: true, nextPathname: "/y" } });
      // @ts-expect-error `_scrollToTop` is a boolean
      navigate("/x", { state: { _scrollToTop: "yes" } });
    };
    expectTypeOf(check).toBeFunction();
  });

  it("useBlocker returns the normalized RouterBlocker", () => {
    expectTypeOf<
      ReturnType<RouterAdapter["useBlocker"]>
    >().toEqualTypeOf<RouterBlocker>();
    // The three-state union is exhaustive.
    expectTypeOf<RouterBlocker["state"]>().toEqualTypeOf<
      "blocked" | "unblocked" | "proceeding"
    >();
    // location is CheloneLocation | null (never `any`).
    expectTypeOf<
      RouterBlocker["location"]
    >().toEqualTypeOf<CheloneLocation | null>();
  });

  it("matchPath returns the neutral PathMatch | null", () => {
    expectTypeOf<
      ReturnType<RouterAdapter["matchPath"]>
    >().toEqualTypeOf<PathMatch | null>();
  });

  it("useParams values are string | undefined (never any)", () => {
    expectTypeOf<ReturnType<RouterAdapter["useParams"]>>().toEqualTypeOf<
      Record<string, string | undefined>
    >();
  });
});

describe("nav-hook signatures", () => {
  it("useLocation / useParams / useNavigate resolve to the adapter types", () => {
    expectTypeOf(useLocation).returns.toEqualTypeOf<CheloneLocation>();
    expectTypeOf(useParams).returns.toEqualTypeOf<
      Record<string, string | undefined>
    >();
    expectTypeOf(useNavigate).returns.toEqualTypeOf<AdapterNavigate>();
  });

  it("useBasename is a string", () => {
    expectTypeOf(useBasename).returns.toEqualTypeOf<string>();
  });

  it("useCreatePath returns a (CreatePathParams) => string closure", () => {
    assertType<string>(cp({ type: "list", resource: "posts" }));
  });

  it("useBlocker accepts a boolean or a neutral-location predicate", () => {
    expectTypeOf<
      Parameters<typeof useBlocker>[0]
    >().toEqualTypeOf<BlockerPredicate>();
  });

  it("useRedirect accepts every ra-core form (false / fn / CreatePathType)", () => {
    assertType<void>(redirect(false));
    assertType<void>(redirect("list", "posts"));
    assertType<void>(redirect("edit", "posts", 1));
    assertType<void>(redirect((_r, _id) => "show", "posts", 1));
    // RedirectTo admits the string and false forms (the function form is
    // covered by the callable assertion above).
    const asString: RedirectTo = "list";
    const asFalse: RedirectTo = false;
    assertType<RedirectTo>(asString);
    assertType<RedirectTo>(asFalse);
  });

  it("a redirect function receives a ResourceRecord", () => {
    type RedirectFn = Extract<RedirectTo, (...args: never[]) => string | false>;
    expectTypeOf<Parameters<RedirectFn>[2]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
    expectTypeOf<Parameters<ReturnType<typeof useRedirect>>[3]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
  });

  it("useGetPathForRecord returns string | false (never any)", () => {
    expectTypeOf(useGetPathForRecord).returns.toEqualTypeOf<string | false>();
  });
});
