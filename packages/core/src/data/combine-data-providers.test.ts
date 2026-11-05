import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { InertDataProvider } from "../__fixtures__/data-provider";
import { defineResources } from "../resource/registry";
import { combineDataProviders } from "./combine-data-providers";
import { fakeDataProvider } from "./fake-provider";
import type {
  CreateParams,
  DataProvider,
  DeleteManyParams,
  DeleteParams,
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  UpdateManyParams,
  UpdateParams,
} from "./types";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
});
type Resources = typeof resources;

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

type Name = keyof Resources & string;

// `id` exists on both records, so one params object fits either resource.
const paramsFor = {
  getList: { filter: { q: "a" } } satisfies GetListParams,
  getOne: { id: 1 } satisfies GetOneParams,
  create: { data: { id: 5 } } satisfies CreateParams,
  update: { id: 1, data: { id: 5 } } satisfies UpdateParams,
  delete: { id: 1 } satisfies DeleteParams,
  getMany: { ids: [1] } satisfies GetManyParams,
  getManyReference: {
    target: "postId",
    id: 1,
  } satisfies GetManyReferenceParams,
  updateMany: { ids: [1], data: { id: 5 } } satisfies UpdateManyParams,
  deleteMany: { ids: [1] } satisfies DeleteManyParams,
};

/** Each verb called through the typed `DataProvider` contract, no casts. */
const callers: Record<
  Verb,
  (dp: DataProvider<Resources>, resource: Name) => Promise<unknown>
> = {
  getList: (dp, r) => dp.getList(r, paramsFor.getList),
  getOne: (dp, r) => dp.getOne(r, paramsFor.getOne),
  create: (dp, r) => dp.create(r, paramsFor.create),
  update: (dp, r) => dp.update(r, paramsFor.update),
  delete: (dp, r) => dp.delete(r, paramsFor.delete),
  getMany: (dp, r) => dp.getMany(r, paramsFor.getMany),
  getManyReference: (dp, r) =>
    dp.getManyReference(r, paramsFor.getManyReference),
  updateMany: (dp, r) => dp.updateMany(r, paramsFor.updateMany),
  deleteMany: (dp, r) => dp.deleteMany(r, paramsFor.deleteMany),
};

/** A provider whose every verb is a spy resolving a result that carries `label`. */
const spyProvider = (label: string) => {
  const provider = new InertDataProvider<Resources>();
  const record = { id: 1, title: label, body: label };
  const results = {
    getList: { data: [record], total: 1 },
    getOne: { data: record },
    create: { data: record },
    update: { data: record },
    delete: { data: record },
    getMany: { data: [record] },
    getManyReference: { data: [record], total: 1 },
    updateMany: { data: [1] },
    deleteMany: { data: [1] },
  };
  const spies = {
    getList: vi.spyOn(provider, "getList").mockResolvedValue(results.getList),
    getOne: vi.spyOn(provider, "getOne").mockResolvedValue(results.getOne),
    create: vi.spyOn(provider, "create").mockResolvedValue(results.create),
    update: vi.spyOn(provider, "update").mockResolvedValue(results.update),
    delete: vi.spyOn(provider, "delete").mockResolvedValue(results.delete),
    getMany: vi.spyOn(provider, "getMany").mockResolvedValue(results.getMany),
    getManyReference: vi
      .spyOn(provider, "getManyReference")
      .mockResolvedValue(results.getManyReference),
    updateMany: vi
      .spyOn(provider, "updateMany")
      .mockResolvedValue(results.updateMany),
    deleteMany: vi
      .spyOn(provider, "deleteMany")
      .mockResolvedValue(results.deleteMany),
  };
  return { provider, spies, results };
};

describe("combineDataProviders", () => {
  it("each of the nine verbs goes to the provider the matcher picks, with the same resource and params", async () => {
    const posts = spyProvider("posts");
    const comments = spyProvider("comments");
    const dp = combineDataProviders<Resources>((resource) =>
      resource === "posts" ? posts.provider : comments.provider,
    );

    for (const verb of verbs) {
      await expect(callers[verb](dp, "posts")).resolves.toEqual(
        posts.results[verb],
      );
      await expect(callers[verb](dp, "comments")).resolves.toEqual(
        comments.results[verb],
      );

      expect(posts.spies[verb]).toHaveBeenCalledExactlyOnceWith(
        "posts",
        paramsFor[verb],
      );
      expect(comments.spies[verb]).toHaveBeenCalledExactlyOnceWith(
        "comments",
        paramsFor[verb],
      );
    }
  });

  it("two resources on two fake providers read and write their own stores", async () => {
    const postsStore = fakeDataProvider<Resources>({
      posts: [{ id: 1, title: "first" }],
    });
    const commentsStore = fakeDataProvider<Resources>({
      comments: [{ id: 1, body: "nice" }],
    });
    const dp = combineDataProviders<Resources>((resource) =>
      resource === "posts" ? postsStore : commentsStore,
    );

    await dp.update("posts", { id: 1, data: { title: "renamed" } });
    await dp.create("comments", { data: { body: "second" } });

    expect((await dp.getOne("posts", { id: 1 })).data.title).toBe("renamed");
    expect((await dp.getList("comments", {})).data.map((c) => c.body)).toEqual([
      "nice",
      "second",
    ]);
    expect((await postsStore.getList("posts", {})).total).toBe(1);
    await expect(commentsStore.getList("posts", {})).rejects.toThrow(
      /unknown resource/,
    );
  });

  it("the matcher runs again on every call", async () => {
    const a = spyProvider("a");
    const b = spyProvider("b");
    let current = a.provider;
    const matcher = vi.fn(() => current);
    const dp = combineDataProviders<Resources>(matcher);

    await dp.getOne("posts", { id: 1 });
    current = b.provider;
    await dp.getOne("posts", { id: 1 });
    await dp.getMany("comments", { ids: [1] });

    expect(matcher).toHaveBeenCalledTimes(3);
    expect(matcher).toHaveBeenNthCalledWith(1, "posts");
    expect(matcher).toHaveBeenNthCalledWith(3, "comments");
    expect(a.spies.getOne).toHaveBeenCalledTimes(1);
    expect(b.spies.getOne).toHaveBeenCalledTimes(1);
    expect(b.spies.getMany).toHaveBeenCalledTimes(1);
  });

  it("a matcher returning undefined or null rejects with an error naming the resource", async () => {
    for (const none of [undefined, null]) {
      const dp = combineDataProviders<Resources>(() => none);
      for (const verb of verbs) {
        const rejection = callers[verb](dp, "comments");
        await expect(rejection).rejects.toBeInstanceOf(Error);
        await expect(rejection).rejects.toThrow(/"comments"/);
      }
    }
  });

  it("a matcher that throws rejects the call instead of throwing synchronously", async () => {
    const boom = new Error("matcher failed");
    const dp = combineDataProviders<Resources>(() => {
      throw boom;
    });

    for (const verb of verbs) {
      const pending = callers[verb](dp, "posts");
      await expect(pending).rejects.toBe(boom);
    }
  });

  it("a provider rejection reaches the caller as the same error instance", async () => {
    const failure = new Error("backend down");
    const { provider, spies } = spyProvider("x");
    const dp = combineDataProviders<Resources>(() => provider);

    for (const verb of verbs) {
      spies[verb].mockRejectedValueOnce(failure);
      await expect(callers[verb](dp, "posts")).rejects.toBe(failure);
    }
  });

  it("forwards only the nine verbs, not custom properties of the chosen provider", () => {
    const custom = Object.assign(spyProvider("x").provider, {
      refreshToken: () => "token",
    });
    const dp = combineDataProviders<Resources>(() => custom);

    expect(Object.keys(dp).sort()).toEqual([...verbs].sort());
    expect("refreshToken" in dp).toBe(false);
  });

  it("the matcher takes registry resource names and the result is a DataProvider of the registry", () => {
    const dp = combineDataProviders<Resources>((resource) => {
      expectTypeOf(resource).toEqualTypeOf<"posts" | "comments">();
      return undefined;
    });

    expectTypeOf(dp).toEqualTypeOf<DataProvider<Resources>>();

    combineDataProviders<Resources>((resource) => {
      // @ts-expect-error "widgets" is not in the registry
      if (resource === "widgets") return null;
      return null;
    });
  });
});
