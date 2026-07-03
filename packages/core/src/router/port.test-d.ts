import { expectTypeOf, it } from "vitest";
import type {
  CheloneLocation,
  NavigateOpts,
  RouterPort,
  Unsubscribe,
} from "./port";

it("CheloneLocation carries the location shape", () => {
  expectTypeOf<CheloneLocation>().toMatchTypeOf<{
    pathname: string;
    search: string;
    searchParams: URLSearchParams;
    hash: string;
    state: unknown;
  }>();
  // key is optional
  expectTypeOf<CheloneLocation["key"]>().toEqualTypeOf<string | undefined>();
  // state is unknown, never any
  expectTypeOf<CheloneLocation["state"]>().not.toBeAny();
});

it("NavigateOpts is fully optional", () => {
  expectTypeOf<NavigateOpts>().toMatchTypeOf<{
    replace?: boolean;
    state?: unknown;
    resetScroll?: boolean;
  }>();
  expectTypeOf<NavigateOpts["state"]>().not.toBeAny();
});

it("RouterPort exposes the imperative seam", () => {
  expectTypeOf<RouterPort["navigate"]>().toBeFunction();
  expectTypeOf<RouterPort["navigate"]>().parameters.toMatchTypeOf<
    [string, NavigateOpts?]
  >();
  expectTypeOf<RouterPort["back"]>().toEqualTypeOf<() => void>();
  expectTypeOf<RouterPort["forward"]>().toEqualTypeOf<() => void>();
  expectTypeOf<RouterPort["getLocation"]>().toEqualTypeOf<
    () => CheloneLocation
  >();
  expectTypeOf<RouterPort["getParams"]>().returns.toEqualTypeOf<
    Record<string, string | undefined>
  >();
  expectTypeOf<RouterPort["createHref"]>().toEqualTypeOf<
    (to: string) => string
  >();
  // subscribe returns an Unsubscribe
  expectTypeOf<RouterPort["subscribe"]>()
    .parameter(0)
    .toEqualTypeOf<() => void>();
  expectTypeOf<RouterPort["subscribe"]>().returns.toEqualTypeOf<Unsubscribe>();
  // block is optional
  expectTypeOf<RouterPort["block"]>().toEqualTypeOf<
    ((shouldBlock: boolean) => Unsubscribe) | undefined
  >();
});

it("Unsubscribe is a nullary void thunk", () => {
  expectTypeOf<Unsubscribe>().toEqualTypeOf<() => void>();
});
