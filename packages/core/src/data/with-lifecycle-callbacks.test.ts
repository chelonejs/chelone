import { describe, expect, it, type Mock, vi } from "vitest";
import { InertDataProvider } from "../__fixtures__/data-provider";
import { defineResources } from "../resource/registry";
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
import {
  type LifecycleHandler,
  withLifecycleCallbacks,
} from "./with-lifecycle-callbacks";

const resources = defineResources({ posts: {}, comments: {} });
type Resources = typeof resources;
type Name = keyof Resources & string;

const verbs = [
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
type Verb = (typeof verbs)[number];

/** One `before` or `after` hook of one verb, as a handler declares it. */
type Hook<TValue> = (
  value: TValue,
  dataProvider: DataProvider<Resources>,
) => TValue;

/** Fixtures are shared across tests, so a callback that mutates one throws. */
const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const paramsFor = deepFreeze({
  getList: { filter: { q: "a" } } satisfies GetListParams,
  getOne: { id: 1 } satisfies GetOneParams,
  create: { data: { title: "a" } } satisfies CreateParams,
  update: { id: 1, data: { title: "a" } } satisfies UpdateParams,
  delete: { id: 1 } satisfies DeleteParams,
  getMany: { ids: [1] } satisfies GetManyParams,
  getManyReference: {
    target: "postId",
    id: 1,
  } satisfies GetManyReferenceParams,
  updateMany: { ids: [1], data: { title: "a" } } satisfies UpdateManyParams,
  deleteMany: { ids: [1] } satisfies DeleteManyParams,
});

const resultFor = deepFreeze({
  getList: { data: [{ id: 1 }], total: 1 } satisfies GetListResult,
  getOne: { data: { id: 1 } } satisfies GetOneResult,
  create: { data: { id: 1 } } satisfies CreateResult,
  update: { data: { id: 1 } } satisfies UpdateResult,
  delete: { data: { id: 1 } } satisfies DeleteResult,
  getMany: { data: [{ id: 1 }] } satisfies GetManyResult,
  getManyReference: {
    data: [{ id: 1 }],
    total: 1,
  } satisfies GetManyReferenceResult,
  updateMany: { data: [1] } satisfies UpdateManyResult,
  deleteMany: { data: [1] } satisfies DeleteManyResult,
});

/** A provider whose nine verbs are spies, each resolving the shared result. */
const stubProvider = () => {
  const provider = new InertDataProvider<Resources>();
  const spies = {
    getList: vi.spyOn(provider, "getList").mockResolvedValue(resultFor.getList),
    getOne: vi.spyOn(provider, "getOne").mockResolvedValue(resultFor.getOne),
    create: vi.spyOn(provider, "create").mockResolvedValue(resultFor.create),
    update: vi.spyOn(provider, "update").mockResolvedValue(resultFor.update),
    delete: vi.spyOn(provider, "delete").mockResolvedValue(resultFor.delete),
    getMany: vi.spyOn(provider, "getMany").mockResolvedValue(resultFor.getMany),
    getManyReference: vi
      .spyOn(provider, "getManyReference")
      .mockResolvedValue(resultFor.getManyReference),
    updateMany: vi
      .spyOn(provider, "updateMany")
      .mockResolvedValue(resultFor.updateMany),
    deleteMany: vi
      .spyOn(provider, "deleteMany")
      .mockResolvedValue(resultFor.deleteMany),
  };
  return { provider, spies };
};

/** Each verb called through the typed `DataProvider` contract, no casts. */
const callers = {
  getList: (dp: DataProvider<Resources>, resource: Name) =>
    dp.getList(resource, paramsFor.getList),
  getOne: (dp: DataProvider<Resources>, resource: Name) =>
    dp.getOne(resource, paramsFor.getOne),
  create: (dp: DataProvider<Resources>, resource: Name) =>
    dp.create(resource, paramsFor.create),
  update: (dp: DataProvider<Resources>, resource: Name) =>
    dp.update(resource, paramsFor.update),
  delete: (dp: DataProvider<Resources>, resource: Name) =>
    dp.delete(resource, paramsFor.delete),
  getMany: (dp: DataProvider<Resources>, resource: Name) =>
    dp.getMany(resource, paramsFor.getMany),
  getManyReference: (dp: DataProvider<Resources>, resource: Name) =>
    dp.getManyReference(resource, paramsFor.getManyReference),
  updateMany: (dp: DataProvider<Resources>, resource: Name) =>
    dp.updateMany(resource, paramsFor.updateMany),
  deleteMany: (dp: DataProvider<Resources>, resource: Name) =>
    dp.deleteMany(resource, paramsFor.deleteMany),
};

/** Appends `name` to the value's `tags`, keeping the value's own type. */
const tag =
  (name: string) =>
  <T extends object>(
    value: T & { tags?: string[] },
  ): T & { tags: string[] } => ({
    ...value,
    tags: [...(value.tags ?? []), name],
  });

/** Adds `rewritten` to the value, keeping the value's own type. */
const rewrite = <T extends object>(value: T): T & { rewritten: true } => ({
  ...value,
  rewritten: true,
});

/** A hook spy paired with the handler that runs it. */
const hookCase = <TValue>(
  spy: Mock<Hook<TValue>>,
  handler: (cb: Mock<Hook<TValue>>) => LifecycleHandler<Resources>,
) => ({ spy, handler: handler(spy) });

/** A provider with a property of its own on top of the nine verbs. */
class ExtraProvider extends InertDataProvider<Resources> {
  extra = { name: "rest" };
}

/** The `extra` a provider carries, which the `DataProvider` type does not declare. */
const isExtraProvider = (
  value: DataProvider<Resources>,
): value is ExtraProvider => "extra" in value;

describe("withLifecycleCallbacks", () => {
  it("before<Verb> rewrites the params the provider receives, for each of the nine verbs", async () => {
    const cases = {
      getList: hookCase(
        vi.fn<Hook<GetListParams>>(rewrite),
        (beforeGetList) => ({
          resource: "posts",
          beforeGetList,
        }),
      ),
      getOne: hookCase(vi.fn<Hook<GetOneParams>>(rewrite), (beforeGetOne) => ({
        resource: "posts",
        beforeGetOne,
      })),
      create: hookCase(vi.fn<Hook<CreateParams>>(rewrite), (beforeCreate) => ({
        resource: "posts",
        beforeCreate,
      })),
      update: hookCase(vi.fn<Hook<UpdateParams>>(rewrite), (beforeUpdate) => ({
        resource: "posts",
        beforeUpdate,
      })),
      delete: hookCase(vi.fn<Hook<DeleteParams>>(rewrite), (beforeDelete) => ({
        resource: "posts",
        beforeDelete,
      })),
      getMany: hookCase(
        vi.fn<Hook<GetManyParams>>(rewrite),
        (beforeGetMany) => ({
          resource: "posts",
          beforeGetMany,
        }),
      ),
      getManyReference: hookCase(
        vi.fn<Hook<GetManyReferenceParams>>(rewrite),
        (beforeGetManyReference) => ({
          resource: "posts",
          beforeGetManyReference,
        }),
      ),
      updateMany: hookCase(
        vi.fn<Hook<UpdateManyParams>>(rewrite),
        (beforeUpdateMany) => ({
          resource: "posts",
          beforeUpdateMany,
        }),
      ),
      deleteMany: hookCase(
        vi.fn<Hook<DeleteManyParams>>(rewrite),
        (beforeDeleteMany) => ({
          resource: "posts",
          beforeDeleteMany,
        }),
      ),
    };

    for (const verb of verbs) {
      const { provider, spies } = stubProvider();
      const { spy, handler } = cases[verb];
      const wrapped = withLifecycleCallbacks<Resources>(provider, [handler]);

      const result = await callers[verb](wrapped, "posts");

      expect(spy).toHaveBeenCalledWith(paramsFor[verb], provider);
      expect(spies[verb]).toHaveBeenCalledExactlyOnceWith("posts", {
        ...paramsFor[verb],
        rewritten: true,
      });
      expect(result).toBe(resultFor[verb]);
    }
  });

  it("after<Verb> rewrites the result the caller receives, for each of the nine verbs", async () => {
    const cases = {
      getList: hookCase(
        vi.fn<Hook<GetListResult>>(rewrite),
        (afterGetList) => ({
          resource: "posts",
          afterGetList,
        }),
      ),
      getOne: hookCase(vi.fn<Hook<GetOneResult>>(rewrite), (afterGetOne) => ({
        resource: "posts",
        afterGetOne,
      })),
      create: hookCase(vi.fn<Hook<CreateResult>>(rewrite), (afterCreate) => ({
        resource: "posts",
        afterCreate,
      })),
      update: hookCase(vi.fn<Hook<UpdateResult>>(rewrite), (afterUpdate) => ({
        resource: "posts",
        afterUpdate,
      })),
      delete: hookCase(vi.fn<Hook<DeleteResult>>(rewrite), (afterDelete) => ({
        resource: "posts",
        afterDelete,
      })),
      getMany: hookCase(
        vi.fn<Hook<GetManyResult>>(rewrite),
        (afterGetMany) => ({
          resource: "posts",
          afterGetMany,
        }),
      ),
      getManyReference: hookCase(
        vi.fn<Hook<GetManyReferenceResult>>(rewrite),
        (afterGetManyReference) => ({
          resource: "posts",
          afterGetManyReference,
        }),
      ),
      updateMany: hookCase(
        vi.fn<Hook<UpdateManyResult>>(rewrite),
        (afterUpdateMany) => ({
          resource: "posts",
          afterUpdateMany,
        }),
      ),
      deleteMany: hookCase(
        vi.fn<Hook<DeleteManyResult>>(rewrite),
        (afterDeleteMany) => ({
          resource: "posts",
          afterDeleteMany,
        }),
      ),
    };

    for (const verb of verbs) {
      const { provider, spies } = stubProvider();
      const { spy, handler } = cases[verb];
      const wrapped = withLifecycleCallbacks<Resources>(provider, [handler]);

      const result = await callers[verb](wrapped, "posts");

      expect(spies[verb]).toHaveBeenCalledExactlyOnceWith(
        "posts",
        paramsFor[verb],
      );
      expect(spy).toHaveBeenCalledWith(resultFor[verb], provider);
      expect(result).toEqual({ ...resultFor[verb], rewritten: true });
    }
  });

  it("a handler for another resource and a verb without a callback pass straight through", async () => {
    const { provider, spies } = stubProvider();
    const beforeGetOne = vi.fn<Hook<GetOneParams>>(tag("x"));
    const afterGetOne = vi.fn<Hook<GetOneResult>>(tag("x"));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      { resource: "comments", beforeGetOne, afterGetOne },
      { resource: "posts", beforeGetOne, afterGetOne },
    ]);

    const params = { filter: { q: "a" } };
    const list = await wrapped.getList("posts", params);
    const other = await wrapped.getOne("comments", { id: 1 });

    expect(spies.getList).toHaveBeenCalledExactlyOnceWith("posts", params);
    expect(list).toBe(resultFor.getList);
    expect(spies.getOne).toHaveBeenCalledExactlyOnceWith("comments", {
      id: 1,
      tags: ["x"],
    });
    expect(other).toEqual({ data: { id: 1 }, tags: ["x"] });
    expect(beforeGetOne).toHaveBeenCalledTimes(1);
    expect(afterGetOne).toHaveBeenCalledTimes(1);

    // The "posts" handler runs for posts, the "comments" one does not.
    await wrapped.getOne("posts", { id: 2 });

    expect(spies.getOne).toHaveBeenLastCalledWith("posts", {
      id: 2,
      tags: ["x"],
    });
    expect(beforeGetOne).toHaveBeenCalledTimes(2);
  });

  it('a "*" handler applies to every resource and runs with the named handlers in array order', async () => {
    const { provider, spies } = stubProvider();
    spies.getOne.mockImplementation(async (_resource, params) => ({
      data: { id: params.id },
    }));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      { resource: "*", beforeGetOne: tag("b1"), afterGetOne: tag("a1") },
      { resource: "posts", beforeGetOne: tag("b2"), afterGetOne: tag("a2") },
      { resource: "*", beforeGetOne: tag("b3"), afterGetOne: tag("a3") },
    ]);

    const posts = await wrapped.getOne("posts", { id: 1 });
    const comments = await wrapped.getOne("comments", { id: 2 });

    expect(spies.getOne).toHaveBeenNthCalledWith(1, "posts", {
      id: 1,
      tags: ["b1", "b2", "b3"],
    });
    expect(spies.getOne).toHaveBeenNthCalledWith(2, "comments", {
      id: 2,
      tags: ["b1", "b3"],
    });
    expect(posts).toEqual({ data: { id: 1 }, tags: ["a1", "a2", "a3"] });
    expect(comments).toEqual({ data: { id: 2 }, tags: ["a1", "a3"] });
  });

  it('a "*" handler applies to every verb', async () => {
    const handlers: Record<Verb, LifecycleHandler<Resources>> = {
      getList: {
        resource: "*",
        beforeGetList: tag("b"),
        afterGetList: tag("a"),
      },
      getOne: { resource: "*", beforeGetOne: tag("b"), afterGetOne: tag("a") },
      create: { resource: "*", beforeCreate: tag("b"), afterCreate: tag("a") },
      update: { resource: "*", beforeUpdate: tag("b"), afterUpdate: tag("a") },
      delete: { resource: "*", beforeDelete: tag("b"), afterDelete: tag("a") },
      getMany: {
        resource: "*",
        beforeGetMany: tag("b"),
        afterGetMany: tag("a"),
      },
      getManyReference: {
        resource: "*",
        beforeGetManyReference: tag("b"),
        afterGetManyReference: tag("a"),
      },
      updateMany: {
        resource: "*",
        beforeUpdateMany: tag("b"),
        afterUpdateMany: tag("a"),
      },
      deleteMany: {
        resource: "*",
        beforeDeleteMany: tag("b"),
        afterDeleteMany: tag("a"),
      },
    };

    for (const verb of verbs) {
      const { provider, spies } = stubProvider();
      const wrapped = withLifecycleCallbacks<Resources>(provider, [
        handlers[verb],
      ]);

      const result = await callers[verb](wrapped, "posts");

      expect(spies[verb]).toHaveBeenCalledExactlyOnceWith("posts", {
        ...paramsFor[verb],
        tags: ["b"],
      });
      expect(result).toEqual({ ...resultFor[verb], tags: ["a"] });
    }
  });

  it("async callbacks are awaited before the next step", async () => {
    const log: string[] = [];
    const { provider, spies } = stubProvider();
    spies.getOne.mockImplementation(async () => {
      log.push("provider");
      return resultFor.getOne;
    });
    const later = () => new Promise((r) => setTimeout(r, 0));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      {
        resource: "posts",
        beforeGetOne: async (params) => {
          await later();
          log.push("before1");
          return tag("b1")(params);
        },
        afterGetOne: async (result) => {
          await later();
          log.push("after1");
          return tag("a1")(result);
        },
      },
      {
        resource: "posts",
        beforeGetOne: (params) => {
          log.push("before2");
          return tag("b2")(params);
        },
        afterGetOne: (result) => {
          log.push("after2");
          return tag("a2")(result);
        },
      },
    ]);

    const result = await wrapped.getOne("posts", { id: 1 });

    expect(log).toEqual(["before1", "before2", "provider", "after1", "after2"]);
    expect(spies.getOne).toHaveBeenCalledWith("posts", {
      id: 1,
      tags: ["b1", "b2"],
    });
    expect(result).toEqual({ data: { id: 1 }, tags: ["a1", "a2"] });
  });

  it("a rejecting before callback rejects the call and the provider is never called", async () => {
    const { provider, spies } = stubProvider();
    const error = new Error("nope");
    const second = vi.fn<Hook<GetOneParams>>(tag("b2"));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      {
        resource: "posts",
        beforeGetOne: async () => {
          throw error;
        },
      },
      { resource: "posts", beforeGetOne: second },
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(second).not.toHaveBeenCalled();
    expect(spies.getOne).not.toHaveBeenCalled();
  });

  it("a rejecting provider skips the after callbacks and rejects with the provider error", async () => {
    const { provider, spies } = stubProvider();
    const error = new Error("server down");
    spies.getOne.mockRejectedValue(error);
    const afterGetOne = vi.fn<Hook<GetOneResult>>(tag("a"));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      { resource: "posts", afterGetOne },
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(afterGetOne).not.toHaveBeenCalled();
  });

  it("a rejecting after callback rejects the call", async () => {
    const { provider, spies } = stubProvider();
    const error = new Error("bad result");
    const second = vi.fn<Hook<GetOneResult>>(tag("a2"));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      {
        resource: "posts",
        afterGetOne: async () => {
          throw error;
        },
      },
      { resource: "posts", afterGetOne: second },
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(second).not.toHaveBeenCalled();
    expect(spies.getOne).toHaveBeenCalledTimes(1);
  });

  it("the dataProvider argument is the provider passed in, so calls on it skip the callbacks", async () => {
    const { provider, spies } = stubProvider();
    const beforeGetOne = vi.fn<Hook<GetOneParams>>(tag("b"));
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      {
        resource: "posts",
        beforeGetOne,
        afterGetOne: async (result, dataProvider) => {
          expect(dataProvider).toBe(provider);
          expect(dataProvider).not.toBe(wrapped);
          await dataProvider.getOne("posts", { id: 2 });
          return result;
        },
      },
    ]);

    await wrapped.getOne("posts", { id: 1 });

    expect(beforeGetOne).toHaveBeenCalledTimes(1);
    expect(spies.getOne).toHaveBeenCalledTimes(2);
    expect(spies.getOne).toHaveBeenLastCalledWith("posts", { id: 2 });
  });

  it("extra properties of the provider passed in survive and it is not mutated", () => {
    const provider = Object.freeze(new ExtraProvider());
    const wrapped = withLifecycleCallbacks<Resources>(provider, [
      { resource: "posts", beforeGetOne: tag("b") },
    ]);
    const extra = isExtraProvider(wrapped) ? wrapped.extra : undefined;

    expect(wrapped).not.toBe(provider);
    expect(extra).toBe(provider.extra);
    expect(wrapped.getOne).not.toBe(provider.getOne);
    // Nothing was written onto the provider: it has the one key it came with,
    // and every verb is still the method it inherited.
    expect(Object.keys(provider)).toEqual(["extra"]);
    for (const verb of verbs) {
      expect(provider[verb]).toBe(ExtraProvider.prototype[verb]);
    }
  });
});
