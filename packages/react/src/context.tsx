import type {
  AnyChelonI18n,
  AuthProvider,
  ChelonStore,
  DataContext,
  DataProvider,
  ResourceMap,
} from "@chelone/core";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/** Data context (P2) plus the optional P3 services. */
export interface CheloneContextValue<
  TResources extends ResourceMap = ResourceMap,
> extends DataContext<TResources> {
  store?: ChelonStore;
  i18n?: AnyChelonI18n;
  authProvider?: AuthProvider;
}

const CheloneContext = createContext<CheloneContextValue | null>(null);

export interface CheloneProviderProps<
  TResources extends ResourceMap = ResourceMap,
> {
  dataProvider: DataProvider<TResources>;
  queryClient: QueryClient;
  store?: ChelonStore;
  i18n?: AnyChelonI18n;
  authProvider?: AuthProvider;
  children: ReactNode;
}

export function CheloneProvider<TResources extends ResourceMap = ResourceMap>({
  dataProvider,
  queryClient,
  store,
  i18n,
  authProvider,
  children,
}: CheloneProviderProps<TResources>) {
  const value = useMemo(
    () =>
      ({
        dataProvider,
        queryClient,
        store,
        i18n,
        authProvider,
      }) as CheloneContextValue,
    [dataProvider, queryClient, store, i18n, authProvider],
  );
  return (
    <CheloneContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </CheloneContext.Provider>
  );
}

export function useCheloneContext<
  TResources extends ResourceMap = ResourceMap,
>(): CheloneContextValue<TResources> {
  const ctx = useContext(CheloneContext);
  if (!ctx) {
    throw new Error(
      "useCheloneContext: no <CheloneProvider> found above this component.",
    );
  }
  return ctx as CheloneContextValue<TResources>;
}

export function useChelonStore(): ChelonStore {
  const { store } = useCheloneContext();
  if (!store) {
    throw new Error("useChelonStore: pass a store to <CheloneProvider>.");
  }
  return store;
}

export function useChelonI18n(): AnyChelonI18n {
  const { i18n } = useCheloneContext();
  if (!i18n) {
    throw new Error(
      "useChelonI18n: pass an i18n instance to <CheloneProvider>.",
    );
  }
  return i18n;
}

export function useChelonAuthProvider(): AuthProvider {
  const { authProvider } = useCheloneContext();
  if (!authProvider) {
    throw new Error(
      "useChelonAuthProvider: pass an authProvider to <CheloneProvider>.",
    );
  }
  return authProvider;
}
