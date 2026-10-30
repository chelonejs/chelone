/**
 * `<AdminContext>` — the provider stack, exposed as a documented escape hatch
 * (plan D2). `<Admin>` = `<AdminContext>` + `<AdminUI>`; splitting them lets an
 * app own the shell (custom routing) while still getting Chelone's providers, or
 * mount providers without the shell.
 *
 * Provider nesting order is load-bearing (parity §0a-2), outermost → innermost:
 *
 *   RouterAdapterProvider            (the injected router — OUTERMOST so every
 *                                     routing hook below reads it)
 *     └ CheloneProvider              (the EXISTING P2–P5 provider: data / query /
 *                                     store / i18n / auth / notifications /
 *                                     resources — NOT reimplemented here)
 *         └ ResourceRegistryProvider (the runtime resource registry, W1-T5)
 *             └ BasenameProvider     (the app basename, default '')
 *                 └ RouterWrapper    (join a host router, else create one)
 *                     └ children
 *
 * `RouterWrapper` sits INSIDE the adapter/registry providers (they are pure
 * context, safe above a router) but wraps the children so the shell renders
 * within a router. The basename context is set for link-building; the created
 * router (when there is no host) applies the basename itself (parity §0a-12).
 */

import type {
  AnyCheloneI18n,
  AuthProvider,
  CheloneStore,
  DataProvider,
  NotificationStore,
  ResourceMap,
  ResourceRegistry,
} from "@chelone/core";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWatchDataErrors } from "../auth-hooks";
import { CheloneProvider } from "../context";
import {
  ResourceRegistryProvider,
  useResourceRegistry,
} from "../resource/registry-hooks";
import {
  type RouterAdapter,
  RouterAdapterProvider,
  useRouterAdapter,
} from "../router/adapter";
import { BasenameProvider } from "../router/context";
import { reactRouterAdapter } from "../router/react-router-adapter";

/** Config props shared by `<AdminContext>` and `<Admin>` (the provider layer). */
export interface AdminContextProps<
  TResources extends ResourceMap = ResourceMap,
> {
  /** The data provider (required — the P2 data seam). */
  dataProvider: DataProvider<TResources>;
  /** The React Query client (required — factory-created at the app root). */
  queryClient: QueryClient;
  /** The optional KV store (preferences / list scroll). */
  store?: CheloneStore;
  /** The optional i18n instance (translations). */
  i18n?: AnyCheloneI18n;
  /** The optional auth provider (gates the shell when `requireAuth`). */
  authProvider?: AuthProvider;
  /** The optional notification store (i18n-key notifications). */
  notifications?: NotificationStore;
  /** The zod resource registry (enables registry-schema form validation). */
  resources?: TResources;
  /**
   * The router adapter to inject. Defaults to `reactRouterAdapter`; swap it for
   * `tanstackRouterAdapter` or a custom adapter (plan D1). Named `router` on
   * `<Admin>`, `adapter` here (the low-level name).
   */
  adapter?: RouterAdapter;
  /** The app basename (default `''`). */
  basename?: string;
  /**
   * An existing runtime resource registry. Omit to have the provider create one
   * (the common case). Supply one to share a registry across trees / for SSR.
   */
  registry?: ResourceRegistry;
  children: ReactNode;
}

/**
 * Wrap `children` in the created-or-joined router. Separated so it runs INSIDE
 * the adapter provider (it calls `useRouterAdapter`), keeping the JSX flat.
 */
function AdminRouterWrapper({
  basename,
  children,
}: {
  basename: string;
  children: ReactNode;
}) {
  const { RouterWrapper } = useRouterAdapter();
  return <RouterWrapper basename={basename}>{children}</RouterWrapper>;
}

/**
 * Wire `checkError` → auto-logout into the data error path (R2). Renders
 * nothing; subscribes to the shared QueryClient's caches so a 401/403 from the
 * dataProvider logs the user out. Mounted inside the router + providers so the
 * logout notify/redirect seams resolve. A no-op without an `authProvider`.
 */
function AuthErrorWatcher(): null {
  useWatchDataErrors();
  return null;
}

/**
 * The provider stack (escape hatch). See the module doc for the exact nesting.
 * The registry is created ONCE by `ResourceRegistryProvider` (unless supplied),
 * so it is stable for the provider's lifetime.
 */
export function AdminContext<TResources extends ResourceMap = ResourceMap>({
  dataProvider,
  queryClient,
  store,
  i18n,
  authProvider,
  notifications,
  resources,
  adapter = reactRouterAdapter,
  basename = "",
  registry,
  children,
}: AdminContextProps<TResources>) {
  return (
    <RouterAdapterProvider adapter={adapter}>
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
        i18n={i18n}
        authProvider={authProvider}
        notifications={notifications}
        resources={resources}
      >
        <ResourceRegistryProvider registry={registry}>
          <BasenameProvider basename={basename}>
            <AdminRouterWrapper basename={basename}>
              <AuthErrorWatcher />
              {children}
            </AdminRouterWrapper>
          </BasenameProvider>
        </ResourceRegistryProvider>
      </CheloneProvider>
    </RouterAdapterProvider>
  );
}

// Re-exported so escape-hatch consumers can read the registry without reaching
// into the resource module.
export { useResourceRegistry };
