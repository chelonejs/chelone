export { ValidationError } from "./data/errors";
export { fakeDataProvider } from "./data/fake-provider";
export {
  listKey,
  manyKey,
  manyReferenceKey,
  oneKey,
  resourceKey,
} from "./data/keys";
export type {
  MutationMode,
  MutationModeOptions,
} from "./data/mutation-options";
export {
  createMutationOptions,
  deleteMutationOptions,
  updateMutationOptions,
} from "./data/mutation-options";
export type { DataContext } from "./data/query-options";
export {
  getListOptions,
  getManyOptions,
  getOneOptions,
} from "./data/query-options";
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
