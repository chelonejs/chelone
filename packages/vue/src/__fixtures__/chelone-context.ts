import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import type { CheloneContextValue } from "../context";

/**
 * A whole Chelone context with real defaults: an empty fake data provider and a
 * fresh `QueryClient`. A test that provides its own context overrides only what
 * it exercises (`makeCheloneContext({ i18n })`) and hands the result to
 * `provideCheloneContext` with no cast.
 */
export function makeCheloneContext(
  overrides: Partial<CheloneContextValue> = {},
): CheloneContextValue {
  return {
    dataProvider: fakeDataProvider({}),
    queryClient: new QueryClient(),
    ...overrides,
  };
}
