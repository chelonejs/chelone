import type { Identifier } from "../resource/identifier";
import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type {
  AnyFilterSourceKey,
  AnySourcePath,
  RecordFilterKey,
  SourcePath,
} from "../resource/source-path";

export interface PagePagination {
  page: number;
  perPage: number;
}
export interface CursorPagination {
  cursor: string | null;
  limit: number;
}
/** Discriminated by presence of `page` vs `cursor` — offset AND keyset backends are first-class. */
export type Pagination = PagePagination | CursorPagination;

export interface PageInfo {
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/**
 * The sort a list applies: one field of the record and a direction.
 *
 * `field` is a {@link SourcePath} of the record, so sorting on a column the
 * record does not have stops compiling. A loose record (the default, and every
 * app that registers nothing) takes {@link AnySourcePath} instead, the same
 * loose arm a `source` prop has, so a `DataTable` column can write its own
 * `SourceProp` into `setSort`.
 *
 * A data provider verb takes {@link LooseSortPayload}: a controller generic over
 * `TResources` cannot prove its `SortPayload<RecordOf<TResources, TName>>`
 * assigns to the registered union.
 */
export interface SortPayload<TRecord = LooseRecord> {
  field: _SortFieldOf<TRecord>;
  order: "ASC" | "DESC";
}

/**
 * The field a sort takes: the registered union of source paths for a loose
 * record, the record's own paths for a typed one.
 *
 * The conditional sits on the field, never between two payload shapes: a union
 * of a resolved arm and a deferred one is what stops two identical
 * `SortPayload<TRecord>`s assigning to each other inside a generic function.
 * `LooseRecord extends TRecord` is {@link SourceKey}'s guard, not the
 * `unknown extends` the path types use: an open type parameter resolves against
 * its constraint, and `SourcePath<ResourceRecord>` is `"id"`.
 */
type _SortFieldOf<TRecord> = LooseRecord extends TRecord
  ? AnySourcePath
  : SourcePath<TRecord>;

/**
 * A sort with no record behind it: an open field name. {@link SortPayload}'s
 * loose field is the registered union once an app registers resources, so the
 * verbs of {@link DataProvider}, and the code that reads what a verb receives
 * (`applySort`, `buildOrder`), name this instead.
 */
export interface LooseSortPayload {
  field: string;
  order: "ASC" | "DESC";
}
/**
 * A filter object: {@link RecordFilterKey}s mapped to values — a record's source
 * paths, those paths with an operator suffix, and `q`. Keys come from the
 * resource registry the way a `source` prop does from {@link SourceProp}, so an
 * app that registers its resources gets `titel_gte` rejected at the call site.
 *
 * Values stay `unknown`: an operator suffix makes a key's value type ambiguous
 * (`title_gte` wants a string, `views_gte` a number), and the provider decides
 * what a value means.
 *
 * A loose record (the default, and every app that registers nothing) is keyed by
 * {@link AnyFilterSourceKey}, which is plain `string` until `Register` is
 * augmented.
 */
export type FilterPayload<TRecord = LooseRecord> = {
  // type-escape: filter values are unknown by design — an operator suffix makes a key's value type ambiguous (`title_gte` wants a string, `views_gte` a number), and the provider decides what a value means
  [TKey in _FilterKeyOf<TRecord>]?: unknown;
};

/**
 * The keys a filter takes: the registered union for a loose record, the
 * record's own keys for a typed one.
 *
 * `FilterPayload` maps over that union as ONE key set rather than picking one
 * of two object shapes with a conditional. A union of a resolved arm and a
 * deferred one is what stops two identical `FilterPayload<TRecord>`s assigning
 * to each other inside a generic function, and mapping over `string` is how an
 * unregistered app keeps today's plain index-signature object.
 */
type _FilterKeyOf<TRecord> = LooseRecord extends TRecord
  ? AnyFilterSourceKey
  : RecordFilterKey<TRecord>;

/**
 * A filter with no record behind it: an open key map. {@link FilterPayload}'s
 * loose key set is the registered union once an app registers resources, so
 * code that walks a filter key by key — pruning one, stripping empties — names
 * this instead.
 */
export type LooseFilterPayload = { [key: string]: unknown };

/**
 * Which filter inputs the list shows: a filter key mapped to whether its input
 * is open. `showFilter(name)` writes `{ [name]: true }` into the filter and
 * `hideFilter(name)` removes that path from it, so the map is keyed by the same
 * union {@link FilterPayload} is — a name that is no filter key of the record
 * stops compiling.
 *
 * The values are optional: a map over a literal key union that demanded every
 * key would force an app to list every filter it has in order to show one.
 */
export type DisplayedFilters<TRecord = LooseRecord> = {
  [TKey in _FilterKeyOf<TRecord>]?: boolean;
};

/**
 * The displayed filters with no record behind it: an open key map.
 * {@link DisplayedFilters}'s loose key set is the registered union once an app
 * registers resources, so code that walks the map key by key — a filter form
 * reading `displayedFilters[source]`, an adapter's list context — names this
 * instead.
 *
 * The value carries `undefined` because {@link DisplayedFilters} does: a map
 * over a literal key union with optional values has no `string` index
 * signature of plain `boolean` to hand over, so an erased map that demanded one
 * would reject every typed controller.
 */
export type LooseDisplayedFilters = { [key: string]: boolean | undefined };

export interface GetListParams {
  pagination?: Pagination;
  /**
   * Single sort key, or multi-sort: keys applied in order (first is primary).
   * Loose, like {@link GetListParams.filter}: a verb is not generic over the
   * record, and a controller's typed sort assigns to it with no cast.
   */
  sort?: LooseSortPayload | LooseSortPayload[];
  filter?: FilterPayload;
  meta?: unknown;
}
/** `GetListParams` that must page by number: a cursor cannot be walked page by page. */
export type InfiniteListParams = Omit<GetListParams, "pagination"> & {
  pagination: PagePagination;
};
export interface GetListResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord[];
  /** Optional — cursor backends often cannot count. */
  total?: number;
  pageInfo?: PageInfo;
}

export interface GetOneParams<TId extends Identifier = Identifier> {
  id: TId;
  meta?: unknown;
}
export interface GetOneResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord;
}

export interface CreateParams<TRecord extends ResourceRecord = LooseRecord> {
  data: Partial<TRecord>;
  meta?: unknown;
}
export interface CreateResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord;
}

export interface UpdateParams<TRecord extends ResourceRecord = LooseRecord> {
  id: Identifier;
  data: Partial<TRecord>;
  previousData?: TRecord;
  meta?: unknown;
}
export interface UpdateResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord;
}

export interface DeleteParams<TRecord extends ResourceRecord = LooseRecord> {
  id: Identifier;
  previousData?: TRecord;
  meta?: unknown;
}
export interface DeleteResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord;
}

export interface GetManyParams {
  ids: Identifier[];
  meta?: unknown;
}
export interface GetManyResult<TRecord extends ResourceRecord = LooseRecord> {
  data: TRecord[];
}

/**
 * Fetch records whose `target` field (the FK on the referenced-FROM side)
 * equals `id`. Arbitrary-lookup-key resolution on the referenced side is a
 * controller concern (P4/P5) via getList filter — not extra contract surface.
 */
export interface GetManyReferenceParams {
  target: string;
  id: Identifier;
  pagination?: Pagination;
  /** Single sort key, or multi-sort: keys applied in order (first is primary). Loose, as in {@link GetListParams}. */
  sort?: LooseSortPayload | LooseSortPayload[];
  filter?: FilterPayload;
  meta?: unknown;
}
export type GetManyReferenceResult<
  TRecord extends ResourceRecord = LooseRecord,
> = GetListResult<TRecord>;

export interface UpdateManyParams<
  TRecord extends ResourceRecord = LooseRecord,
> {
  ids: Identifier[];
  data: Partial<TRecord>;
  meta?: unknown;
}
export interface UpdateManyResult {
  data: Identifier[];
}
export interface DeleteManyParams {
  ids: Identifier[];
  meta?: unknown;
}
export interface DeleteManyResult {
  data: Identifier[];
}

/**
 * The data contract: 9 promise-returning CRUD verbs (P2 full set).
 * Parameterized by a registry so `resource` names are checked and record
 * types flow to results via `RecordOf`.
 */
export interface DataProvider<TResources extends ResourceMap = ResourceMap> {
  getList<TName extends keyof TResources & string>(
    resource: TName,
    params: GetListParams,
  ): Promise<GetListResult<RecordOf<TResources, TName>>>;

  getOne<TName extends keyof TResources & string>(
    resource: TName,
    params: GetOneParams,
  ): Promise<GetOneResult<RecordOf<TResources, TName>>>;

  create<TName extends keyof TResources & string>(
    resource: TName,
    params: CreateParams<RecordOf<TResources, TName>>,
  ): Promise<CreateResult<RecordOf<TResources, TName>>>;

  update<TName extends keyof TResources & string>(
    resource: TName,
    params: UpdateParams<RecordOf<TResources, TName>>,
  ): Promise<UpdateResult<RecordOf<TResources, TName>>>;

  delete<TName extends keyof TResources & string>(
    resource: TName,
    params: DeleteParams<RecordOf<TResources, TName>>,
  ): Promise<DeleteResult<RecordOf<TResources, TName>>>;

  getMany<TName extends keyof TResources & string>(
    resource: TName,
    params: GetManyParams,
  ): Promise<GetManyResult<RecordOf<TResources, TName>>>;

  getManyReference<TName extends keyof TResources & string>(
    resource: TName,
    params: GetManyReferenceParams,
  ): Promise<GetManyReferenceResult<RecordOf<TResources, TName>>>;

  updateMany<TName extends keyof TResources & string>(
    resource: TName,
    params: UpdateManyParams<RecordOf<TResources, TName>>,
  ): Promise<UpdateManyResult>;

  deleteMany<TName extends keyof TResources & string>(
    resource: TName,
    params: DeleteManyParams,
  ): Promise<DeleteManyResult>;
}
