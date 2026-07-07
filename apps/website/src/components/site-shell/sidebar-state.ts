/**
 * Shared, persisted sidebar open/collapsed state.
 *
 * shadcn's `SidebarProvider` writes the `sidebar_state` cookie on toggle but
 * relies on the server reading it back into `defaultOpen` — which a client-only
 * SPA never does, so the state was lost on reload. And docs/demo each mount
 * their own `SidebarProvider`, so client-nav between them reset it.
 *
 * This module-level store is the single source of truth: it outlives any one
 * route's React tree (so docs ⇄ demo navigation keeps the same value) and seeds
 * from / writes to the same `sidebar_state` cookie shadcn uses (so it survives
 * reloads). `SiteShell` consumes it via `useSyncExternalStore` and drives
 * `SidebarProvider` as a controlled value.
 */
const COOKIE_NAME = "sidebar_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week, matching shadcn

function readCookie(): boolean {
  if (typeof document === "undefined") return true; // SSR/prerender default
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
  return match ? match[1] === "true" : true;
}

let open = readCookie();
const listeners = new Set<() => void>();

export function getSidebarOpen(): boolean {
  return open;
}

/** Server/prerender snapshot — always open, to keep hydration deterministic. */
export function getSidebarOpenServer(): boolean {
  return true;
}

export function setSidebarOpen(value: boolean): void {
  if (value === open) return;
  open = value;
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`;
  }
  for (const listener of listeners) listener();
}

export function subscribeSidebar(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
