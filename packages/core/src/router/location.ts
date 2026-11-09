/**
 * Framework-neutral location types + a pure, SSR-safe parser.
 *
 * No `window` at import (or ever): `parseLocation` takes a full path string
 * (`/posts?page=2#top`) so it works identically in a loader, in node, and in the
 * browser. Adapters map their host location onto `CheloneLocation`.
 */

import { isRecord } from "../guards";

/** The Store key the login flow stashes the post-login target under. */
export const NEXT_PATHNAME_KEY = "nextPathname";

/**
 * What Chelone writes into history state. An interface, so an app adds its own
 * keys by augmenting `@chelone/core`.
 */
export interface LocationState {
  /** `false` keeps the scroll position on navigation. */
  _scrollToTop?: boolean;
  /** Where to go once a blocked navigation is confirmed. */
  nextPathname?: string;
  /** A seed record of any resource, read by `getRecordFromLocation`. */
  // type-escape: context: a seed record can belong to any resource
  record?: Record<string, unknown>;
}

/**
 * Read browser history state, which is untyped input, as a `LocationState`.
 * `null` for anything that is not an object or whose known keys have the wrong
 * type. App keys pass through unchecked.
 */
// type-escape: dom: browser history state is untyped
export function toLocationState(raw: unknown): LocationState | null {
  return isLocationState(raw) ? raw : null;
}

function isLocationState(raw: unknown): raw is LocationState {
  if (!isRecord(raw)) return false;
  const { _scrollToTop, nextPathname, record } = raw;
  return (
    (_scrollToTop === undefined || typeof _scrollToTop === "boolean") &&
    (nextPathname === undefined || typeof nextPathname === "string") &&
    (record === undefined || isRecord(record))
  );
}

/**
 * A framework-neutral location snapshot. `search` is the raw `?a=b` string
 * (leading `?` included, `''` when empty); `searchParams` is the parsed
 * convenience view; `state` is a `LocationState` or `null`.
 * `key` is native in react-router, synthesized for TanStack (plan §0b-4).
 */
export interface CheloneLocation {
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
  hash: string;
  state: LocationState | null;
  key?: string;
}

/**
 * Navigation options. `resetScroll` is Chelone's canonical name; adapters map it
 * to TanStack's `resetScroll` (identity) or react-router's inverted
 * `preventScrollReset` (plan §0b-4).
 */
export interface NavigateOpts {
  replace?: boolean;
  state?: LocationState;
  resetScroll?: boolean;
}

/**
 * Parse a full path string into a `CheloneLocation`. Pure — no `window`.
 * `state`/`key` are threaded through from the caller (a router adapter owns the
 * history entry's state; a bare parse has none).
 */
export function parseLocation(
  to: string,
  state: LocationState | null = null,
  key?: string,
): CheloneLocation {
  const hashIndex = to.indexOf("#");
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? to.slice(0, hashIndex) : to;

  const searchIndex = withoutHash.indexOf("?");
  const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : "";
  const pathname =
    searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash;

  return {
    pathname: pathname || "/",
    search,
    // URLSearchParams accepts a leading `?` and an empty string.
    searchParams: new URLSearchParams(search),
    hash,
    state,
    key,
  };
}
