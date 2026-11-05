import type { DataProvider } from "@chelone/core";
import type { DependencyList } from "react";
import { describe, expectTypeOf, it } from "vitest";
import {
  useDataProvider,
  useIsMobile,
  useLoading,
  useLocaleState,
  useRefresh,
  useTimeout,
} from "./compat-hooks";

describe("compat-hooks types", () => {
  it("useDataProvider returns a DataProvider", () => {
    expectTypeOf(useDataProvider()).toEqualTypeOf<DataProvider>();
  });

  it("useDataProvider is generic over a narrowed provider type", () => {
    interface CustomProvider extends DataProvider {
      custom(): Promise<void>;
    }
    expectTypeOf(
      useDataProvider<Record<string, never>, CustomProvider>(),
    ).toEqualTypeOf<CustomProvider>();
  });

  it("useRefresh returns a zero-arg void callback", () => {
    expectTypeOf(useRefresh()).toEqualTypeOf<() => void>();
  });

  it("useLoading returns a boolean", () => {
    expectTypeOf(useLoading()).toEqualTypeOf<boolean>();
  });

  it("useLocaleState returns a [string, (locale: string) => void] tuple", () => {
    expectTypeOf(useLocaleState()).toEqualTypeOf<
      [string, (locale: string) => void]
    >();
  });

  it("useIsMobile returns a boolean", () => {
    expectTypeOf(useIsMobile()).toEqualTypeOf<boolean>();
  });

  it("useTimeout takes a readonly dependency list", () => {
    const dependencies: readonly string[] = ["a"];
    expectTypeOf(useTimeout)
      .parameter(1)
      .toEqualTypeOf<DependencyList | undefined>();
    expectTypeOf(useTimeout(100, dependencies)).toEqualTypeOf<boolean>();
  });
});
