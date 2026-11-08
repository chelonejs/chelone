import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import type { ListContextValue } from "./form";
import { RecordContextProvider } from "./record/record-context";
import {
  type UseReferenceManyFieldControllerResult,
  useReferenceManyFieldController,
  useReferenceOneFieldController,
} from "./reference-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: {
    schema: z.object({
      id: z.number(),
      post_id: z.number(),
      body: z.string(),
    }),
  },
  profiles: {
    schema: z.object({
      id: z.number(),
      post_id: z.number(),
      bio: z.string(),
    }),
  },
});
type R = typeof resources;

const comments = [
  { id: 1, post_id: 1, body: "a" },
  { id: 2, post_id: 1, body: "b" },
  { id: 3, post_id: 1, body: "c" },
  { id: 4, post_id: 1, body: "d" },
  { id: 5, post_id: 1, body: "e" },
  { id: 6, post_id: 2, body: "f" },
];

const profiles = [
  { id: 1, post_id: 1, bio: "first" },
  { id: 2, post_id: 1, bio: "second" },
  { id: 3, post_id: 2, bio: "other" },
];

type RecordProps = { record: { id: number } | undefined };

function makeHarness(record?: Record<string, unknown>) {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "one" },
      { id: 2, title: "two" },
      { id: 3, title: "three" },
    ],
    comments: structuredClone(comments),
    profiles: structuredClone(profiles),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider dataProvider={dataProvider} queryClient={queryClient}>
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
  const observerCount = (keyPart?: string): number =>
    queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => keyPart === undefined || query.queryKey[1] === keyPart)
      .reduce((sum, query) => sum + query.getObserversCount(), 0);
  return {
    wrapper,
    dataProvider,
    // Every observer, the many controller's inner list observer included.
    observerCount: () => observerCount(),
    // Only the observers that fetch.
    dataObserverCount: () => observerCount("getManyReference"),
    referenceSpy: vi.spyOn(dataProvider, "getManyReference"),
  };
}

describe("useReferenceManyFieldController", () => {
  it("lists the rows that point at the ambient record and reports total", async () => {
    const { wrapper, referenceSpy } = makeHarness({ id: 1, title: "one" });
    const { result } = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          perPage: 2,
        }),
      { wrapper },
    );
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.map((row) => row.id)).toEqual([1, 2]);
    expect(result.current.total).toBe(5);
    expect(referenceSpy).toHaveBeenCalledTimes(1);
    expect(referenceSpy).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ target: "post_id", id: 1 }),
    );
  });

  it("exposes a getManyReference rejection as error", async () => {
    const { wrapper, referenceSpy } = makeHarness({ id: 1 });
    referenceSpy.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
        }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.error).toEqual(new Error("boom")),
    );
    expect(result.current.data).toBeUndefined();
  });

  it("setPage, setSort and setFilters reach getManyReference", async () => {
    const { wrapper, referenceSpy } = makeHarness({ id: 1 });
    const { result } = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          perPage: 2,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
      ),
    );
    await waitFor(() =>
      expect(result.current.data?.map((row) => row.id)).toEqual([3, 4]),
    );

    act(() => result.current.setSort({ field: "body", order: "DESC" }));
    await waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({
          sort: { field: "body", order: "DESC" },
          pagination: { page: 1, perPage: 2 },
        }),
      ),
    );
    await waitFor(() =>
      expect(result.current.data?.map((row) => row.body)).toEqual(["e", "d"]),
    );

    act(() => result.current.setFilters({ body: "c" }));
    await waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ filter: { body: "c" } }),
      ),
    );
    await waitFor(() =>
      expect(result.current.data?.map((row) => row.body)).toEqual(["c"]),
    );
    expect(result.current.total).toBe(1);
  });

  it("the foreign key is read from a nested source", async () => {
    const { wrapper, referenceSpy } = makeHarness();
    const { result } = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          source: "author.id",
          // The top-level id (99) matches nothing: total 5 proves the read.
          record: { id: 99, author: { id: 1 } },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.total).toBe(5);
    expect(referenceSpy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 1 }),
    );

    // The bracket grammar reads the same kind of path.
    const bracketed = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          source: "tags[0].id",
          record: { id: 99, tags: [{ id: 2 }] },
        }),
      { wrapper },
    );
    await waitFor(() => expect(bracketed.result.current.total).toBe(1));
    expect(bracketed.result.current.data?.map((row) => row.id)).toEqual([6]);
  });

  it("follows a record whose id changes and releases the previous controller", async () => {
    const { wrapper, referenceSpy, observerCount, dataObserverCount } =
      makeHarness();
    const initialProps: RecordProps = { record: { id: 1 } };
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps },
    );
    await waitFor(() => expect(result.current.total).toBe(5));
    const attached = observerCount();
    expect(dataObserverCount()).toBe(1);

    rerender({ record: { id: 2 } });
    await waitFor(() => expect(result.current.total).toBe(1));
    expect(result.current.data?.map((row) => row.id)).toEqual([6]);
    expect(referenceSpy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 2 }),
    );
    expect(referenceSpy).toHaveBeenCalledTimes(2);
    // The first controller's observers are gone; only the new one's remain.
    expect(dataObserverCount()).toBe(1);
    expect(observerCount()).toBe(attached);
  });

  it("with no record id fetches nothing", async () => {
    const { wrapper, referenceSpy, dataObserverCount } = makeHarness();
    const initialProps: RecordProps = { record: undefined };
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps },
    );
    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isPending).toBe(false);
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(dataObserverCount()).toBe(0);

    // A record that arrives late is picked up.
    rerender({ record: { id: 1 } });
    await waitFor(() => expect(result.current.total).toBe(5));
    expect(referenceSpy).toHaveBeenCalledTimes(1);
  });

  it("unmount releases every observer", async () => {
    const { wrapper, observerCount } = makeHarness({ id: 1 });
    const { result, unmount } = renderHook(
      () =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(observerCount()).toBeGreaterThan(0);
    unmount();
    expect(observerCount()).toBe(0);
  });

  it("UseReferenceManyFieldControllerResult is assignable to ListContextValue", () => {
    expectTypeOf<
      UseReferenceManyFieldControllerResult<{ id: number; body: string }>
    >().toExtend<ListContextValue>();
  });
});

describe("useReferenceOneFieldController", () => {
  it("resolves the first matching row", async () => {
    const { wrapper, referenceSpy } = makeHarness({ id: 1 });
    const { result } = renderHook(
      () =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
        }),
      { wrapper },
    );
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(result.current.error).toBeNull();
    expect(referenceSpy).toHaveBeenCalledTimes(1);
    expect(referenceSpy).toHaveBeenCalledWith(
      "profiles",
      expect.objectContaining({
        target: "post_id",
        id: 1,
        pagination: { page: 1, perPage: 1 },
      }),
    );
  });

  it("the foreign key is read from a nested source", async () => {
    const { wrapper, referenceSpy } = makeHarness();
    const { result } = renderHook(
      () =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
          source: "author.id",
          // The top-level id (99) matches no profile: the nested one does.
          record: { id: 99, author: { id: 1 } },
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(referenceSpy).toHaveBeenCalledWith(
      "profiles",
      expect.objectContaining({ id: 1 }),
    );
  });

  it("returns no record and no error when nothing matches", async () => {
    const { wrapper } = makeHarness({ id: 3 });
    const { result } = renderHook(
      () =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.referenceRecord).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("fetches nothing without a record", () => {
    const { wrapper, referenceSpy, observerCount } = makeHarness();
    const { result } = renderHook(
      () =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
        }),
      { wrapper },
    );
    expect(result.current.isPending).toBe(false);
    expect(result.current.referenceRecord).toBeUndefined();
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(observerCount()).toBe(0);
  });

  it("exposes a getManyReference rejection as error", async () => {
    const { wrapper, referenceSpy } = makeHarness({ id: 1 });
    referenceSpy.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(
      () =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
        }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.error).toEqual(new Error("boom")),
    );
    expect(result.current.referenceRecord).toBeUndefined();
  });

  it("follows a record whose id changes", async () => {
    const { wrapper, referenceSpy, observerCount } = makeHarness();
    const initialProps: RecordProps = { record: { id: 1 } };
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps },
    );
    await waitFor(() =>
      expect(result.current.referenceRecord).toMatchObject({ bio: "first" }),
    );

    rerender({ record: { id: 2 } });
    await waitFor(() =>
      expect(result.current.referenceRecord).toMatchObject({ bio: "other" }),
    );
    expect(referenceSpy).toHaveBeenCalledTimes(2);
    expect(observerCount()).toBe(1);
  });
});
