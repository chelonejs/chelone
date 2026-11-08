import type { Identifier } from "../resource/identifier";
import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type {
  AnyFilterSourceKey,
  RecordFilterKey,
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

export interface SortPayload {
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
export type FilterPayload<TRecord = LooseRecord> = _FilterKeys<
  LooseRecord extends TRecord ? AnyFilterSourceKey : RecordFilterKey<TRecord>
>;

/**
 * The object shape {@link FilterPayload} takes. `string` keys stay an index
 * signature, so an unregistered app keeps today's plain object; a known key set
 * makes every other key an excess property.
 */
type _FilterKeys<TKeys extends string> = string extends TKeys
  ? { [key: string]: unknown }
  : { [TKey in TKeys]?: unknown };

export interface GetListParams {
  pagination?: Pagination;
  /** Single sort key, or multi-sort: keys applied in order (first is primary). */
  sort?: SortPayload | SortPayload[];
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
  /** Single sort key, or multi-sort: keys applied in order (first is primary). */
  sort?: SortPayload | SortPayload[];
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
