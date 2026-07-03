/**
 * W2-T6 — SSR seam type surface. Pins that the re-exported query SSR helpers
 * carry their real types (not `any`) and that `createCheloneRouter` returns a
 * typed `{ router, RouterProvider }` with an optional-config signature.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
  type CheloneRouterHandle,
  type CreateCheloneRouterOptions,
  createCheloneRouter,
  type DehydratedState,
  dehydrate,
  hydrate,
} from "./index";

describe("SSR type surface", () => {
  it("dehydrate returns a DehydratedState from a QueryClient", () => {
    expectTypeOf(dehydrate).parameter(0).toMatchTypeOf<QueryClient>();
    expectTypeOf<
      ReturnType<typeof dehydrate>
    >().toEqualTypeOf<DehydratedState>();
  });

  it("hydrate takes a QueryClient + a DehydratedState", () => {
    expectTypeOf(hydrate).parameter(0).toMatchTypeOf<QueryClient>();
  });

  it("createCheloneRouter accepts optional options and returns a typed handle", () => {
    // Zero-arg is valid (per-request default).
    assertType<CheloneRouterHandle>(createCheloneRouter());
    // Options are all optional.
    const opts: CreateCheloneRouterOptions = {};
    assertType<CheloneRouterHandle>(createCheloneRouter(opts));
    const handle = createCheloneRouter();
    expectTypeOf(handle.RouterProvider).toMatchTypeOf<
      (props: { children?: ReactNode }) => ReactNode
    >();
  });
});
