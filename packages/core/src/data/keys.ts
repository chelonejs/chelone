import type { Identifier } from "../resource/identifier";
import type {
  GetListParams,
  GetManyReferenceParams,
  InfiniteListParams,
} from "./types";

/** Root key for a resource — invalidation scope for everything under it. */
export function resourceKey(resource: string) {
  return [resource] as const;
}

export function listKey(resource: string, params: GetListParams = {}) {
  return [resource, "getList", params] as const;
}

export function infiniteListKey(resource: string, params: InfiniteListParams) {
  return [resource, "getInfiniteList", params] as const;
}

/** Partial-match key covering every `getInfiniteList` cache variant of a resource. */
export function infiniteListKeyPrefix(resource: string) {
  return [resource, "getInfiniteList"] as const;
}

export function oneKey(
  resource: string,
  params: { id: Identifier; meta?: unknown },
) {
  return [
    resource,
    "getOne",
    params.meta === undefined
      ? { id: String(params.id) }
      : { id: String(params.id), meta: params.meta },
  ] as const;
}

export function manyKey(
  resource: string,
  params: { ids: Identifier[]; meta?: unknown },
) {
  const ids = params.ids.map(String).sort();
  return [
    resource,
    "getMany",
    params.meta === undefined ? { ids } : { ids, meta: params.meta },
  ] as const;
}

/** Partial-match key covering every `getMany` cache variant of a resource. */
export function manyKeyPrefix(resource: string) {
  return [resource, "getMany"] as const;
}

export function manyReferenceKey(
  resource: string,
  params: GetManyReferenceParams,
) {
  return [resource, "getManyReference", params] as const;
}
