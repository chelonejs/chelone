import {
  MutationObserver,
  QueryObserver,
  type QueryObserverResult,
} from "@tanstack/query-core";
import { ValidationError } from "../data/errors";
import {
  createMutationOptions,
  deleteMutationOptions,
  type MutationMode,
  updateMutationOptions,
} from "../data/mutation-options";
import { type DataContext, getOneOptions } from "../data/query-options";
import type { CreateParams, DeleteParams, UpdateParams } from "../data/types";
import type { NotificationStore } from "../notification/notification-store";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import type { CheloneStore } from "../store/store";
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
  /** Keyed KV store — the delete controller cleans `${resource}.selectedIds` through it. */
  store?: CheloneStore;
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
  /**
   * OBSERVES the saved record WITHOUT replacing the default success handling
   * (runs before `onSuccess`/defaults). The P5 composed form controllers
   * reconcile form state with server truth through this — the save contract
   * itself resolves `FieldErrors | undefined`, never the record.
   */
  onSaved?: (record: TRecord) => void | Promise<void>;
  /** REPLACES the default success handling (notify + redirect request). */
  onSuccess?: (record: TRecord) => void | Promise<void>;
  /** REPLACES the default error handling (the http_error notify). */
  onError?: (error: unknown) => void | Promise<void>;
  meta?: unknown;
}

/** What `save`/`deleteOne` resolve with on `ValidationError` (the P5 form contract). */
type FieldErrors = Record<string, string | string[]>;

/** The slice of MutationObserver the shared flow needs — dodges class generic variance. */
interface MutationRunner<TRecord, TVariables> {
  mutate(variables: TVariables): Promise<TRecord>;
  reset(): void;
}

/** The caller-supplied handlers that REPLACE the default side effects (behavior 9). */
interface MutationFlowHandlers<TRecord> {
  /** Success OBSERVER — does not replace the defaults (see SaveOptions.onSaved). */
  onSaved?: (record: TRecord) => void | Promise<void>;
  onSuccess?: (record: TRecord) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

/** The saving-flag slice of controller state the shared flow writes into. */
interface SavingTarget {
  setState(patch: { saving: boolean }): void;
}

interface MutationFlowConfig<TRecord, TVariables> {
  ctx: {
    notifications?: NotificationStore;
    translate?: (key: string) => string;
  };
  resource: string;
  store: SavingTarget;
  isDestroyed(): boolean;
  /** The shared observer, non-null exactly while the controller is attached. */
  attachedObserver(): MutationRunner<TRecord, TVariables> | null;
  /** Builds a transient observer for detached (imperative) mutations. */
  makeObserver(): MutationRunner<TRecord, TVariables>;
  /** Notification event: `updated` | `created` | `deleted` (resource-scoped fallback). */
  successEvent: string;
  /** Default success side effects (redirect request, selection cleanup, …). */
  onDefaultSuccess(result: TRecord, variables: TVariables): void;
}

/**
 * THE shared save/delete flow (behaviors 9 + 10) for the edit, create and
 * delete controllers — one implementation of: the `saving` flag (counter-
 * guarded so overlapping mutations cannot flicker it false early), attached
 * vs transient observer selection, `ValidationError` RESOLVING with
 * `fieldErrors` (no notify), other errors notifying
 * `chelone.notification.http_error`, caller onSuccess/onError REPLACING the
 * defaults, the success notify, and MutationObserver release.
 *
 * MutationObserver RELEASE is explicit: mutate() attaches the observer to the
 * built Mutation (clearing its GC timeout) and query-core only detaches an
 * observer via onUnsubscribe (needs listeners), reset(), or a later mutate().
 * An unsubscribed observer therefore pins its last mutation (full data +
 * previousData) in the MutationCache forever unless we reset() — done in the
 * attach-cycle teardown and after each mutation settles (the finally block).
 */
function createMutationFlow<TRecord, TVariables>(
  config: MutationFlowConfig<TRecord, TVariables>,
): (
  variables: TVariables,
  handlers?: MutationFlowHandlers<TRecord>,
) => Promise<FieldErrors | undefined> {
  /** Overlapping mutations: `saving` goes false only when the LAST one settles. */
  let pending = 0;

  return async function run(variables, handlers = {}) {
    if (config.isDestroyed()) return undefined;
    // Detached (imperative use) a transient observer stands in — the mutation
    // side effects (invalidation, optimistic patching) live in the shared
    // mutation options, not in the observer.
    const observer = config.attachedObserver() ?? config.makeObserver();
    pending += 1;
    config.store.setState({ saving: true });
    let result: TRecord;
    try {
      result = await observer.mutate(variables);
    } catch (error) {
      if (handlers.onError) {
        // Replaces the default SIDE-EFFECT handling only — the fieldErrors
        // resolution below is the flow's return contract (P5 forms rely on it).
        await handlers.onError(error);
      } else if (!(error instanceof ValidationError)) {
        config.ctx.notifications?.notify("chelone.notification.http_error", {
          type: "error",
          messageArgs: { _: String(error) },
        });
      }
      // ValidationError: RESOLVE with the server's fieldErrors, no notify —
      // surfacing them on the form is the form layer's job (P5).
      return error instanceof ValidationError ? error.fieldErrors : undefined;
    } finally {
      pending -= 1;
      if (pending === 0) config.store.setState({ saving: false });
      // Release the settled mutation for MutationCache GC (see the doc block).
      // A transient observer (detached mutation, or an attach cycle that ended
      // mid-flight) is exclusively this call's — reset immediately. The SHARED
      // attached observer is reset only once no mutation is in flight: an
      // overlapping call's mutate() already detached the earlier mutation, so
      // nothing is retained in the meantime.
      if (observer !== config.attachedObserver() || pending === 0) {
        observer.reset();
      }
    }
    // The observer hook first: reconciliation (P5 form reset to server truth)
    // must land before any redirect request fires.
    if (handlers.onSaved) await handlers.onSaved(result);
    if (handlers.onSuccess) {
      await handlers.onSuccess(result);
      return undefined;
    }
    config.ctx.notifications?.notify(
      resolveNotificationKey(
        config.ctx.translate,
        config.resource,
        config.successEvent,
      ),
      { type: "success", messageArgs: { smart_count: 1 } },
    );
    config.onDefaultSuccess(result, variables);
    return undefined;
  };
}

export interface EditControllerOptions<TRecord> extends ShowControllerOptions {
  /**
   * Default: pessimistic (least surprise). `undoable` is orchestrated by the
   * adapter via `startUndoableMutation`, not by this controller's observer.
   */
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
 * subscribed — `saving` has a single writer (the shared mutation flow), which
 * also keeps the flag truthful for detached imperative saves. Save semantics
 * (validation errors, notify, release) live in `createMutationFlow`.
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

  const runSave = createMutationFlow<TRecord, UpdateParams<TRecord>>({
    ctx,
    resource,
    store,
    isDestroyed: () => destroyed,
    attachedObserver: () => mutationObserver,
    makeObserver: makeMutationObserver,
    successEvent: "updated",
    onDefaultSuccess: (result) => {
      options.onRedirect?.("list", resource, options.id, result);
    },
  });

  const save = async (
    data: Partial<TRecord>,
    saveOptions: SaveOptions<TRecord> = {},
  ): Promise<FieldErrors | undefined> => {
    if (destroyed) return undefined;
    const previousData = store.getSnapshot().record;
    // Transform priority: call-time > option > identity (behavior 9).
    const transform = saveOptions.transform ?? options.transform;
    const transformed = transform
      ? await transform(data, { previousData })
      : data;
    return runSave(
      {
        id: options.id,
        data: transformed,
        previousData,
        meta: saveOptions.meta,
      },
      saveOptions,
    );
  };

  return { ...store, save };
}

export interface CreateControllerState<TRecord> {
  /** The seed values for the not-yet-created record (`options.record`). */
  record: Partial<TRecord>;
  saving: boolean;
  /** Always false — a create has nothing to fetch. Kept for view parity with edit/show. */
  isPending: boolean;
}

export interface CreateControllerOptions<TRecord> {
  /** Seed values for the not-yet-created record (e.g. from a location state). */
  record?: Partial<TRecord>;
  transform?: SaveTransform<TRecord>;
  onRedirect?: RedirectRequest;
  /**
   * Reserved for signature parity with edit: create has no optimistic variant
   * (there is no cached record to patch before it exists), so this is
   * currently inert — creation is always pessimistic.
   */
  mutationMode?: MutationMode;
}

export interface CreateController<TRecord>
  extends MicroStore<CreateControllerState<TRecord>> {
  /**
   * Persists `data` through the create mutation. Same contract as edit's save
   * (transform priority, ValidationError resolving with `fieldErrors`), except
   * the transform receives NO `previousData` — there is none. Default success:
   * notify `created` + request a redirect to the EDIT of the new record.
   */
  save(
    data: Partial<TRecord>,
    options?: SaveOptions<TRecord>,
  ): Promise<Record<string, string | string[]> | undefined>;
}

/**
 * Vanilla create controller: no fetch AT ALL — construction is trivially
 * inert and `isPending` is false from birth. The only acquired resource is
 * the shared MutationObserver (onSubscribed attach / last-unsubscribe or
 * destroy release); detached saves use a transient observer, exactly like
 * edit. Save semantics live in `createMutationFlow`.
 */
export function createCreateController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: RecordControllerContext<TResources>,
  resource: TName,
  options: CreateControllerOptions<RecordOf<TResources, TName>> = {},
): CreateController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;

  const store = createMicroStore<CreateControllerState<TRecord>>(
    { record: options.record ?? {}, saving: false, isPending: false },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  const makeMutationObserver = () =>
    new MutationObserver(ctx.queryClient, createMutationOptions(ctx, resource));

  /** Non-null exactly while attached. */
  let mutationObserver: ReturnType<typeof makeMutationObserver> | null = null;

  function acquire(): () => void {
    const observer = makeMutationObserver();
    mutationObserver = observer;
    return () => {
      // Detach the observer from its current mutation so the MutationCache
      // can GC it (see the createMutationFlow doc block).
      observer.reset();
      mutationObserver = null;
    };
  }

  const runSave = createMutationFlow<TRecord, CreateParams<TRecord>>({
    ctx,
    resource,
    store,
    isDestroyed: () => destroyed,
    attachedObserver: () => mutationObserver,
    makeObserver: makeMutationObserver,
    successEvent: "created",
    onDefaultSuccess: (result) => {
      // Redirect matrix: create -> EDIT of the new record (behavior 10).
      options.onRedirect?.(
        "edit",
        resource,
        (result as ResourceRecord).id,
        result,
      );
    },
  });

  const save = async (
    data: Partial<TRecord>,
    saveOptions: SaveOptions<TRecord> = {},
  ): Promise<FieldErrors | undefined> => {
    if (destroyed) return undefined;
    // Transform priority: call-time > option > identity (behavior 9); a
    // create transform gets NO previousData — the record does not exist yet.
    const transform = saveOptions.transform ?? options.transform;
    const transformed = transform ? await transform(data) : data;
    return runSave({ data: transformed, meta: saveOptions.meta }, saveOptions);
  };

  return { ...store, save };
}

export interface DeleteControllerState {
  /** True while a delete mutation is in flight (same field as edit/create). */
  saving: boolean;
}

export interface DeleteControllerOptions {
  onRedirect?: RedirectRequest;
}

export interface DeleteOneOptions<TRecord> {
  /** Forwarded to the DataProvider (some backends need the full record). */
  previousData?: TRecord;
  /** REPLACES the default success handling (notify + redirect + selection cleanup). */
  onSuccess?: (record: TRecord) => void | Promise<void>;
  /** REPLACES the default error handling (the http_error notify). */
  onError?: (error: unknown) => void | Promise<void>;
  meta?: unknown;
}

export interface DeleteController<TRecord>
  extends MicroStore<DeleteControllerState> {
  /**
   * Deletes the record. Same error contract as edit's save: resolves with the
   * server's `fieldErrors` on `ValidationError` (no notify), notifies
   * `http_error` otherwise — it never rejects for provider errors. Default
   * success: notify `deleted` + request a list redirect + strip the id from
   * the `${resource}.selectedIds` KV selection (immutably, when present).
   */
  deleteOne(
    id: Identifier,
    options?: DeleteOneOptions<TRecord>,
  ): Promise<Record<string, string | string[]> | undefined>;
}

/**
 * Vanilla delete controller: no fetch — like create, construction is
 * trivially inert and the only acquired resource is the shared
 * MutationObserver. Delete semantics live in `createMutationFlow`; the
 * delete-specific default success additionally cleans the KV selection so a
 * deleted row cannot linger selected in list views.
 */
export function createDeleteController<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: RecordControllerContext<TResources>,
  resource: TName,
  options: DeleteControllerOptions = {},
): DeleteController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;

  const store = createMicroStore<DeleteControllerState>(
    { saving: false },
    { onSubscribed: acquire },
  );

  let destroyed = false;
  store.onDestroy(() => {
    destroyed = true;
  });

  const makeMutationObserver = () =>
    new MutationObserver(ctx.queryClient, deleteMutationOptions(ctx, resource));

  /** Non-null exactly while attached. */
  let mutationObserver: ReturnType<typeof makeMutationObserver> | null = null;

  function acquire(): () => void {
    const observer = makeMutationObserver();
    mutationObserver = observer;
    return () => {
      // Detach the observer from its current mutation so the MutationCache
      // can GC it (see the createMutationFlow doc block).
      observer.reset();
      mutationObserver = null;
    };
  }

  /** Strips the REQUESTED id from the KV selection — immutably (fresh array). */
  const stripSelection = (id: Identifier): void => {
    const kv = ctx.store;
    if (!kv) return;
    const key = `${resource}.selectedIds`;
    const selection = kv.getItem<Identifier[]>(key);
    if (!selection?.includes(id)) return;
    kv.setItem(
      key,
      selection.filter((existing) => existing !== id),
    );
  };

  const runDelete = createMutationFlow<TRecord, DeleteParams<TRecord>>({
    ctx,
    resource,
    store,
    isDestroyed: () => destroyed,
    attachedObserver: () => mutationObserver,
    makeObserver: makeMutationObserver,
    successEvent: "deleted",
    onDefaultSuccess: (_result, variables) => {
      // Redirect matrix: delete -> list + selection cleanup (behavior 10).
      options.onRedirect?.("list", resource);
      stripSelection(variables.id);
    },
  });

  const deleteOne = async (
    id: Identifier,
    deleteOptions: DeleteOneOptions<TRecord> = {},
  ): Promise<FieldErrors | undefined> =>
    runDelete(
      {
        id,
        previousData: deleteOptions.previousData,
        meta: deleteOptions.meta,
      },
      deleteOptions,
    );

  return { ...store, deleteOne };
}
