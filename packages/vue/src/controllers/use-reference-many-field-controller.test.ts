import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { mountMany } from "./reference-field-test-harness";

describe("useReferenceManyFieldController", () => {
  it("lists the rows that point at the ambient record and reports total", async () => {
    const { capture, referenceSpy } = mountMany({ perPage: 2 }, { id: 1 });
    expect(capture.result?.isPending).toBe(true);
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.data?.map((row) => row.id)).toEqual([1, 2]);
    expect(capture.result?.total).toBe(5);
    expect(referenceSpy).toHaveBeenCalledTimes(1);
    expect(referenceSpy).toHaveBeenCalledWith(
      "comments",
      expect.objectContaining({ target: "post_id", id: 1 }),
    );
  });

  it("exposes a getManyReference rejection as error", async () => {
    const { capture } = mountMany({}, { id: 1 }, new Error("boom"));
    await vi.waitFor(() =>
      expect(capture.result?.error).toEqual(new Error("boom")),
    );
    expect(capture.result?.data).toBeUndefined();
  });

  it("setPage, setSort and setFilters reach getManyReference", async () => {
    const { capture, referenceSpy } = mountMany({ perPage: 2 }, { id: 1 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));

    capture.result?.setPage(2);
    await vi.waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ pagination: { page: 2, perPage: 2 } }),
      ),
    );
    await vi.waitFor(() =>
      expect(capture.result?.data?.map((row) => row.id)).toEqual([3, 4]),
    );

    capture.result?.setSort({ field: "body", order: "DESC" });
    await vi.waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
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
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({ filter: { body: "c" } }),
      ),
    );
    await vi.waitFor(() =>
      expect(capture.result?.data?.map((row) => row.body)).toEqual(["c"]),
    );
    expect(capture.result?.total).toBe(1);
  });

  it("the foreign key is read from a nested source", async () => {
    // The top-level id (99) matches nothing: total 5 proves the nested read.
    const { capture, referenceSpy } = mountMany(
      { source: "author.id" },
      { id: 99, author: { id: 1 } },
    );
    await vi.waitFor(() => expect(capture.result?.total).toBe(5));
    expect(referenceSpy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 1 }),
    );

    // The bracket grammar reads the same kind of path.
    const bracketed = mountMany(
      { source: "tags[0].id" },
      { id: 99, tags: [{ id: 2 }] },
    );
    await vi.waitFor(() => expect(bracketed.capture.result?.total).toBe(1));
    expect(bracketed.capture.result?.data?.map((row) => row.id)).toEqual([6]);
  });

  it("follows a record that arrives late or changes and releases the previous subscription", async () => {
    const { capture, record, referenceSpy, observerCount, dataObserverCount } =
      mountMany();
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(dataObserverCount()).toBe(0);

    record.value = { id: 1 };
    await vi.waitFor(() => expect(capture.result?.total).toBe(5));
    const attached = observerCount();
    expect(dataObserverCount()).toBe(1);

    record.value = { id: 2 };
    await vi.waitFor(() => expect(capture.result?.total).toBe(1));
    expect(capture.result?.data?.map((row) => row.id)).toEqual([6]);
    expect(referenceSpy).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ id: 2 }),
    );
    expect(referenceSpy).toHaveBeenCalledTimes(2);
    // The first controller's observers are gone; only the new one's remain.
    expect(dataObserverCount()).toBe(1);
    expect(observerCount()).toBe(attached);
  });

  it("actions keep their identity after the id changes", async () => {
    const { capture, record, referenceSpy } = mountMany(
      { perPage: 2 },
      { id: 1 },
    );
    await vi.waitFor(() => expect(capture.result?.total).toBe(5));
    const before = capture.result?.setPage;
    const beforeRefetch = capture.result?.refetch;

    record.value = { id: 2 };
    await vi.waitFor(() => expect(capture.result?.total).toBe(1));
    expect(capture.result?.setPage).toBe(before);
    expect(capture.result?.refetch).toBe(beforeRefetch);

    // The old reference still drives the controller built for the new id.
    referenceSpy.mockClear();
    before?.(1);
    capture.result?.setSort({ field: "body", order: "DESC" });
    await vi.waitFor(() =>
      expect(referenceSpy).toHaveBeenLastCalledWith(
        "comments",
        expect.objectContaining({
          id: 2,
          sort: { field: "body", order: "DESC" },
        }),
      ),
    );
  });

  it("stays bound when the record changes inside another scope that then stops", async () => {
    const { capture, record, dataObserverCount } = mountMany({}, { id: 1 });
    await vi.waitFor(() => expect(capture.result?.total).toBe(5));

    // The sync watcher rebinds inside whatever scope is active, as when a
    // child's onMounted sets the record and the child is then unmounted.
    const other = effectScope();
    other.run(() => {
      record.value = { id: 2 };
    });
    other.stop();

    await vi.waitFor(() => expect(capture.result?.total).toBe(1));
    expect(capture.result?.data?.map((row) => row.id)).toEqual([6]);
    expect(dataObserverCount()).toBe(1);
  });

  it("with no record id fetches nothing", async () => {
    // Wire-shaped on purpose: a record off the wire can have no id key.
    const noId = JSON.parse('{"title":"no id"}');
    const { capture, referenceSpy, dataObserverCount } = mountMany({}, noId);
    await nextTick();
    expect(capture.result?.data).toEqual([]);
    expect(capture.result?.total).toBe(0);
    expect(capture.result?.isPending).toBe(false);
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(dataObserverCount()).toBe(0);
  });

  it("scope disposal releases every observer", async () => {
    const { wrapper, capture, observerCount } = mountMany({}, { id: 1 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(observerCount()).toBeGreaterThan(0);
    wrapper.unmount();
    expect(observerCount()).toBe(0);
  });
});
