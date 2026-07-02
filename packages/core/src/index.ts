export type {
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteParams,
  DeleteResult,
  FilterPayload,
  GetListParams,
  GetListResult,
  GetOneParams,
  GetOneResult,
  PaginationPayload,
  SortPayload,
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
