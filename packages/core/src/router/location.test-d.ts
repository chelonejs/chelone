import { expectTypeOf, it } from "vitest";
import type { CheloneLocation, LocationState, NavigateOpts } from "./location";
import { parseLocation, toLocationState } from "./location";

it("CheloneLocation state is a LocationState or null", () => {
  expectTypeOf<
    CheloneLocation["state"]
  >().toEqualTypeOf<LocationState | null>();
  expectTypeOf<CheloneLocation["state"]>().not.toBeAny();
});

it("NavigateOpts state is a LocationState", () => {
  expectTypeOf<NavigateOpts["state"]>().toEqualTypeOf<
    LocationState | undefined
  >();
  const ok: NavigateOpts = { state: { _scrollToTop: true } };
  expectTypeOf(ok).toMatchTypeOf<NavigateOpts>();
  // @ts-expect-error _scrollToTop is a boolean
  const bad: NavigateOpts = { state: { _scrollToTop: "yes" } };
  expectTypeOf(bad).toMatchTypeOf<NavigateOpts>();
});

it("toLocationState reads untyped input into a LocationState or null", () => {
  expectTypeOf(toLocationState).parameter(0).toBeUnknown();
  expectTypeOf(toLocationState).returns.toEqualTypeOf<LocationState | null>();
  expectTypeOf(parseLocation)
    .parameter(1)
    .toEqualTypeOf<LocationState | null | undefined>();
});
