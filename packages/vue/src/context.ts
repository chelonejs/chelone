/**
 * The Chelone provider context for `@chelone/vue` — the Vue twin of
 * `@chelone/react`'s `context.tsx` (`CheloneProvider` / `useCheloneContext`).
 * It carries the exact same value the React adapter constructs: the P2 data
 * seam (`dataProvider` + `queryClient`) plus the optional P3 services (`store` /
 * `i18n` / `authProvider` / `notifications`) and the zod resource registry.
 *
 * Idiom translation from the React twin: React threads the value through a
 * `createContext` provider and reads it with `useContext`. Vue has no render
 * tree of providers — the value is `provide`d once (by `<Admin>`) under a typed
 * `InjectionKey` and read with `inject`, so the inject site is fully typed with
 * no cast. The value is a plain object (not reactive): the providers it holds
 * are stable for the admin's lifetime, exactly as React memoizes the context
 * value on its stable inputs.
 */

import type {
  AnyChelonI18n,
  AuthProvider,
  ChelonStore,
  DataProvider,
  NotificationStore,
  ResourceMap,
} from "@chelone/core";
import type { QueryClient } from "@tanstack/vue-query";
import { type InjectionKey, inject, provide } from "vue";

/** The data context (P2) plus the optional P3 services — mirrors React's `CheloneContextValue`. */
export interface CheloneContextValue<
  TResources extends ResourceMap = ResourceMap,
> {
  /** The data provider (the P2 data seam). */
  dataProvider: DataProvider<TResources>;
  /** The vue-query client (P2 — factory-created at the app root or by `<Admin>`). */
  queryClient: QueryClient;
  /** The optional KV store (preferences / list scroll). */
  store?: ChelonStore;
  /** The optional i18n instance (translations). */
  i18n?: AnyChelonI18n;
  /** The optional auth provider (gates the shell when `requireAuth`). */
  authProvider?: AuthProvider;
  /** The optional notification store (i18n-key notifications). */
  notifications?: NotificationStore;
  /**
   * The zod resource registry (P5): a resource's schema becomes the DEFAULT
   * form validator for the edit/create form composables (D6) when present.
   */
  resources?: TResources;
}

/**
 * The provide/inject key for the Chelone context. `<Admin>` provides it; every
 * data / i18n / store composable reads it via {@link useCheloneContext}. A typed
 * `InjectionKey` keeps the inject site fully typed with no cast.
 */
export const CheloneContextKey: InjectionKey<CheloneContextValue> =
  Symbol("chelone-context");

/** Provide the Chelone context to the subtree (called by `<Admin>` in `setup`). */
export function provideCheloneContext(value: CheloneContextValue): void {
  provide(CheloneContextKey, value);
}

/**
 * Read the ambient Chelone context. Throws when used outside `<Admin>` — the
 * shell always provides it, so a throw means a data/i18n composable ran outside
 * the admin tree (parity with the React twin's `useCheloneContext`).
 */
export function useCheloneContext<
  TResources extends ResourceMap = ResourceMap,
>(): CheloneContextValue<TResources> {
  const ctx = inject(CheloneContextKey, null);
  if (!ctx) {
    throw new Error(
      "useCheloneContext: no <Admin> found above this component.",
    );
  }
  return ctx as CheloneContextValue<TResources>;
}

/** The i18n instance — throws when none was provided (parity with the React twin). */
export function useChelonI18n(): AnyChelonI18n {
  const { i18n } = useCheloneContext();
  if (!i18n) {
    throw new Error("useChelonI18n: pass an i18n instance to <Admin>.");
  }
  return i18n;
}

/** The KV store — throws when none was provided (parity with the React twin). */
export function useChelonStore(): ChelonStore {
  const { store } = useCheloneContext();
  if (!store) {
    throw new Error("useChelonStore: pass a store to <Admin>.");
  }
  return store;
}

/**
 * The notification store, or `undefined`. Optional by design — controllers
 * degrade gracefully without one; hooks that REQUIRE it throw at their own site.
 */
export function useChelonNotifications(): NotificationStore | undefined {
  return useCheloneContext().notifications;
}

/** The auth provider — throws when none was provided (parity with the React twin). */
export function useChelonAuthProvider(): AuthProvider {
  const { authProvider } = useCheloneContext();
  if (!authProvider) {
    throw new Error("useChelonAuthProvider: pass an authProvider to <Admin>.");
  }
  return authProvider;
}
