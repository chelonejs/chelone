import type { DataContext, DataProvider, ResourceMap } from "@chelone/core";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";

const CheloneContext = createContext<DataContext | null>(null);

export interface CheloneProviderProps<
  TResources extends ResourceMap = ResourceMap,
> {
  dataProvider: DataProvider<TResources>;
  queryClient: QueryClient;
  children: ReactNode;
}

export function CheloneProvider<TResources extends ResourceMap = ResourceMap>({
  dataProvider,
  queryClient,
  children,
}: CheloneProviderProps<TResources>) {
  const value = useMemo(
    () => ({ dataProvider, queryClient }) as DataContext,
    [dataProvider, queryClient],
  );
  return (
    <CheloneContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </CheloneContext.Provider>
  );
}

export function useCheloneContext<
  TResources extends ResourceMap = ResourceMap,
>(): DataContext<TResources> {
  const ctx = useContext(CheloneContext);
  if (!ctx) {
    throw new Error(
      "useCheloneContext: no <CheloneProvider> found above this component.",
    );
  }
  return ctx as DataContext<TResources>;
}
