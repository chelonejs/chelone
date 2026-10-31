/**
 * The declarative router contract `@chelone/vue` owns and injects — the Vue
 * twin of `@chelone/react`'s `RouterAdapter` (`packages/react/src/router/
 * adapter.tsx`). A `RouterAdapter` is the reactive subscribe seam the shell
 * needs: the hooks that read the *current* location / params / match, plus a
 * stable navigator and the pure `matchPath`. vue-router is the default adapter
 * (`vueRouterAdapter`, `./vue-router-adapter`); a second Vue router stays a
 * reference slot — both satisfy THIS interface, so the shell never sees a
 * concrete router.
 *
 * The one decision that makes ONE interface cover both routers (mirrors the
 * React port): `to` is a STRING and Chelone owns search-param serialization, so
 * neither router's typed-search / typed-params generics leak here.
 *
 * Idiom translation from the React twin: React's adapter hooks return plain
 * snapshots (`useLocation(): CheloneLocation`) and reactivity comes from React
 * re-rendering. Vue has no render phase — reactivity is a graph — so the Vue
 * adapter's readers return `ComputedRef<…>` derived from vue-router's reactive
 * `useRoute()`. The navigator is a plain stable function (no `useCallback`
 * churn to defend against, unlike react-router).
 */

import type { CheloneLocation, NavigateOpts, PathMatch } from "@chelone/core";
import { type ComputedRef, type InjectionKey, inject, type Ref } from "vue";

/** The nav options a caller may pass. Mirrors the React twin's `AdapterNavigate`. */
export interface AdapterNavigateOpts {
  replace?: boolean;
  state?: NavigateOpts["state"];
}

/**
 * `useNavigate`'s returned navigator — a stable function. A string `to`
 * pushes/replaces a path; a numeric `delta` moves through history.
 */
export interface AdapterNavigate {
  (to: string, opts?: AdapterNavigateOpts): void;
  (delta: number): void;
}

/** `useMatch` argument: a pattern string, optionally with an `end` toggle. */
export interface UseMatchArgs {
  path: string;
  end?: boolean;
}

/**
 * What `useBlocker` returns. The Vue twin of the React `RouterBlocker`, with
 * `state` / `location` as readonly refs because Vue has no render phase to
 * re-read a snapshot. `proceed` / `reset` are plain functions that do nothing
 * unless `state` is `"blocked"`, so callers never guard on presence.
 */
export interface RouterBlocker {
  state: Readonly<Ref<"blocked" | "unblocked" | "proceeding">>;
  /** The pending target while `blocked` / `proceeding`; else `null`. */
  location: Readonly<Ref<CheloneLocation | null>>;
  /** Let the blocked navigation through. */
  proceed: () => void;
  /** Cancel the blocked navigation. */
  reset: () => void;
}

/** What `useBlocker` accepts: a flag, a ref to one, or a predicate. */
export type ShouldBlock =
  | boolean
  | Ref<boolean>
  | ((args: {
      currentLocation: CheloneLocation;
      nextLocation: CheloneLocation;
    }) => boolean);

/**
 * The reactive router contract. Every reader returns a `ComputedRef` so a
 * component that consumes it updates when the route changes; the navigator and
 * `matchPath` are plain (a function / a pure util). Implementing every member
 * IS the whole contract — the shell depends only on this shape, never on
 * vue-router directly.
 */
export interface RouterAdapter {
  /** Current location as a framework-neutral `CheloneLocation`, reactively. */
  useLocation(): ComputedRef<CheloneLocation>;
  /** A stable navigator: a string path or a numeric history delta. */
  useNavigate(): AdapterNavigate;
  /** Current route params (splat joined under its catch-all key), reactively. */
  useParams(): ComputedRef<Record<string, string | undefined>>;
  /** Match the current pathname against a pattern, reactively. */
  useMatch(pattern: string | UseMatchArgs): ComputedRef<PathMatch | null>;
  /** Dependency-free path matcher (returns the neutral `PathMatch`). */
  matchPath(pattern: string, pathname: string): PathMatch | null;
  /**
   * Hold a navigation while `shouldBlock`, until `proceed()` or `reset()`.
   * Must run in a setup or effect scope: the guard goes with the scope.
   */
  useBlocker(shouldBlock: ShouldBlock): RouterBlocker;
  /** Whether the router can block navigation (drives `warnWhenUnsaved`). */
  useCanBlock(): boolean;
}

/**
 * The provide/inject key for the injected `RouterAdapter`. `<Admin>` (or a
 * standalone `provideVueRouterAdapter()`) provides it; every routing composable
 * reads it via {@link useRouterAdapter}. A typed `InjectionKey` keeps the
 * inject site fully typed with no cast.
 */
export const RouterAdapterKey: InjectionKey<RouterAdapter> = Symbol(
  "chelone-router-adapter",
);

/**
 * The provide/inject key for the app basename (default `''`). Consumed by
 * {@link useBasename} → `useCreatePath` / `useRedirect`. `<Admin>` sets it when
 * mounted under a host router with a basename; standalone it stays `''`.
 */
export const BasenameKey: InjectionKey<string> = Symbol("chelone-basename");

/**
 * Read the injected `RouterAdapter`. Throws if none is present — a routing
 * composable used outside `<Admin>` / `provideVueRouterAdapter()` is a misuse
 * that must fail loudly (parity with the React twin's `useRouterAdapter`).
 * The null-tolerant path is {@link useRouterAdapterOptional}.
 */
export function useRouterAdapter(): RouterAdapter {
  const adapter = inject(RouterAdapterKey, null);
  if (!adapter) {
    throw new Error(
      "useRouterAdapter: no RouterAdapter found. Render inside <Admin> or " +
        "call provideVueRouterAdapter() in an ancestor setup().",
    );
  }
  return adapter;
}

/**
 * Null-tolerant read of the injected `RouterAdapter` — the adapter when
 * present, `null` when absent. Backs the router-optional degrade
 * ({@link useRedirectOptional}) so standalone forms/controllers unit-test
 * without a mounted router. Vue has no Rules of Hooks, so a conditional call of
 * the real composables based on this is legal (unlike the React twin, which
 * must suppress `useHookAtTopLevel`).
 */
export function useRouterAdapterOptional(): RouterAdapter | null {
  return inject(RouterAdapterKey, null);
}

/** Read the app basename (default `''`). Mirrors the React twin's `useBasename`. */
export function useBasename(): string {
  return inject(BasenameKey, "");
}
