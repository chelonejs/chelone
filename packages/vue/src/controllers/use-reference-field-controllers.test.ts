import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  provideRecordContext,
  type RecordValue,
} from "../record/record-context";
import {
  type UseReferenceManyFieldControllerOptions,
  type UseReferenceManyFieldControllerReturn,
  useReferenceManyFieldController,
} from "./use-reference-many-field-controller";
import {
  type UseReferenceOneFieldControllerOptions,
  type UseReferenceOneFieldControllerReturn,
  useReferenceOneFieldController,
} from "./use-reference-one-field-controller";

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
type Resources = typeof resources;
type Comment = { id: number; post_id: number; body: string };
type Profile = { id: number; post_id: number; bio: string };

const comments: Comment[] = [
  { id: 1, post_id: 1, body: "a" },
  { id: 2, post_id: 1, body: "b" },
  { id: 3, post_id: 1, body: "c" },
  { id: 4, post_id: 1, body: "d" },
  { id: 5, post_id: 1, body: "e" },
  { id: 6, post_id: 2, body: "f" },
];

const profiles: Profile[] = [
  { id: 1, post_id: 1, bio: "first" },
  { id: 2, post_id: 1, bio: "second" },
  { id: 3, post_id: 2, bio: "other" },
];

/**
 * Mount a composable under a real `<Admin>`, with an ambient record published
 * by an ancestor (`provide` only reaches descendants) whose ref the test can
 * set later.
 */
function mountProbe<TResult>(
  useProbe: () => TResult,
  initialRecord?: RecordValue,
) {
  const capture: { result?: TResult } = {};
  const record: Ref<RecordValue> = ref(initialRecord);
  const dataProvider = fakeDataProvider<Resources>({
    posts: [
      { id: 1, title: "one" },
      { id: 2, title: "two" },
    ],
    comments: structuredClone(comments),
    profiles: structuredClone(profiles),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const spy = vi.spyOn(dataProvider, "getManyReference");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });

  const Probe = defineComponent({
    setup() {
      capture.result = useProbe();
      return () => null;
    },
  });
  const RecordProvider = defineComponent({
    setup() {
      provideRecordContext(record);
      return () => h(Probe);
    },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(RecordProvider) },
      ),
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
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
    capture,
    record,
    observerCount,
    spy,
  };
}

const mountMany = (
  options: Omit<
    UseReferenceManyFieldControllerOptions<"comments">,
    "reference" | "target"
  > = {},
  record?: RecordValue,
) =>
  mountProbe<UseReferenceManyFieldControllerReturn<Comment>>(
    () =>
      useReferenceManyFieldController<Resources, "comments">({
        reference: "comments",
        target: "post_id",
        ...options,
      }),
    record,
  );

const mountOne = (
  options: Omit<
    UseReferenceOneFieldControllerOptions<"profiles">,
    "reference" | "target"
  > = {},
  record?: RecordValue,
) =>
  mountProbe<UseReferenceOneFieldControllerReturn<Profile>>(
    () =>
      useReferenceOneFieldController<Resources, "profiles">({
        reference: "profiles",
        target: "post_id",
        ...options,
      }),
    record,
  );

describe("useReferenceManyFieldController", () => {
  it("lists the rows that point at the ambient record and reports total", async () => {
    const { capture, spy } = mountMany({ perPage: 2 }, { id: 1 });
    expect(capture.result?.isPending).toBe(true);
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.data?.map((row) => row.id)).toEqual([1, 2]);
    expect(capture.result?.total).toBe(5);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ target: "post_id", id: 1 }),
    );
  });

  it("setPage, setSort and setFilters reach getManyReference", async () => {
    const { capture, spy } = mountMany({ perPage: 2 }, { id: 1 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));

    capture.result?.setPage(2);
    await vi.waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
      ),
    );
    await vi.waitFor(() =>
      expect(capture.result?.data?.map((row) => row.id)).toEqual([3, 4]),
    );

    capture.result?.setSort({ field: "body", order: "DESC" });
    await vi.waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({
          sort: { field: "body", order: "DESC" },
          pagination: { page: 1, perPage: 2 },
        }),
      ),
    );
    await vi.waitFor(() =>
      expect(capture.result?.data?.map((row) => row.body)).toEqual(["e", "d"]),
    );

    capture.result?.setFilters({ body: "c" });
    await vi.waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ filter: { body: "c" } }),
      ),
    );
  });

  it("follows a record that arrives late or changes and releases the previous subscription", async () => {
    const { capture, record, spy, observerCount } = mountMany();
    expect(spy).not.toHaveBeenCalled();
    expect(observerCount()).toBe(0);

    record.value = { id: 1 };
    await vi.waitFor(() => expect(capture.result?.total).toBe(5));
    expect(observerCount()).toBe(1);

    record.value = { id: 2 };
    await vi.waitFor(() => expect(capture.result?.total).toBe(1));
    expect(capture.result?.data?.map((row) => row.id)).toEqual([6]);
    expect(spy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 2 }),
    );
    // The first controller's observer is gone; only the new one remains.
    expect(observerCount()).toBe(1);
  });

  it("with no record id fetches nothing", async () => {
    // A record with no id key: LooseRecord requires one, so the fixture is cast.
    const noId = { title: "no id" } as unknown as RecordValue;
    const { capture, spy, observerCount } = mountMany({}, noId);
    await nextTick();
    expect(capture.result?.data).toEqual([]);
    expect(capture.result?.total).toBe(0);
    expect(capture.result?.isPending).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(observerCount()).toBe(0);
  });

  it("scope disposal releases every observer", async () => {
    const { wrapper, capture, observerCount } = mountMany({}, { id: 1 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(observerCount()).toBe(1);
    wrapper.unmount();
    expect(observerCount()).toBe(0);
  });
});

describe("useReferenceOneFieldController", () => {
  it("resolves the first matching row", async () => {
    const { capture, spy } = mountOne({}, { id: 1 });
    expect(capture.result?.isPending).toBe(true);
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(capture.result?.error).toBeNull();
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
    const { capture } = mountOne({}, { id: 3 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.referenceRecord).toBeUndefined();
    expect(capture.result?.error).toBeNull();
  });

  it("follows a record that arrives late or changes", async () => {
    const { capture, record, observerCount } = mountOne();
    expect(capture.result?.referenceRecord).toBeUndefined();

    record.value = { id: 1 };
    await vi.waitFor(() =>
      expect(capture.result?.referenceRecord).toMatchObject({ bio: "first" }),
    );

    record.value = { id: 2 };
    await vi.waitFor(() =>
      expect(capture.result?.referenceRecord).toMatchObject({ bio: "other" }),
    );
    expect(observerCount()).toBe(1);
  });
});
