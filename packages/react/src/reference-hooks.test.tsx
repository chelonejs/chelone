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
  // Only the data queries: the many controller's inner list controller keeps
  // its own disabled observer on the matching getList key.
  const observerCount = (): number =>
    queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[1] === "getManyReference")
      .reduce((sum, query) => sum + query.getObserversCount(), 0);
  return {
    wrapper,
    dataProvider,
    observerCount,
    spy: vi.spyOn(dataProvider, "getManyReference"),
  };
}

describe("useReferenceManyFieldController", () => {
  it("lists the rows that point at the ambient record and reports total", async () => {
    const { wrapper, spy } = makeHarness({ id: 1, title: "one" });
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
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ target: "post_id", id: 1 }),
    );
  });

  it("setPage, setSort and setFilters reach getManyReference", async () => {
    const { wrapper, spy } = makeHarness({ id: 1 });
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
      expect(spy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
      ),
    );
    await waitFor(() =>
      expect(result.current.data?.map((row) => row.id)).toEqual([3, 4]),
    );

    act(() => result.current.setSort({ field: "body", order: "DESC" }));
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
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
      expect(spy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ filter: { body: "c" } }),
      ),
    );
  });

  it("follows a record whose id changes and releases the previous controller", async () => {
    const { wrapper, spy, observerCount } = makeHarness();
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps: { record: { id: 1 } } as RecordProps },
    );
    await waitFor(() => expect(result.current.total).toBe(5));
    expect(observerCount()).toBe(1);

    rerender({ record: { id: 2 } });
    await waitFor(() => expect(result.current.total).toBe(1));
    expect(result.current.data?.map((row) => row.id)).toEqual([6]);
    expect(spy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 2 }),
    );
    // The first controller's observer is gone; only the new one remains.
    expect(observerCount()).toBe(1);
  });

  it("with no record id fetches nothing", async () => {
    const { wrapper, spy, observerCount } = makeHarness();
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceManyFieldController<R, "comments">({
          reference: "comments",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps: { record: undefined } as RecordProps },
    );
    expect(result.current.data).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isPending).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(observerCount()).toBe(0);

    // A record that arrives late is picked up.
    rerender({ record: { id: 1 } });
    await waitFor(() => expect(result.current.total).toBe(5));
    expect(spy).toHaveBeenCalledTimes(1);
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
    expect(observerCount()).toBe(1);
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
    const { wrapper, spy } = makeHarness({ id: 1 });
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
    expect(spy).toHaveBeenCalledWith(
      "profiles",
      expect.objectContaining({
        target: "post_id",
        id: 1,
        pagination: { page: 1, perPage: 1 },
      }),
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

  it("follows a record whose id changes", async () => {
    const { wrapper, observerCount } = makeHarness();
    const { result, rerender } = renderHook(
      ({ record }: RecordProps) =>
        useReferenceOneFieldController<R, "profiles">({
          reference: "profiles",
          target: "post_id",
          record,
        }),
      { wrapper, initialProps: { record: { id: 1 } } as RecordProps },
    );
    await waitFor(() =>
      expect(result.current.referenceRecord).toMatchObject({ bio: "first" }),
    );

    rerender({ record: { id: 2 } });
    await waitFor(() =>
      expect(result.current.referenceRecord).toMatchObject({ bio: "other" }),
    );
    expect(observerCount()).toBe(1);
  });
});
