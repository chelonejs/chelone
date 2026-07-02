export { ValidationError } from "./data/errors";
export type {
  CreateParams,
  CreateResult,
  CursorPagination,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  FilterPayload,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyReferenceParams,
  GetManyReferenceResult,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  PageInfo,
  PagePagination,
  Pagination,
  SortPayload,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
} from "./data/types";
export type { Identifier } from "./resource/identifier";
export type { LooseRecord, ResourceRecord } from "./resource/record";
export type {
  RecordOf,
  ResourceConfig,
  ResourceMap,
} from "./resource/registry";
export { defineResources } from "./resource/registry";
