import { describe, expect, it } from "vitest";
import { getDirtyFormValues } from "./dirty-values";

const meta = (isDirty: boolean) => ({ isDirty });

describe("getDirtyFormValues", () => {
  it("returns only the fields marked dirty", () => {
    const result = getDirtyFormValues(
      { title: "New", views: 5, status: "draft" },
      { title: meta(true), views: meta(false) },
    );
    expect(result).toEqual({ title: "New" });
  });

  it("returns the whole top-level value when a nested path is dirty", () => {
    const result = getDirtyFormValues(
      { address: { city: "Lyon", zip: "69001" }, tags: ["a", "b"] },
      {
        "address.city": meta(true),
        "tags[1]": meta(true),
        "address.zip": meta(false),
      },
    );
    expect(result).toEqual({
      address: { city: "Lyon", zip: "69001" },
      tags: ["a", "b"],
    });
  });

  it("returns an empty object when nothing is dirty", () => {
    expect(getDirtyFormValues({ title: "x" }, { title: meta(false) })).toEqual(
      {},
    );
    expect(getDirtyFormValues({ title: "x" }, {})).toEqual({});
  });

  it("keeps a dirty field whose value was cleared to an empty string", () => {
    const result = getDirtyFormValues({ title: "" }, { title: meta(true) });
    expect(result).toEqual({ title: "" });
  });
});
