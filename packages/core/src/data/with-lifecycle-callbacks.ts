import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type {
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyReferenceParams,
  GetManyReferenceResult,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
} from "./types";

type MaybePromise<T> = T | Promise<T>;

/**
 * The hooks that do not depend on a record type, so a named handler and the
 * `"*"` handler declare them once.
 */
interface RecordFreeCallbacks<TResources extends ResourceMap> {
  beforeGetList?(
    params: GetListParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetListParams>;

  beforeGetOne?(
    params: GetOneParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetOneParams>;

  beforeGetMany?(
    params: GetManyParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyParams>;

  beforeGetManyReference?(
    params: GetManyReferenceParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyReferenceParams>;

  beforeDeleteMany?(
    params: DeleteManyParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteManyParams>;

  afterUpdateMany?(
    result: UpdateManyResult,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateManyResult>;

  afterDeleteMany?(
    result: DeleteManyResult,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteManyResult>;
}

/**
 * The optional hooks of one handler, typed for records of type `TRecord`.
 * Every callback must return the value: `undefined` is not "unchanged".
 * `dataProvider` is the provider passed to `withLifecycleCallbacks`, so
 * calling it never re-enters the callbacks.
 */
export interface LifecycleCallbacks<
  TResources extends ResourceMap,
  TRecord extends LooseRecord,
> extends RecordFreeCallbacks<TResources> {
  afterGetList?(
    result: GetListResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetListResult<TRecord>>;

  afterGetOne?(
    result: GetOneResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetOneResult<TRecord>>;

  beforeCreate?(
    params: CreateParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<CreateParams<TRecord>>;
  afterCreate?(
    result: CreateResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<CreateResult<TRecord>>;

  beforeUpdate?(
    params: UpdateParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateParams<TRecord>>;
  afterUpdate?(
    result: UpdateResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateResult<TRecord>>;

  beforeDelete?(
    params: DeleteParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteParams<TRecord>>;
  afterDelete?(
    result: DeleteResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteResult<TRecord>>;

  afterGetMany?(
    result: GetManyResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyResult<TRecord>>;

  afterGetManyReference?(
    result: GetManyReferenceResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyReferenceResult<TRecord>>;

  beforeUpdateMany?(
    params: UpdateManyParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateManyParams<TRecord>>;
}

/**
 * The hooks of the `"*"` handler. Each one is generic over the record, so it
 * hands back the record type it received: the callback runs for every
 * resource and cannot name one.
 */
export interface WildcardCallbacks<TResources extends ResourceMap>
  extends RecordFreeCallbacks<TResources> {
  afterGetList?<TRecord extends ResourceRecord>(
    result: GetListResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetListResult<TRecord>>;

  afterGetOne?<TRecord extends ResourceRecord>(
    result: GetOneResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetOneResult<TRecord>>;

  beforeCreate?<TRecord extends ResourceRecord>(
    params: CreateParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<CreateParams<TRecord>>;
  afterCreate?<TRecord extends ResourceRecord>(
    result: CreateResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<CreateResult<TRecord>>;

  beforeUpdate?<TRecord extends ResourceRecord>(
    params: UpdateParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateParams<TRecord>>;
  afterUpdate?<TRecord extends ResourceRecord>(
    result: UpdateResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateResult<TRecord>>;

  beforeDelete?<TRecord extends ResourceRecord>(
    params: DeleteParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteParams<TRecord>>;
  afterDelete?<TRecord extends ResourceRecord>(
    result: DeleteResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteResult<TRecord>>;

  afterGetMany?<TRecord extends ResourceRecord>(
    result: GetManyResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyResult<TRecord>>;

  afterGetManyReference?<TRecord extends ResourceRecord>(
    result: GetManyReferenceResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyReferenceResult<TRecord>>;

  beforeUpdateMany?<TRecord extends ResourceRecord>(
    params: UpdateManyParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateManyParams<TRecord>>;
}

/** One handler per registry resource, typed with that resource's record. */
type HandlerMap<TResources extends ResourceMap> = {
  [N in keyof TResources & string]: { resource: N } & LifecycleCallbacks<
    TResources,
    RecordOf<TResources, N>
  >;
};

type WildcardHandler<TResources extends ResourceMap> = {
  resource: "*";
} & WildcardCallbacks<TResources>;

/**
 * A handler: the callbacks for one registry resource, typed with that
 * resource's record, or for `"*"` (every resource), which hands back the
 * record type it receives.
 */
export type LifecycleHandler<TResources extends ResourceMap = ResourceMap> =
  | HandlerMap<TResources>[keyof TResources & string]
  | WildcardHandler<TResources>;

type Hook<TValue> = (value: TValue) => MaybePromise<TValue>;

/**
 * Runs `befores` over `params` in order, calls the provider with the result,
 * then runs `afters` over the provider's result. A rejecting `call` skips the
 * `afters`. With no hooks at all the provider is called directly.
 */
function runChain<TParams, TResult>(
  befores: Hook<TParams>[],
  call: (params: TParams) => Promise<TResult>,
  afters: Hook<TResult>[],
  params: TParams,
): Promise<TResult> {
  if (befores.length === 0 && afters.length === 0) return call(params);
  return (async () => {
    let nextParams = params;
    for (const before of befores) nextParams = await before(nextParams);
    let result = await call(nextParams);
    for (const after of afters) result = await after(result);
    return result;
  })();
}

/**
 * Wraps `dataProvider` with before/after hooks per resource, without touching
 * it. For a call on resource `r`, the handlers whose `resource` is `r` or
 * `"*"` run in array order: the `before` chain feeds the provider and the
 * `after` chain feeds the caller. A rejecting provider skips the `after`
 * callbacks. A verb with no matching callback calls the provider directly.
 */
export function withLifecycleCallbacks<
  TResources extends ResourceMap = ResourceMap,
>(
  dataProvider: DataProvider<TResources>,
  handlers: LifecycleHandler<TResources>[],
): DataProvider<TResources> {
  // The handler list is read once here: later changes to the array are ignored.
  const snapshot = [...handlers];

  const handlersFor = <TName extends keyof TResources & string>(
    resource: TName,
  ) =>
    snapshot.filter(
      (h): h is HandlerMap<TResources>[TName] | WildcardHandler<TResources> =>
        h.resource === resource || h.resource === "*",
    );

  // Calls through the handler so a method keeps its `this`. `TValue` comes
  // from the chain the hook joins: it cannot be inferred from the `"*"`
  // callbacks, which are generic.
  const hook = <TValue>(
    handler: object,
    callback: NoInfer<
      | ((
          value: TValue,
          dataProvider: DataProvider<TResources>,
        ) => MaybePromise<TValue>)
      | undefined
    >,
  ): Hook<TValue>[] =>
    callback ? [(value) => callback.call(handler, value, dataProvider)] : [];

  // Spelled out verb by verb, as `combineDataProviders` does: the compiler
  // then fails if `DataProvider` gains a verb.
  // Extra properties of the provider survive: only the nine verbs are wrapped.
  return {
    ...dataProvider,
    getList: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetListParams,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        GetListParams,
        GetListResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeGetList)),
        (nextParams) => dataProvider.getList(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterGetList)),
        params,
      );
    },
    getOne: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetOneParams,
    ) => {
      const matching = handlersFor(resource);
      return runChain<GetOneParams, GetOneResult<RecordOf<TResources, TName>>>(
        matching.flatMap((h) => hook(h, h.beforeGetOne)),
        (nextParams) => dataProvider.getOne(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterGetOne)),
        params,
      );
    },
    create: <TName extends keyof TResources & string>(
      resource: TName,
      params: CreateParams<RecordOf<TResources, TName>>,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        CreateParams<RecordOf<TResources, TName>>,
        CreateResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeCreate)),
        (nextParams) => dataProvider.create(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterCreate)),
        params,
      );
    },
    update: <TName extends keyof TResources & string>(
      resource: TName,
      params: UpdateParams<RecordOf<TResources, TName>>,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        UpdateParams<RecordOf<TResources, TName>>,
        UpdateResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeUpdate)),
        (nextParams) => dataProvider.update(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterUpdate)),
        params,
      );
    },
    delete: <TName extends keyof TResources & string>(
      resource: TName,
      params: DeleteParams<RecordOf<TResources, TName>>,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        DeleteParams<RecordOf<TResources, TName>>,
        DeleteResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeDelete)),
        (nextParams) => dataProvider.delete(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterDelete)),
        params,
      );
    },
    getMany: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetManyParams,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        GetManyParams,
        GetManyResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeGetMany)),
        (nextParams) => dataProvider.getMany(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterGetMany)),
        params,
      );
    },
    getManyReference: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetManyReferenceParams,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        GetManyReferenceParams,
        GetManyReferenceResult<RecordOf<TResources, TName>>
      >(
        matching.flatMap((h) => hook(h, h.beforeGetManyReference)),
        (nextParams) => dataProvider.getManyReference(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterGetManyReference)),
        params,
      );
    },
    updateMany: <TName extends keyof TResources & string>(
      resource: TName,
      params: UpdateManyParams<RecordOf<TResources, TName>>,
    ) => {
      const matching = handlersFor(resource);
      return runChain<
        UpdateManyParams<RecordOf<TResources, TName>>,
        UpdateManyResult
      >(
        matching.flatMap((h) => hook(h, h.beforeUpdateMany)),
        (nextParams) => dataProvider.updateMany(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterUpdateMany)),
        params,
      );
    },
    deleteMany: <TName extends keyof TResources & string>(
      resource: TName,
      params: DeleteManyParams,
    ) => {
      const matching = handlersFor(resource);
      return runChain<DeleteManyParams, DeleteManyResult>(
        matching.flatMap((h) => hook(h, h.beforeDeleteMany)),
        (nextParams) => dataProvider.deleteMany(resource, nextParams),
        matching.flatMap((h) => hook(h, h.afterDeleteMany)),
        params,
      );
    },
  };
}
