import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mountOne } from "./reference-field-test-harness";

describe("useReferenceOneFieldController", () => {
  it("resolves the first matching row", async () => {
    const { capture, referenceSpy } = mountOne({}, { id: 1 });
    expect(capture.result?.isPending).toBe(true);
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(capture.result?.error).toBeNull();
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
    const { capture, referenceSpy } = mountOne(
      { source: "author.id" },
      // The top-level id (99) matches no profile: the nested one does.
      { id: 99, author: { id: 1 } },
    );
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.referenceRecord).toMatchObject({
      id: 1,
      bio: "first",
    });
    expect(referenceSpy).toHaveBeenCalledWith(
      "profiles",
      expect.objectContaining({ id: 1 }),
    );
  });

  it("returns no record and no error when nothing matches", async () => {
    const { capture } = mountOne({}, { id: 3 });
    await vi.waitFor(() => expect(capture.result?.isPending).toBe(false));
    expect(capture.result?.referenceRecord).toBeUndefined();
    expect(capture.result?.error).toBeNull();
  });

  it("fetches nothing without a record", async () => {
    const { capture, referenceSpy, dataObserverCount } = mountOne();
    await nextTick();
    expect(capture.result?.isPending).toBe(false);
    expect(capture.result?.referenceRecord).toBeUndefined();
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(dataObserverCount()).toBe(0);
  });

  it("exposes a getManyReference rejection as error", async () => {
    const { capture } = mountOne({}, { id: 1 }, new Error("boom"));
    await vi.waitFor(() =>
      expect(capture.result?.error).toEqual(new Error("boom")),
    );
    expect(capture.result?.referenceRecord).toBeUndefined();
  });

  it("follows a record that arrives late or changes", async () => {
    const { capture, record, referenceSpy, dataObserverCount } = mountOne();
    expect(capture.result?.referenceRecord).toBeUndefined();

    record.value = { id: 1 };
    await vi.waitFor(() =>
      expect(capture.result?.referenceRecord).toMatchObject({ bio: "first" }),
    );

    record.value = { id: 2 };
    await vi.waitFor(() =>
      expect(capture.result?.referenceRecord).toMatchObject({ bio: "other" }),
    );
    expect(referenceSpy).toHaveBeenCalledTimes(2);
    expect(dataObserverCount()).toBe(1);
  });
});
