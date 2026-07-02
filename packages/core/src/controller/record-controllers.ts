import {
  MutationObserver,
  QueryObserver,
  type QueryObserverResult,
} from "@tanstack/query-core";
import { ValidationError } from "../data/errors";
import {
  type MutationMode,
  updateMutationOptions,
} from "../data/mutation-options";
import { type DataContext, getOneOptions } from "../data/query-options";
import type { NotificationStore } from "../notification/notification-store";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import { resolveNotificationKey } from "./translate-fallback";

export interface ShowControllerState<TRecord> {
  record: TRecord | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
}

export interface EditControllerState<TRecord>
  extends ShowControllerState<TRecord> {
  saving: boolean;
}

export type RedirectTarget = "list" | "edit" | "show" | "create";

/**
 * Controllers NEVER touch a router or window — navigation intent surfaces as
 * this callback and the adapter (or app) decides what to do with it.
 */
export type RedirectRequest = (
  target: RedirectTarget,
  resource: string,
  id?: Identifier,
  data?: unknown,
) => void;

export interface RecordControllerContext<
  TResources extends ResourceMap = ResourceMap,
> extends DataContext<TResources> {
  notifications?: NotificationStore;
  translate?: (key: string) => string;
}

export interface ShowControllerOptions {
  id: Identifier;
  enabled?: boolean;
  onRedirect?: RedirectRequest;
}

/**
 * Reshapes the submitted data before it reaches the DataProvider. Async
 * supported. Edit transforms receive `{ previousData }` (the fetched record).
 */
export type SaveTransform<TRecord> = (
  data: Partial<TRecord>,
  extra?: { previousData?: TRecord },
) => Partial<TRecord> | Promise<Partial<TRecord>>;

export interface SaveOptions<TRecord> {
  /** Call-time transform — takes priority over the controller-level one. */
  transform?: SaveTransform<TRecord>;
  /** REPLACES the default success handling (notify + redirect request). */
  onSuccess?: (record: TRecord) => void | Promise<void>;
  /** REPLACES the default error handling (the http_error notify). */
  onError?: (error: unknown) => void | Promise<void>;
  meta?: unknown;
}

export interface EditControllerOptions<TRecord> extends ShowControllerOptions {
  /** Default: pessimistic (least surprise). 'undoable' does not exist yet. */
  mutationMode?: MutationMode;
  transform?: SaveTransform<TRecord>;
}

export type ShowController<TRecord> = MicroStore<ShowControllerState<TRecord>>;

export interface EditController<TRecord>
  extends MicroStore<EditControllerState<TRecord>> {
  /**
   * Persists `data` through the update mutation. Resolves with the server's
   * `fieldErrors` on `ValidationError` (the P5 form contract), `undefined`
   * otherwise — it never rejects for provider errors. Works attached (the
   * normal case) AND detached (imperative use, via a transient observer).
   */
  save(
    data: Partial<TRecord>,
    options?: SaveOptions<TRecord>,
  ): Promise<Record<string, string | string[]> | undefined>;
}

/** The show-shaped slice of state the shared fetch wiring writes into. */
interface RecordFetchTarget<TRecord> {
  setState(patch: Partial<ShowControllerState<TRecord>>): void;
}

/**
 * Shared getOne wiring for the edit + show controllers: returns the acquire()
 * used as the micro-store's `onSubscribed` (post-4R pattern — construction is
 * INERT; the QueryObserver exists only while the store has subscribers).
 *
 * ra-core behavior 8: `retry: false`; a fetched record whose id does not
 * LOOSELY match the requested id becomes an error state (a local consistency
 * error — no notify); an actual fetch error notifies
 * `chelone.notification.item_doesnt_exist` and requests a list redirect.
 */
function createRecordFetch<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: RecordControllerContext<TResources>,
  resource: TName,
  options: ShowControllerOptions,
  store: RecordFetchTarget<RecordOf<TResources, TName>>,
): () => () => void {
  type TRecord = RecordOf<TResources, TName>;

  let lastNotifiedError: unknown = null;
  /** Cached so repeated observer emissions keep a STABLE error reference. */
  let mismatchError: Error | null = null;

  const onResult = (result: QueryObserverResult<TRecord, Error>): void => {
    const record = result.data;
    const recordId =
      record === undefined ? undefined : (record as ResourceRecord).id;
    if (record !== undefined && String(recordId) !== String(options.id)) {
      mismatchError ??= new Error(
        `createRecordFetch: fetched record id (${String(recordId)}) does not match the requested id (${String(options.id)})`,
      );
      store.setState({
        record: undefined,
        isPending: false,
        isFetching: result.isFetching,
        error: mismatchError,
      });
      return;
    }
    mismatchError = null;
    store.setState({
      record,
      isPending: result.isPending,
      isFetching: result.isFetching,
      error: result.error ?? null,
    });
    if (result.error) {
      if (result.error !== lastNotifiedError) {
        lastNotifiedError = result.error;
        ctx.notifications?.notify("chelone.notification.item_doesnt_exist", {
          type: "error",
        });
        options.onRedirect?.("list", resource);
      }
    } else {
      lastNotifiedError = null;
    }
  };

  return function acquire() {
    const observer = new QueryObserver<TRecord, Error>(ctx.queryClient, {
      ...getOneOptions(ctx, resource, { id: options.id }),
      retry: false,
      enabled: options.enabled ?? true,
    });
    const unsubscribe = observer.subscribe(onResult);
    // Sync the optimistic first result (covers cached data + enabled: false).
    onResult(observer.getCurrentResult());
    return unsubscribe;
  };
}

/**
 * Vanilla show controller: one getOne QueryObserver mapped into a micro-store.
 * Construction is INERT; acquisition on first subscribe, release on last
 * unsubscribe AND on destroy-while-attached (micro-store lifecycle).
 */
export function createShowController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: RecordControllerContext<TResources>,
  resource: TName,
  options: ShowControllerOptions,
): ShowController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;

  // Hoisted with an explicit return type: `acquireFetch` is assigned right
  // below, and onSubscribed can only fire after this factory has returned.
  function acquire(): () => void {
    return acquireFetch();
  }
  const store = createMicroStore<ShowControllerState<TRecord>>(
    { record: undefined, isPending: true, isFetching: false, error: null },
    { onSubscribed: acquire },
  );
  const acquireFetch = createRecordFetch(ctx, resource, options, store);
  return store;
}

/**
 * Vanilla edit controller: the show-shaped record fetch plus a `save` flow
 * backed by a MutationObserver over `updateMutationOptions`.
 *
 * Lifecycle: both observers are ACQUIRED in the micro-store's onSubscribed
 * and released on last-unsubscribe/destroy. The MutationObserver is not
 * subscribed — `saving` has a single writer (save(), counter-guarded so
 * overlapping saves cannot flicker it false early), which also keeps the
 * flag truthful for detached imperative saves.
 *
 * MutationObserver RELEASE is explicit: mutate() attaches the observer to the
 * built Mutation (clearing its GC timeout) and query-core only detaches an
 * observer via onUnsubscribe (needs listeners), reset(), or a later mutate().
 * An unsubscribed observer therefore pins its last mutation (full data +
 * previousData) in the MutationCache forever unless we reset() — done in the
 * attach-cycle teardown and after each save settles (see the finally block).
 */
export function createEditController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: RecordControllerContext<TResources>,
  resource: TName,
  options: EditControllerOptions<RecordOf<TResources, TName>>,
): EditController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;

  const store = createMicroStore<EditControllerState<TRecord>>(
    {
      record: undefined,
      isPending: true,
      isFetching: false,
      error: null,
      saving: false,
    },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  const acquireFetch = createRecordFetch(ctx, resource, options, store);

  const makeMutationObserver = () =>
    new MutationObserver(
      ctx.queryClient,
      updateMutationOptions(ctx, resource, {
        mutationMode: options.mutationMode,
      }),
    );

  /** Non-null exactly while attached. */
  let mutationObserver: ReturnType<typeof makeMutationObserver> | null = null;

  function acquire(): () => void {
    const observer = makeMutationObserver();
    mutationObserver = observer;
    const releaseFetch = acquireFetch();
    return () => {
      releaseFetch();
      // Detach the observer from its current mutation so the MutationCache
      // can GC it (immediately if settled; after settle if still in flight).
      // Without this, a save's mutation is retained forever (see the
      // controller doc block). Safe mid-save: the mutate() promise and the
      // mutation-level side effects live on the Mutation, not the observer.
      observer.reset();
      mutationObserver = null;
    };
  }

  /** Overlapping saves: `saving` goes false only when the LAST one settles. */
  let pendingSaves = 0;

  const save = async (
    data: Partial<TRecord>,
    saveOptions: SaveOptions<TRecord> = {},
  ): Promise<Record<string, string | string[]> | undefined> => {
    if (destroyed) return undefined;
    const previousData = store.getSnapshot().record;
    // Transform priority: call-time > option > identity (behavior 9).
    const transform = saveOptions.transform ?? options.transform;
    const transformed = transform
      ? await transform(data, { previousData })
      : data;
    // Detached (imperative use) a transient observer stands in — the mutation
    // side effects (invalidation, optimistic patching) live in the shared
    // mutation options, not in the observer.
    const observer = mutationObserver ?? makeMutationObserver();
    pendingSaves += 1;
    store.setState({ saving: true });
    let result: TRecord;
    try {
      result = await observer.mutate({
        id: options.id,
        data: transformed,
        previousData,
        meta: saveOptions.meta,
      });
    } catch (error) {
      if (saveOptions.onError) {
        // Replaces the default SIDE-EFFECT handling only — the fieldErrors
        // resolution below is save()'s return contract (P5 forms rely on it).
        await saveOptions.onError(error);
      } else if (!(error instanceof ValidationError)) {
        ctx.notifications?.notify("chelone.notification.http_error", {
          type: "error",
          messageArgs: { _: String(error) },
        });
      }
      // ValidationError: RESOLVE with the server's fieldErrors, no notify —
      // surfacing them on the form is the form layer's job (P5).
      return error instanceof ValidationError ? error.fieldErrors : undefined;
    } finally {
      pendingSaves -= 1;
      if (pendingSaves === 0) store.setState({ saving: false });
      // Release the settled mutation for MutationCache GC (see the controller
      // doc block). A transient observer (detached save, or an attach cycle
      // that ended mid-save) is exclusively this save's — reset immediately.
      // The SHARED attached observer is reset only once no save is in flight:
      // an overlapping save's mutate() already detached the earlier mutation,
      // so nothing is retained in the meantime.
      if (observer !== mutationObserver || pendingSaves === 0) {
        observer.reset();
      }
    }
    if (saveOptions.onSuccess) {
      await saveOptions.onSuccess(result);
      return undefined;
    }
    ctx.notifications?.notify(
      resolveNotificationKey(ctx.translate, resource, "updated"),
      { type: "success", messageArgs: { smart_count: 1 } },
    );
    options.onRedirect?.("list", resource, options.id, result);
    return undefined;
  };

  return { ...store, save };
}
