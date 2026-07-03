/**
 * The imperative router seam Chelone owns and never depends on directly.
 *
 * `RouterPort` is a TYPE-ONLY contract: the smallest surface that BOTH
 * react-router and TanStack Router can satisfy (see plan §0b-2). The declarative
 * React contract (7 hooks + 5 components) lives in `@chelone/react`'s
 * `RouterAdapter`; this port is the vanilla / SSR / loader seam — no React, no
 * `window` at import.
 *
 * The single decision that makes ONE interface cover both routers: `to` is a
 * STRING and Chelone owns search-param serialization (Zod registry), so neither
 * router's typed-search / typed-params generics ever leak here (plan §0b-3).
 */

import type { CheloneLocation, NavigateOpts } from "./location";

// Re-export the location types so `./port` is a complete view of the seam.
export type { CheloneLocation, NavigateOpts } from "./location";

/** Teardown returned by `subscribe`/`block`. */
export type Unsubscribe = () => void;

/**
 * The imperative router seam. `block` is OPTIONAL: react-router's blocker is a
 * React hook (`useBlocker`, data-router v6.4+), not imperative, so the vanilla
 * port cannot always provide it — the react adapter supplies blocking on the
 * react-router path, TanStack's history exposes it imperatively (plan §0b-2).
 */
export interface RouterPort {
  /** Push (or replace) a string location. */
  navigate(to: string, opts?: NavigateOpts): void;
  back(): void;
  forward(): void;
  getLocation(): CheloneLocation;
  /** Subscribe to location changes; returns a teardown. */
  subscribe(listener: () => void): Unsubscribe;
  /** Current route params (splat exposed under the `*` key). */
  getParams(): Record<string, string | undefined>;
  /** Resolve a `to` string into a href (basename-applied). */
  createHref(to: string): string;
  /** Imperative navigation block; absent where the host can't provide one. */
  block?(shouldBlock: boolean): Unsubscribe;
}
