import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import type { CheloneContextValue } from "../context";

export function makeCheloneContext(
  overrides: Partial<CheloneContextValue> = {},
): CheloneContextValue {
  return {
    dataProvider: fakeDataProvider({}),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    ...overrides,
  };
}
