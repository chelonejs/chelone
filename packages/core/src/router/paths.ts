/**
 * Pure, dependency-free path construction for the resource routing engine.
 * SSR-safe: no `window`, no router library. Parity target: ra-core's
 * `useCreatePath` (plan §0a-11), but framework-neutral so any adapter reuses it.
 */

import type { Identifier } from "../resource/identifier";

/** The link intents `createPath` understands. A custom `string` is verbatim. */
export type CreatePathType = "list" | "create" | "edit" | "show" | string;

export interface CreatePathParams {
  /** `list`/`create`/`edit`/`show`, or a custom path string returned verbatim. */
  type: CreatePathType;
  /** The resource name — required for the four known intents. */
  resource?: string;
  /** The record id — `encodeURIComponent`d; `null`/`undefined` → list fallback. */
  id?: Identifier | null;
}

/**
 * Collapse runs of `/` into a single `/`, WITHOUT touching a `scheme://`
 * authority separator. Matches ra-core's `removeDoubleSlashes` for internal
 * paths while staying safe on the rare absolute URL.
 */
export function removeDoubleSlashes(path: string): string {
  const schemeMatch = path.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//);
  if (schemeMatch) {
    const prefix = schemeMatch[0];
    return prefix + path.slice(prefix.length).replace(/\/\/+/g, "/");
  }
  return path.replace(/\/\/+/g, "/");
}

/**
 * Prefix `path` with `basename`, collapsing the seam and any trailing basename
 * slash. An empty basename is a no-op. The result is always slash-normalized.
 */
export function joinBasename(path: string, basename = ""): string {
  const joined = basename ? `${basename}/${path}` : path;
  const collapsed = removeDoubleSlashes(joined);
  // Drop a trailing slash on a non-root path so joining a basename to the
  // root (`joinBasename('/', '/admin')`) canonicalizes to `/admin`, not `/admin/`.
  return collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
}

/**
 * Build a route path for a link intent (parity §0a-11):
 * `list`→`/res`, `create`→`/res/create`, `edit`→`/res/:id`, `show`→`/res/:id/show`.
 * `id==null` on `edit`/`show` falls back to the list path. The id is
 * `encodeURIComponent`d, and double slashes are removed from these four known
 * intents. A custom string `type` is returned COMPLETELY verbatim — NO basename
 * prefix, NO slash collapse — matching ra-core's `useCreatePath` `default`
 * branch (the author owns the full, final path).
 */
export function createPath(params: CreatePathParams, basename = ""): string {
  const { type, resource, id } = params;

  switch (type) {
    case "list":
      return joinBasename(`/${resource}`, basename);
    case "create":
      return joinBasename(`/${resource}/create`, basename);
    case "edit": {
      if (id == null) return joinBasename(`/${resource}`, basename);
      return joinBasename(`/${resource}/${encodeURIComponent(id)}`, basename);
    }
    case "show": {
      if (id == null) return joinBasename(`/${resource}`, basename);
      return joinBasename(
        `/${resource}/${encodeURIComponent(id)}/show`,
        basename,
      );
    }
    default:
      // A custom path string — returned COMPLETELY verbatim, matching ra-core's
      // `useCreatePath` `default: return type;` (react-admin
      // packages/ra-core/src/routing/useCreatePath.ts). NO basename prefix and
      // NO slash collapse: the author supplies the full, final path (basename
      // included) and owns it entirely. See parity §0a-11.
      return type;
  }
}
