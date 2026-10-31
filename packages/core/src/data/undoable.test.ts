import { QueryClient } from "@tanstack/query-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { removeRecordsFromCache } from "./cache-ops";
import { listKey, oneKey } from "./keys";
import {
  commitAllUndoables,
  hasPendingUndoables,
  startUndoableMutation,
} from "./undoable";

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

/** Seed a oneKey cache entry so the snapshot has something to restore. */
const seedOne = (qc: QueryClient, id: number, record: unknown) =>
  qc.setQueryData(oneKey("posts", { id }), record);

afterEach(async () => {
  // Drain any handle a test left pending so the module registry stays clean.
  await commitAllUndoables();
});

describe("startUndoableMutation", () => {
  it("applies the optimistic change to the cache immediately", () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit,
    });

    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toBeUndefined();
    expect(commit).not.toHaveBeenCalled();
  });

  it("undo() rolls the cache back and NEVER calls the server", () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () => qc.setQueryData(oneKey("posts", { id: 1 }), null),
      commit,
    });
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toBeNull();

    handle.undo();

    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "a",
    });
    expect(commit).toHaveBeenCalledTimes(0);
    expect(handle.isPending).toBe(false);
  });

  it("commit() calls the server EXACTLY once and keeps the optimistic cache", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit,
    });

    await handle.commit();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toBeUndefined();
    expect(handle.isPending).toBe(false);
  });

  it("double commit() is a no-op — server called once, same promise returned", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1 });
    const commit = vi.fn().mockResolvedValue({ id: 1, ok: true });

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () => {},
      commit,
    });

    const p1 = handle.commit();
    const p2 = handle.commit();
    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("commit() after undo() is a no-op — server stays untouched", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit,
    });

    handle.undo();
    await expect(handle.commit()).resolves.toBeUndefined();
    expect(commit).toHaveBeenCalledTimes(0);
    // undo already restored it
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "a",
    });
  });

  it("undo() after commit() is a no-op (already settled)", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit,
    });

    await handle.commit();
    handle.undo(); // no-op — must not resurrect the cache entry
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toBeUndefined();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("commit() error rolls the cache back and re-throws", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "a" });
    const commit = vi.fn().mockRejectedValue(new Error("server said no"));

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit,
    });

    await expect(handle.commit()).rejects.toThrow("server said no");
    expect(commit).toHaveBeenCalledTimes(1);
    // rolled back to the snapshot
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "a",
    });
  });

  it("multiple pending undoables are independent (undo one, commit the other)", async () => {
    const qc = makeClient();
    seedOne(qc, 1, { id: 1, title: "one" });
    seedOne(qc, 2, { id: 2, title: "two" });
    const commit1 = vi.fn().mockResolvedValue({ id: 1 });
    const commit2 = vi.fn().mockResolvedValue({ id: 2 });

    const h1 = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 1 }) }),
      commit: commit1,
    });
    const h2 = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 2 })],
      applyOptimistic: () =>
        qc.removeQueries({ queryKey: oneKey("posts", { id: 2 }) }),
      commit: commit2,
    });

    h1.undo();
    await h2.commit();

    expect(commit1).toHaveBeenCalledTimes(0);
    expect(commit2).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "one",
    });
    expect(qc.getQueryData(oneKey("posts", { id: 2 }))).toBeUndefined();
  });

  const seedPosts = () => {
    const qc = makeClient();
    qc.setQueryData(listKey("posts"), {
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 3,
    });
    return qc;
  };
  const ids = (qc: QueryClient) =>
    (
      qc.getQueryData(listKey("posts")) as { data: Array<{ id: number }> }
    ).data.map((record) => record.id);
  /** Deletes one row the way the adapters do: the resource root as `queryKeys`. */
  const deletePost = (
    qc: QueryClient,
    id: number,
    commit: () => Promise<unknown> = () => Promise.resolve({ id }),
  ) =>
    startUndoableMutation({
      queryClient: qc,
      queryKeys: [["posts"]],
      applyOptimistic: () => removeRecordsFromCache(qc, "posts", [id]),
      commit,
    });

  it("undoing the first of two overlapping undoables keeps the second's optimistic change", async () => {
    const qc = seedPosts();
    const first = deletePost(qc, 1);
    const second = deletePost(qc, 2);

    first.undo();
    expect(ids(qc)).toEqual([1, 3]);

    await second.commit();
    expect(ids(qc)).toEqual([1, 3]);
  });

  it("undoing two overlapping undoables in start order restores the original cache", () => {
    const qc = seedPosts();
    const first = deletePost(qc, 1);
    const second = deletePost(qc, 2);

    first.undo();
    second.undo();

    expect(ids(qc)).toEqual([1, 2, 3]);
  });

  it("undoing two overlapping undoables newest first restores the original cache", () => {
    const qc = seedPosts();
    const first = deletePost(qc, 1);
    const second = deletePost(qc, 2);

    second.undo();
    first.undo();

    expect(ids(qc)).toEqual([1, 2, 3]);
  });

  it("a failed commit keeps a later pending undoable's optimistic change", async () => {
    const qc = seedPosts();
    const first = deletePost(qc, 1, () => Promise.reject(new Error("boom")));
    const second = deletePost(qc, 2);

    await expect(first.commit()).rejects.toThrow("boom");

    expect(ids(qc)).toEqual([1, 3]);
    await second.commit();
    expect(ids(qc)).toEqual([1, 3]);
  });

  it("undoing an undoable leaves a later one on unrelated keys alone", () => {
    const qc = seedPosts();
    const comments = startUndoableMutation({
      queryClient: qc,
      queryKeys: [["comments"]],
      applyOptimistic: () => {},
      commit: () => Promise.resolve({}),
    });
    deletePost(qc, 2);
    qc.setQueryData(listKey("posts"), {
      data: [{ id: 1 }, { id: 3 }, { id: 4 }],
      total: 3,
    });

    comments.undo();

    expect(ids(qc)).toEqual([1, 3, 4]);
  });

  it("undoing an earlier undoable keeps a later committed one's change", async () => {
    const qc = seedPosts();
    const first = deletePost(qc, 1);
    const second = deletePost(qc, 2);

    await second.commit();
    first.undo();

    expect(ids(qc)).toEqual([1, 3]);
  });
});

describe("pending undoables registry", () => {
  it("tracks pending state and clears on settle", () => {
    const qc = makeClient();
    expect(hasPendingUndoables()).toBe(false);

    const handle = startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () => {},
      commit: vi.fn().mockResolvedValue({ id: 1 }),
    });
    expect(hasPendingUndoables()).toBe(true);

    handle.undo();
    expect(hasPendingUndoables()).toBe(false);
  });

  it("commitAllUndoables commits every pending mutation exactly once", async () => {
    const qc = makeClient();
    const commit1 = vi.fn().mockResolvedValue({ id: 1 });
    const commit2 = vi.fn().mockResolvedValue({ id: 2 });

    startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () => {},
      commit: commit1,
    });
    startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 2 })],
      applyOptimistic: () => {},
      commit: commit2,
    });
    expect(hasPendingUndoables()).toBe(true);

    await commitAllUndoables();

    expect(commit1).toHaveBeenCalledTimes(1);
    expect(commit2).toHaveBeenCalledTimes(1);
    expect(hasPendingUndoables()).toBe(false);
  });

  it("commitAllUndoables never rejects even if a commit fails", async () => {
    const qc = makeClient();
    const commit = vi.fn().mockRejectedValue(new Error("boom"));
    startUndoableMutation({
      queryClient: qc,
      queryKeys: [oneKey("posts", { id: 1 })],
      applyOptimistic: () => {},
      commit,
    });

    await expect(commitAllUndoables()).resolves.toBeUndefined();
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
