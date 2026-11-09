import {
  type GetListParams,
  type GetManyParams,
  type GetOneParams,
  type Identifier,
  type RegisteredResources,
  type ResourceMap,
  type ResourceNameArg,
  subscribeLiveRecord,
  subscribeLiveRecords,
  subscribeLiveResource,
} from "@chelone/core";
import { computed, type MaybeRefOrGetter, toValue, watchEffect } from "vue";
import { useCheloneContext } from "../context";
import { useGetList, useGetMany, useGetOne } from "../data/queries";

interface LiveReadOptions {
  /** Gates the subscription as well as the fetch. */
  enabled?: MaybeRefOrGetter<boolean>;
}

const isEnabled = (enabled: LiveReadOptions["enabled"]) =>
  enabled === undefined || toValue(enabled);

/** `useGetList`, kept fresh: refetches when the resource changes or the connection comes back. */
export function useGetListLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: MaybeRefOrGetter<TName & ResourceNameArg<TResources, TName>>,
  params: MaybeRefOrGetter<GetListParams> = {},
  options: LiveReadOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const query = useGetList<TResources, TName>(resource, params, options);
  watchEffect((onCleanup) => {
    if (!isEnabled(options.enabled)) return;
    onCleanup(subscribeLiveResource(ctx, toValue(resource)).stop);
  });
  return query;
}

/** `useGetOne`, kept fresh: refetches when the record changes or the connection comes back. */
export function useGetOneLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: MaybeRefOrGetter<GetOneParams>,
  options: LiveReadOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const query = useGetOne<TResources, TName>(resource, params, options);
  watchEffect((onCleanup) => {
    if (!isEnabled(options.enabled)) return;
    onCleanup(subscribeLiveRecord(ctx, resource, toValue(params).id).stop);
  });
  return query;
}

/** `useGetMany`, kept fresh: refetches when any listed record changes or the connection comes back. */
export function useGetManyLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: MaybeRefOrGetter<GetManyParams>,
  options: LiveReadOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const query = useGetMany<TResources, TName>(resource, params, options);

  // A new array with the same ids must not tear the subscription down: the
  // computed hands back the previous array while the sorted ids are unchanged.
  let previous: { key: string; ids: Identifier[] } | undefined;
  const ids = computed(() => {
    const next = toValue(params).ids;
    const key = JSON.stringify(next.map(String).sort());
    if (previous?.key !== key) previous = { key, ids: next };
    return previous.ids;
  });

  watchEffect((onCleanup) => {
    if (!isEnabled(options.enabled)) return;
    onCleanup(subscribeLiveRecords(ctx, resource, ids.value).stop);
  });
  return query;
}
