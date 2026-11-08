import { QueryObserver, type QueryObserverResult } from "@tanstack/query-core";
import { getManyReferenceOptions } from "../data/query-options";
import type {
  FilterPayload,
  GetManyReferenceResult,
  SortPayload,
} from "../data/types";
import type { Identifier } from "../resource/identifier";
import type { LooseRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { ListControllerContext } from "./list-controller";

export interface ReferenceOneControllerOptions<TRecord = LooseRecord> {
  /** The field on the referenced-FROM resource that holds the foreign key. */
  target: string;
  /** The value `target` must equal. Null or undefined fetches nothing. */
  id: Identifier | null | undefined;
  /** Decides which row is first when several match. Omitted: the provider's order. */
  sort?: SortPayload | SortPayload[];
  /** Narrows the lookup, e.g. to one kind of row. Default: no filter. */
  filter?: FilterPayload<TRecord>;
  /** Gates the fetch. A disabled lookup with no cached data reads `isPending: true`. Default true. */
  enabled?: boolean;
}

export interface ReferenceOneControllerState<TRecord> {
  /** The first matching row; undefined while pending, on error, or when no row matches. */
  referenceRecord: TRecord | undefined;
  /** True until the first result settles. False at once when `id` is null or undefined. */
  isPending: boolean;
  /** True during any fetch, the first one included. */
  isFetching: boolean;
  /** The provider error of the last fetch, else null. */
  error: Error | null;
}

export interface ReferenceOneController<TRecord>
  extends MicroStore<ReferenceOneControllerState<TRecord>> {
  refetch(): void;
}

/**
 * The first row whose `target` equals `id`, read through `getManyReference`
 * as a page of one. Errors are exposed in state and never notified: the field
 * shows an error node instead.
 *
 * Lifecycle (Task 4R): construction is inert; the observer is acquired on the
 * first subscriber and released on the last unsubscribe.
 */
export function createReferenceOneController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: ListControllerContext<TResources>,
  reference: TName,
  options: ReferenceOneControllerOptions<RecordOf<TResources, TName>>,
): ReferenceOneController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type ReferenceResult = GetManyReferenceResult<TRecord>;

  const targetValue = options.id ?? undefined;

  const store = createMicroStore<ReferenceOneControllerState<TRecord>>(
    {
      referenceRecord: undefined,
      isPending: targetValue !== undefined,
      isFetching: false,
      error: null,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  let observer: QueryObserver<ReferenceResult, Error> | null = null;

  const onResult = (
    result: QueryObserverResult<ReferenceResult, Error>,
  ): void => {
    store.setState({
      referenceRecord: result.data?.data[0],
      isPending: result.isPending,
      isFetching: result.isFetching,
      error: result.error ?? null,
    });
  };

  function acquire(): (() => void) | undefined {
    if (targetValue === undefined) return undefined;
    const attached = new QueryObserver<ReferenceResult, Error>(
      ctx.queryClient,
      {
        ...getManyReferenceOptions(ctx, reference, {
          target: options.target,
          id: targetValue,
          pagination: { page: 1, perPage: 1 },
          ...(options.sort === undefined ? {} : { sort: options.sort }),
          filter: { ...(options.filter ?? {}) },
        }),
        retry: false,
        enabled: options.enabled ?? true,
      },
    );
    observer = attached;
    const unsubscribe = attached.subscribe(onResult);
    onResult(attached.getCurrentResult());
    return () => {
      unsubscribe();
      observer = null;
    };
  }

  const refetch = (): void => {
    if (destroyed) return;
    void observer?.refetch();
  };

  return { ...store, refetch };
}
