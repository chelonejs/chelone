import { describe, expect, it, vi } from "vitest";
import { defineResources } from "../resource/registry";
import type { DataProvider } from "./types";
import {
  type LifecycleHandler,
  withLifecycleCallbacks,
} from "./with-lifecycle-callbacks";

const resources = defineResources({ posts: {}, comments: {} });
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

/** Fixtures are shared across tests, so a callback that mutates one throws. */
const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const paramsFor: Record<Verb, Record<string, unknown>> = deepFreeze({
  getList: { filter: { q: "a" } },
  getOne: { id: 1 },
  create: { data: { title: "a" } },
  update: { id: 1, data: { title: "a" } },
  delete: { id: 1 },
  getMany: { ids: [1] },
  getManyReference: { target: "postId", id: 1 },
  updateMany: { ids: [1], data: { title: "a" } },
  deleteMany: { ids: [1] },
});

const resultFor: Record<Verb, Record<string, unknown>> = deepFreeze({
  getList: { data: [{ id: 1 }], total: 1 },
  getOne: { data: { id: 1 } },
  create: { data: { id: 1 } },
  update: { data: { id: 1 } },
  delete: { data: { id: 1 } },
  getMany: { data: [{ id: 1 }] },
  getManyReference: { data: [{ id: 1 }], total: 1 },
  updateMany: { data: [1] },
  deleteMany: { data: [1] },
});

type Stub = Record<Verb, ReturnType<typeof vi.fn>>;

function stubProvider() {
  const stub = {} as Stub;
  for (const verb of verbs) {
    stub[verb] = vi.fn(async () => resultFor[verb]);
  }
  return stub;
}

const asProvider = (stub: object) => stub as unknown as DataProvider<Resources>;

const cap = (verb: Verb) => verb.charAt(0).toUpperCase() + verb.slice(1);

/** Builds a handler with computed callback names, which the typed shape cannot express. */
const handler = (
  resource: string,
  callbacks: Record<string, unknown>,
): LifecycleHandler<Resources> =>
  ({ resource, ...callbacks }) as unknown as LifecycleHandler<Resources>;

const call = (wrapped: DataProvider<Resources>, verb: Verb) =>
  (wrapped[verb] as unknown as (r: string, p: unknown) => Promise<unknown>)(
    "posts",
    paramsFor[verb],
  );

const tag = (name: string) => (value: object) => ({
  ...value,
  tags: [...((value as { tags?: string[] }).tags ?? []), name],
});

describe("withLifecycleCallbacks", () => {
  it("before<Verb> rewrites the params the provider receives, for each of the nine verbs", async () => {
    for (const verb of verbs) {
      const stub = stubProvider();
      const before = vi.fn((params: object) => ({
        ...params,
        rewritten: true,
      }));
      const wrapped = withLifecycleCallbacks(asProvider(stub), [
        handler("posts", { [`before${cap(verb)}`]: before }),
      ]);

      const result = await call(wrapped, verb);

      expect(before).toHaveBeenCalledWith(paramsFor[verb], stub);
      expect(stub[verb]).toHaveBeenCalledExactlyOnceWith("posts", {
        ...paramsFor[verb],
        rewritten: true,
      });
      expect(result).toBe(resultFor[verb]);
    }
  });

  it("after<Verb> rewrites the result the caller receives, for each of the nine verbs", async () => {
    for (const verb of verbs) {
      const stub = stubProvider();
      const after = vi.fn((result: object) => ({ ...result, rewritten: true }));
      const wrapped = withLifecycleCallbacks(asProvider(stub), [
        handler("posts", { [`after${cap(verb)}`]: after }),
      ]);

      const result = await call(wrapped, verb);

      expect(stub[verb]).toHaveBeenCalledExactlyOnceWith(
        "posts",
        paramsFor[verb],
      );
      expect(after).toHaveBeenCalledWith(resultFor[verb], stub);
      expect(result).toEqual({ ...resultFor[verb], rewritten: true });
    }
  });

  it("a handler for another resource and a verb without a callback pass straight through", async () => {
    const stub = stubProvider();
    const beforeGetOne = vi.fn(tag("x"));
    const afterGetOne = vi.fn(tag("x"));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("comments", { beforeGetOne, afterGetOne }),
      handler("posts", { beforeGetOne, afterGetOne }),
    ]);

    const params = { filter: { q: "a" } };
    const list = await wrapped.getList("posts", params);
    const other = await wrapped.getOne("comments", { id: 1 });

    expect(stub.getList).toHaveBeenCalledExactlyOnceWith("posts", params);
    expect(list).toBe(resultFor.getList);
    expect(stub.getOne).toHaveBeenCalledExactlyOnceWith("comments", {
      id: 1,
      tags: ["x"],
    });
    expect(other).toEqual({ data: { id: 1 }, tags: ["x"] });
    expect(beforeGetOne).toHaveBeenCalledTimes(1);
    expect(afterGetOne).toHaveBeenCalledTimes(1);

    // The "posts" handler runs for posts, the "comments" one does not.
    await wrapped.getOne("posts", { id: 2 });

    expect(stub.getOne).toHaveBeenLastCalledWith("posts", {
      id: 2,
      tags: ["x"],
    });
    expect(beforeGetOne).toHaveBeenCalledTimes(2);
  });

  it('a "*" handler applies to every resource and runs with the named handlers in array order', async () => {
    const stub = stubProvider();
    stub.getOne.mockImplementation(async (_resource, params) => ({
      data: { id: params.id },
    }));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("*", { beforeGetOne: tag("b1"), afterGetOne: tag("a1") }),
      handler("posts", { beforeGetOne: tag("b2"), afterGetOne: tag("a2") }),
      handler("*", { beforeGetOne: tag("b3"), afterGetOne: tag("a3") }),
    ]);

    const posts = await wrapped.getOne("posts", { id: 1 });
    const comments = await wrapped.getOne("comments", { id: 2 });

    expect(stub.getOne).toHaveBeenNthCalledWith(1, "posts", {
      id: 1,
      tags: ["b1", "b2", "b3"],
    });
    expect(stub.getOne).toHaveBeenNthCalledWith(2, "comments", {
      id: 2,
      tags: ["b1", "b3"],
    });
    expect(posts).toEqual({ data: { id: 1 }, tags: ["a1", "a2", "a3"] });
    expect(comments).toEqual({ data: { id: 2 }, tags: ["a1", "a3"] });
  });

  it('a "*" handler applies to every verb', async () => {
    for (const verb of verbs) {
      const stub = stubProvider();
      const wrapped = withLifecycleCallbacks(asProvider(stub), [
        handler("*", {
          [`before${cap(verb)}`]: tag("b"),
          [`after${cap(verb)}`]: tag("a"),
        }),
      ]);

      const result = await call(wrapped, verb);

      expect(stub[verb]).toHaveBeenCalledExactlyOnceWith("posts", {
        ...paramsFor[verb],
        tags: ["b"],
      });
      expect(result).toEqual({ ...resultFor[verb], tags: ["a"] });
    }
  });

  it("async callbacks are awaited before the next step", async () => {
    const log: string[] = [];
    const stub = stubProvider();
    stub.getOne.mockImplementation(async () => {
      log.push("provider");
      return resultFor.getOne;
    });
    const later = () => new Promise((r) => setTimeout(r, 0));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("posts", {
        beforeGetOne: async (params: object) => {
          await later();
          log.push("before1");
          return tag("b1")(params);
        },
        afterGetOne: async (result: object) => {
          await later();
          log.push("after1");
          return tag("a1")(result);
        },
      }),
      handler("posts", {
        beforeGetOne: (params: object) => {
          log.push("before2");
          return tag("b2")(params);
        },
        afterGetOne: (result: object) => {
          log.push("after2");
          return tag("a2")(result);
        },
      }),
    ]);

    const result = await wrapped.getOne("posts", { id: 1 });

    expect(log).toEqual(["before1", "before2", "provider", "after1", "after2"]);
    expect(stub.getOne).toHaveBeenCalledWith("posts", {
      id: 1,
      tags: ["b1", "b2"],
    });
    expect(result).toEqual({ data: { id: 1 }, tags: ["a1", "a2"] });
  });

  it("a rejecting before callback rejects the call and the provider is never called", async () => {
    const stub = stubProvider();
    const error = new Error("nope");
    const second = vi.fn(tag("b2"));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("posts", {
        beforeGetOne: async () => {
          throw error;
        },
      }),
      handler("posts", { beforeGetOne: second }),
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(second).not.toHaveBeenCalled();
    expect(stub.getOne).not.toHaveBeenCalled();
  });

  it("a rejecting provider skips the after callbacks and rejects with the provider error", async () => {
    const stub = stubProvider();
    const error = new Error("server down");
    stub.getOne.mockRejectedValue(error);
    const afterGetOne = vi.fn(tag("a"));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("posts", { afterGetOne }),
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(afterGetOne).not.toHaveBeenCalled();
  });

  it("a rejecting after callback rejects the call", async () => {
    const stub = stubProvider();
    const error = new Error("bad result");
    const second = vi.fn(tag("a2"));
    const wrapped = withLifecycleCallbacks(asProvider(stub), [
      handler("posts", {
        afterGetOne: async () => {
          throw error;
        },
      }),
      handler("posts", { afterGetOne: second }),
    ]);

    await expect(wrapped.getOne("posts", { id: 1 })).rejects.toBe(error);

    expect(second).not.toHaveBeenCalled();
    expect(stub.getOne).toHaveBeenCalledTimes(1);
  });

  it("the dataProvider argument is the provider passed in, so calls on it skip the callbacks", async () => {
    const stub = stubProvider();
    const provider = asProvider(stub);
    const beforeGetOne = vi.fn(tag("b"));
    const wrapped = withLifecycleCallbacks(provider, [
      handler("posts", {
        beforeGetOne,
        afterGetOne: async (
          result: object,
          dataProvider: DataProvider<Resources>,
        ) => {
          expect(dataProvider).toBe(provider);
          expect(dataProvider).not.toBe(wrapped);
          await dataProvider.getOne("posts", { id: 2 });
          return result;
        },
      }),
    ]);

    await wrapped.getOne("posts", { id: 1 });

    expect(beforeGetOne).toHaveBeenCalledTimes(1);
    expect(stub.getOne).toHaveBeenCalledTimes(2);
    expect(stub.getOne).toHaveBeenLastCalledWith("posts", { id: 2 });
  });

  it("extra properties of the provider passed in survive and it is not mutated", async () => {
    const stub = stubProvider();
    const extra = { name: "rest" };
    const provider = Object.freeze({ ...stub, extra });
    const before = { ...provider };
    const wrapped = withLifecycleCallbacks(
      provider as unknown as DataProvider<Resources>,
      [handler("posts", { beforeGetOne: tag("b") })],
    );

    expect(wrapped).not.toBe(provider);
    expect((wrapped as unknown as { extra: unknown }).extra).toBe(extra);
    expect(wrapped.getOne).not.toBe(stub.getOne);
    expect(Object.keys(provider)).toEqual(Object.keys(before));
    for (const verb of verbs) {
      expect(provider[verb]).toBe(before[verb]);
    }
  });
});
