import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "../data/types";
import { addEventsForMutations } from "./add-events-for-mutations";
import type { RealtimeEvent } from "./types";

type Published = [topic: string, event: Omit<RealtimeEvent, "topic">];

const setup = (overrides: Partial<DataProvider> = {}) => {
  const published: Published[] = [];
  const publisher = {
    publish: vi.fn(
      async (topic: string, event: Omit<RealtimeEvent, "topic">) => {
        published.push([topic, event]);
      },
    ),
  };
  const base = {
    create: vi.fn(async () => ({ data: { id: 7, title: "new" } })),
    update: vi.fn(async () => ({ data: { id: 1, title: "edited" } })),
    delete: vi.fn(async () => ({ data: { id: 1, title: "gone" } })),
    updateMany: vi.fn(async () => ({ data: [1, 2] })),
    deleteMany: vi.fn(async () => ({ data: [1, 2] })),
    getList: vi.fn(async () => ({ data: [], total: 0 })),
    ...overrides,
  } as unknown as DataProvider;
  return {
    base,
    publisher,
    published,
    dp: addEventsForMutations(base, publisher),
  };
};

describe("addEventsForMutations", () => {
  it("create publishes created on the resource topic with the new id", async () => {
    const { dp, published } = setup();

    await expect(
      dp.create("posts", { data: { title: "new" } }),
    ).resolves.toEqual({ data: { id: 7, title: "new" } });

    expect(published).toEqual([
      ["resource/posts", { type: "created", payload: { ids: [7] } }],
    ]);
  });

  it("update publishes on the record topic and the resource topic", async () => {
    const { dp, published } = setup();

    await dp.update("posts", { id: 1, data: { title: "edited" } });

    expect(published).toEqual([
      [
        "resource/posts/1",
        {
          type: "updated",
          payload: { id: 1, data: { id: 1, title: "edited" } },
        },
      ],
      ["resource/posts", { type: "updated", payload: { ids: [1] } }],
    ]);
  });

  it("delete publishes previousData on the record topic and ids on the resource topic", async () => {
    const { dp, published } = setup();

    await dp.delete("posts", { id: 1 });

    expect(published).toEqual([
      [
        "resource/posts/1",
        {
          type: "deleted",
          payload: { id: 1, previousData: { id: 1, title: "gone" } },
        },
      ],
      ["resource/posts", { type: "deleted", payload: { ids: [1] } }],
    ]);
  });

  it("updateMany publishes on the resource topic and once per id on each record topic", async () => {
    // The base reports only id 1 as written, so the events follow the result.
    const { dp, published } = setup({
      updateMany: vi.fn(async () => ({ data: [1] })),
    } as Partial<DataProvider>);

    await expect(
      dp.updateMany("posts", { ids: [1, 2], data: { title: "x" } }),
    ).resolves.toEqual({ data: [1] });

    expect(published).toEqual([
      ["resource/posts", { type: "updated", payload: { ids: [1] } }],
      ["resource/posts/1", { type: "updated", payload: { id: 1 } }],
    ]);
  });

  it("deleteMany publishes on the resource topic and once per id on each record topic", async () => {
    const { dp, published } = setup();

    await dp.deleteMany("posts", { ids: [1, 2] });

    expect(published).toEqual([
      ["resource/posts", { type: "deleted", payload: { ids: [1, 2] } }],
      ["resource/posts/1", { type: "deleted", payload: { id: 1 } }],
      ["resource/posts/2", { type: "deleted", payload: { id: 2 } }],
    ]);
  });

  it("a rejected write publishes nothing", async () => {
    const failure = new Error("server said no");
    const { dp, publisher } = setup({
      update: vi.fn(async () => {
        throw failure;
      }),
    } as Partial<DataProvider>);

    await expect(dp.update("posts", { id: 1, data: {} })).rejects.toBe(failure);

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("a failing publish does not fail the mutation and reaches onError", async () => {
    const failure = new Error("socket closed");
    const publish = vi.fn(async () => {
      throw failure;
    });
    const onError = vi.fn();
    const { base } = setup();
    const dp = addEventsForMutations(base, { publish }, { onError });

    await expect(dp.create("posts", { data: {} })).resolves.toEqual({
      data: { id: 7, title: "new" },
    });

    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("leaves reads untouched", async () => {
    const { dp, base, publisher } = setup();

    await dp.getList("posts", {});

    expect(base.getList).toHaveBeenCalledWith("posts", {});
    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
