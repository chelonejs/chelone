/**
 * Framework-neutral location types + a pure, SSR-safe parser.
 *
 * No `window` at import (or ever): `parseLocation` takes a full path string
 * (`/posts?page=2#top`) so it works identically in a loader, in node, and in the
 * browser. Adapters map their host location onto `CheloneLocation`.
 */

/**
 * A framework-neutral location snapshot. `search` is the raw `?a=b` string
 * (leading `?` included, `''` when empty); `searchParams` is the parsed
 * convenience view; `state` is `unknown` (never `any`) — callers narrow it.
 * `key` is native in react-router, synthesized for TanStack (plan §0b-4).
 */
export interface CheloneLocation {
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
  hash: string;
  state: unknown;
  key?: string;
}

/**
 * Navigation options. `resetScroll` is Chelone's canonical name; adapters map it
 * to TanStack's `resetScroll` (identity) or react-router's inverted
 * `preventScrollReset` (plan §0b-4).
 */
export interface NavigateOpts {
  replace?: boolean;
  state?: unknown;
  resetScroll?: boolean;
}

/**
 * Parse a full path string into a `CheloneLocation`. Pure — no `window`.
 * `state`/`key` are threaded through from the caller (a router adapter owns the
 * history entry's state; a bare parse has none).
 */
export function parseLocation(
  to: string,
  state: unknown = null,
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
