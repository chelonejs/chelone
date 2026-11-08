/**
 * Type-level contract pin (W1-T4): the TanStack reference adapter satisfies the
 * SAME `RouterAdapter` interface as the react-router default — proving the seam
 * is genuinely router-neutral (plan §0b-3/§0b-6). No `any` leaks from TanStack's
 * typed-search / typed-params generics (they never reach this surface).
 */

import type { CheloneLocation, PathMatch } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { AdapterNavigate, RouterAdapter, RouterBlocker } from "./adapter";
import {
  tanstackHostRouterAdapter,
  tanstackRouterAdapter,
} from "./tanstack-router-adapter";

describe("tanstackRouterAdapter type contract", () => {
  it("satisfies the RouterAdapter interface exactly", () => {
    expectTypeOf(tanstackRouterAdapter).toMatchTypeOf<RouterAdapter>();
  });

  it("useLocation returns a CheloneLocation (not TanStack's typed ParsedLocation)", () => {
    expectTypeOf<
      ReturnType<(typeof tanstackRouterAdapter)["useLocation"]>
    >().toEqualTypeOf<CheloneLocation>();
  });

  it("useNavigate returns the neutral AdapterNavigate", () => {
    expectTypeOf<
      ReturnType<(typeof tanstackRouterAdapter)["useNavigate"]>
    >().toEqualTypeOf<AdapterNavigate>();
  });

  it("useBlocker returns the normalized RouterBlocker (not TanStack's BlockerResolver)", () => {
    expectTypeOf<
      ReturnType<(typeof tanstackRouterAdapter)["useBlocker"]>
    >().toEqualTypeOf<RouterBlocker>();
  });

  it("useBlocker's predicate receives CheloneLocation", () => {
    type Predicate = Extract<
      Parameters<(typeof tanstackRouterAdapter)["useBlocker"]>[0],
      (args: never) => boolean
    >;
    expectTypeOf<Predicate>().toEqualTypeOf<
      (args: {
        currentLocation: CheloneLocation;
        nextLocation: CheloneLocation;
      }) => boolean
    >();
  });

  it("useParams values are string | undefined (never any — no typed-params leak)", () => {
    expectTypeOf<
      ReturnType<(typeof tanstackRouterAdapter)["useParams"]>
    >().toEqualTypeOf<Record<string, string | undefined>>();
  });

  it("matchPath returns the neutral PathMatch | null", () => {
    expectTypeOf<
      ReturnType<(typeof tanstackRouterAdapter)["matchPath"]>
    >().toEqualTypeOf<PathMatch | null>();
  });
});

describe("tanstackHostRouterAdapter type contract", () => {
  it("satisfies the RouterAdapter interface exactly", () => {
    expectTypeOf(tanstackHostRouterAdapter).toMatchTypeOf<RouterAdapter>();
  });
});
