import {
  type GetListParams,
  type GetManyParams,
  type GetOneParams,
  type RegisteredResources,
  type ResourceMap,
  type ResourceNameArg,
  subscribeLiveRecord,
  subscribeLiveRecords,
  subscribeLiveResource,
} from "@chelone/core";
import { useEffect } from "react";
import { useCheloneContext } from "./context";
import { useGetList, useGetMany, useGetOne } from "./hooks";

type LiveReadOptions = { enabled?: boolean; staleTime?: number };

/** `useGetList` that refetches when the resource changes or the connection returns. */
export function useGetListLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: GetListParams = {},
  options: LiveReadOptions = {},
) {
  const { dataProvider, queryClient } = useCheloneContext<TResources>();
  const result = useGetList<TResources, TName>(resource, params, options);
  const live = options.enabled !== false;

  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveResource(
      { dataProvider, queryClient },
      resource,
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource, live]);

  return result;
}

/** `useGetOne` that refetches when its record changes or the connection returns. */
export function useGetOneLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: GetOneParams,
  options: LiveReadOptions = {},
) {
  const { dataProvider, queryClient } = useCheloneContext<TResources>();
  const result = useGetOne<TResources, TName>(resource, params, options);
  const live = options.enabled !== false;
  const { id } = params;

  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveRecord(
      { dataProvider, queryClient },
      resource,
      id,
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource, id, live]);

  return result;
}

/** `useGetMany` that refetches when any listed record changes or the connection returns. */
export function useGetManyLive<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: GetManyParams,
  options: LiveReadOptions = {},
) {
  const { dataProvider, queryClient } = useCheloneContext<TResources>();
  const result = useGetMany<TResources, TName>(resource, params, options);
  const live = options.enabled !== false;
  // A new array holding the same ids must not resubscribe. `1` and `"1"` share a topic, so the key sorts as text.
  const idsKey = JSON.stringify(params.ids.map(String).sort());

  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveRecords(
      { dataProvider, queryClient },
      resource,
      JSON.parse(idsKey) as string[],
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource, idsKey, live]);

  return result;
}
