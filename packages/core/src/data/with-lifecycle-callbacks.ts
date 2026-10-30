import type { LooseRecord } from "../resource/record";
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
 * The optional hooks of one handler, typed for records of type `TRecord`.
 * Every callback must return the value: `undefined` is not "unchanged".
 * `dataProvider` is the provider passed to `withLifecycleCallbacks`, so
 * calling it never re-enters the callbacks.
 */
export interface LifecycleCallbacks<
  TResources extends ResourceMap,
  TRecord extends LooseRecord,
> {
  beforeGetList?(
    params: GetListParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetListParams>;
  afterGetList?(
    result: GetListResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetListResult<TRecord>>;

  beforeGetOne?(
    params: GetOneParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetOneParams>;
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

  beforeGetMany?(
    params: GetManyParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyParams>;
  afterGetMany?(
    result: GetManyResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyResult<TRecord>>;

  beforeGetManyReference?(
    params: GetManyReferenceParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyReferenceParams>;
  afterGetManyReference?(
    result: GetManyReferenceResult<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<GetManyReferenceResult<TRecord>>;

  beforeUpdateMany?(
    params: UpdateManyParams<TRecord>,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateManyParams<TRecord>>;
  afterUpdateMany?(
    result: UpdateManyResult,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<UpdateManyResult>;

  beforeDeleteMany?(
    params: DeleteManyParams,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteManyParams>;
  afterDeleteMany?(
    result: DeleteManyResult,
    dataProvider: DataProvider<TResources>,
  ): MaybePromise<DeleteManyResult>;
}

/**
 * A handler: the callbacks for one registry resource, typed with that
 * resource's record, or for `"*"` (every resource), typed with `LooseRecord`.
 */
export type LifecycleHandler<TResources extends ResourceMap = ResourceMap> =
  | {
      [TName in keyof TResources & string]: {
        resource: TName;
      } & LifecycleCallbacks<TResources, RecordOf<TResources, TName>>;
    }[keyof TResources & string]
  | ({ resource: "*" } & LifecycleCallbacks<TResources, LooseRecord>);

const VERBS = [
  "getList",
  "getOne",
  "create",
  "update",
  "delete",
  "getMany",
  "getManyReference",
  "updateMany",
  "deleteMany",
] as const;

type Callback = (value: unknown, dataProvider: unknown) => unknown;
type LooseHandler = { resource: string } & Record<string, Callback | undefined>;
type LooseVerb = (resource: string, params: unknown) => Promise<unknown>;

const capitalize = (verb: string) =>
  verb.charAt(0).toUpperCase() + verb.slice(1);

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
  const loose = handlers as unknown as LooseHandler[];
  const wrapped: Record<string, unknown> = { ...dataProvider };

  for (const verb of VERBS) {
    const beforeName = `before${capitalize(verb)}`;
    const afterName = `after${capitalize(verb)}`;
    const callProvider = (resource: string, params: unknown) =>
      (dataProvider as unknown as Record<(typeof VERBS)[number], LooseVerb>)[
        verb
      ](resource, params);

    wrapped[verb] = (resource: string, params: unknown) => {
      const matching = loose.filter(
        (handler) => handler.resource === resource || handler.resource === "*",
      );
      const befores = matching.filter((handler) => handler[beforeName]);
      const afters = matching.filter((handler) => handler[afterName]);
      if (befores.length === 0 && afters.length === 0) {
        return callProvider(resource, params);
      }
      return (async () => {
        let nextParams = params;
        for (const handler of befores) {
          nextParams = await (handler[beforeName] as Callback).call(
            handler,
            nextParams,
            dataProvider,
          );
        }
        let result = await callProvider(resource, nextParams);
        for (const handler of afters) {
          result = await (handler[afterName] as Callback).call(
            handler,
            result,
            dataProvider,
          );
        }
        return result;
      })();
    };
  }

  return wrapped as unknown as DataProvider<TResources>;
}
