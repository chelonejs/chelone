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
} from "../data/types";
import type { RecordOf, ResourceMap } from "../resource/registry";

const notStubbed = (verb: string): Promise<never> =>
  Promise.reject(new Error(`not stubbed: ${verb}`));

/**
 * A whole `DataProvider` whose every verb rejects with `not stubbed: <verb>`.
 * A test extends it and overrides only the verbs it exercises, so the double
 * needs no cast to `DataProvider`.
 */
export class InertDataProvider<TResources extends ResourceMap = ResourceMap>
  implements DataProvider<TResources>
{
  getList<TName extends keyof TResources & string>(
    _resource: TName,
    _params: GetListParams,
  ): Promise<GetListResult<RecordOf<TResources, TName>>> {
    return notStubbed("getList");
  }

  getOne<TName extends keyof TResources & string>(
    _resource: TName,
    _params: GetOneParams,
  ): Promise<GetOneResult<RecordOf<TResources, TName>>> {
    return notStubbed("getOne");
  }

  create<TName extends keyof TResources & string>(
    _resource: TName,
    _params: CreateParams<RecordOf<TResources, TName>>,
  ): Promise<CreateResult<RecordOf<TResources, TName>>> {
    return notStubbed("create");
  }

  update<TName extends keyof TResources & string>(
    _resource: TName,
    _params: UpdateParams<RecordOf<TResources, TName>>,
  ): Promise<UpdateResult<RecordOf<TResources, TName>>> {
    return notStubbed("update");
  }

  delete<TName extends keyof TResources & string>(
    _resource: TName,
    _params: DeleteParams<RecordOf<TResources, TName>>,
  ): Promise<DeleteResult<RecordOf<TResources, TName>>> {
    return notStubbed("delete");
  }

  getMany<TName extends keyof TResources & string>(
    _resource: TName,
    _params: GetManyParams,
  ): Promise<GetManyResult<RecordOf<TResources, TName>>> {
    return notStubbed("getMany");
  }

  getManyReference<TName extends keyof TResources & string>(
    _resource: TName,
    _params: GetManyReferenceParams,
  ): Promise<GetManyReferenceResult<RecordOf<TResources, TName>>> {
    return notStubbed("getManyReference");
  }

  updateMany<TName extends keyof TResources & string>(
    _resource: TName,
    _params: UpdateManyParams<RecordOf<TResources, TName>>,
  ): Promise<UpdateManyResult> {
    return notStubbed("updateMany");
  }

  deleteMany<TName extends keyof TResources & string>(
    _resource: TName,
    _params: DeleteManyParams,
  ): Promise<DeleteManyResult> {
    return notStubbed("deleteMany");
  }
}
