/**
 * `usePrevNextController` — the neighbours of the ambient record in the list
 * the user came from. The Vue twin of `@chelone/react`'s `prev-next-hooks.ts`:
 * the list's persisted sort and filter, read from the page its query cached, or
 * from a `limit`-row fetch when that page cannot serve. Needs a record and a
 * resource in context.
 *
 * Composables over pure core functions rather than a `MicroStore` controller:
 * the record id changes each time the user steps.
 *
 * Divergences from the React twin: the options may be a ref or getter, and the
 * return is a reactive object. The ambient record is injected as a ref and read
 * inside computeds, so the neighbours follow it; `useRecordContext` unwraps
 * once, at call time. The store key is read once, in `setup`
 * (see `useStoreItem`).
 */

import {
  canUseCachedPage,
  type GetListResult,
  getListOptions,
  getPrevNextParams,
  type Identifier,
  type LooseRecord,
  type PrevNextOptions,
  type PrevNextStoredParams,
  resolvePrevNext,
} from "@chelone/core";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  computed,
  inject,
  type MaybeRefOrGetter,
  reactive,
  toValue,
} from "vue";
import { useCheloneContext } from "../context";
import { RecordContextKey } from "../record/record-context";
import { useResourceContext } from "../resource-context";
import { useCreatePath } from "../router";
import { useStoreItem } from "../store/use-store-item";

const FIVE_MINUTES = 5 * 60 * 1000;

export interface UsePrevNextControllerOptions extends PrevNextOptions {
  /** Step from this record instead of the ambient one. */
  record?: LooseRecord;
}

export interface UsePrevNextControllerReturn {
  hasPrev: boolean;
  hasNext: boolean;
  prevPath: string | undefined;
  nextPath: string | undefined;
  /** Position of the record in the whole list, from 0. */
  index: number | undefined;
  total: number | undefined;
  error: Error | null;
  isPending: boolean;
  isFetching: boolean;
}

export function usePrevNextController(
  options: MaybeRefOrGetter<UsePrevNextControllerOptions> = {},
): UsePrevNextControllerReturn {
  const opts = computed(() => toValue(options));
  const resource = useResourceContext();
  const ambient = inject(RecordContextKey, null);
  const record = computed(() => opts.value.record ?? ambient?.value);
  const ctx = useCheloneContext();
  const queryClient = useQueryClient();
  const createPath = useCreatePath();
  const [stored] = useStoreItem<PrevNextStoredParams>(
    `${opts.value.storeKey || resource}.listParams`,
  );
  const params = computed(() => getPrevNextParams(stored.value, opts.value));

  const cachedPage = computed(() =>
    resource
      ? queryClient.getQueryData<GetListResult>(
          getListOptions(ctx, resource, params.value.cached).queryKey,
        )
      : undefined,
  );
  const pagination = computed(
    () => params.value.cached.pagination as { page: number; perPage: number },
  );
  const canUseCache = computed(
    () =>
      record.value != null &&
      canUseCachedPage(
        record.value.id,
        cachedPage.value,
        pagination.value.page,
        pagination.value.perPage,
      ),
  );

  const query = useQuery(
    computed(() => ({
      ...getListOptions(ctx, resource ?? "", params.value.fetch),
      enabled: !!resource && record.value != null && !canUseCache.value,
      staleTime: FIVE_MINUTES,
    })),
  );

  const resolved = computed(() => {
    const list = canUseCache.value ? cachedPage.value : query.data.value;
    if (record.value == null || !list) return undefined;
    const { page, perPage } = pagination.value;
    return resolvePrevNext(
      record.value.id,
      list.data,
      list.total,
      canUseCache.value ? (page - 1) * perPage : 0,
    );
  });
  const prevId = computed(() => resolved.value?.prevId ?? null);
  const nextId = computed(() => resolved.value?.nextId ?? null);
  const pathTo = (id: Identifier | null) =>
    id == null
      ? undefined
      : createPath({ type: opts.value.linkType ?? "edit", resource, id });

  return reactive({
    hasPrev: computed(() => prevId.value != null),
    hasNext: computed(() => nextId.value != null),
    prevPath: computed(() => pathTo(prevId.value)),
    nextPath: computed(() => pathTo(nextId.value)),
    index: computed(() => resolved.value?.index),
    total: computed(() => resolved.value?.total),
    error: computed(() => (canUseCache.value ? null : query.error.value)),
    isPending: computed(
      () =>
        record.value == null || (!canUseCache.value && query.isPending.value),
    ),
    isFetching: computed(() => !canUseCache.value && query.isFetching.value),
  });
}
