import type {
  AnyCheloneI18n,
  AuthProvider,
  CheloneStore,
  DataContext,
  DataProvider,
  NotificationStore,
  ResourceMap,
} from "@chelone/core";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/** Data context (P2) plus the optional P3 services. */
export interface CheloneContextValue<
  TResources extends ResourceMap = ResourceMap,
> extends DataContext<TResources> {
  store?: CheloneStore;
  i18n?: AnyCheloneI18n;
  authProvider?: AuthProvider;
  notifications?: NotificationStore;
  /**
   * The resource registry (P5): a resource's zod schema becomes the DEFAULT
   * form validator for `useEditForm`/`useCreateForm` (D6) when present.
   */
  resources?: TResources;
}

const CheloneContext = createContext<CheloneContextValue | null>(null);

export interface CheloneProviderProps<
  TResources extends ResourceMap = ResourceMap,
> {
  dataProvider: DataProvider<TResources>;
  queryClient: QueryClient;
  store?: CheloneStore;
  i18n?: AnyCheloneI18n;
  authProvider?: AuthProvider;
  notifications?: NotificationStore;
  /** The resource registry — enables registry-schema form validation (D6). */
  resources?: TResources;
  children: ReactNode;
}

export function CheloneProvider<TResources extends ResourceMap = ResourceMap>({
  dataProvider,
  queryClient,
  store,
  i18n,
  authProvider,
  notifications,
  resources,
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
        notifications,
        resources,
      }) as CheloneContextValue,
    [
      dataProvider,
      queryClient,
      store,
      i18n,
      authProvider,
      notifications,
      resources,
    ],
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

export function useCheloneStore(): CheloneStore {
  const { store } = useCheloneContext();
  if (!store) {
    throw new Error("useCheloneStore: pass a store to <CheloneProvider>.");
  }
  return store;
}

export function useCheloneI18n(): AnyCheloneI18n {
  const { i18n } = useCheloneContext();
  if (!i18n) {
    throw new Error(
      "useCheloneI18n: pass an i18n instance to <CheloneProvider>.",
    );
  }
  return i18n;
}

/**
 * Optional-returning by design: notifications are an optional service, and
 * some consumers (e.g. controllers) degrade gracefully without one. Hooks
 * that REQUIRE the store (useNotify/useNotifications) throw on undefined.
 */
export function useCheloneNotifications(): NotificationStore | undefined {
  return useCheloneContext().notifications;
}

export function useCheloneAuthProvider(): AuthProvider {
  const { authProvider } = useCheloneContext();
  if (!authProvider) {
    throw new Error(
      "useCheloneAuthProvider: pass an authProvider to <CheloneProvider>.",
    );
  }
  return authProvider;
}
