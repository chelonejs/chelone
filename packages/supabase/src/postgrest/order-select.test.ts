import { describe, expect, it } from "vitest";
import { buildOrder, buildSelect } from "./order-select";

describe("buildOrder", () => {
  it("ASC and DESC give asc and desc with nulls last and first by default", () => {
    expect(buildOrder({ field: "name", order: "ASC" }, ["id"])).toBe(
      "name.asc.nullslast",
    );
    expect(buildOrder({ field: "name", order: "DESC" }, ["id"])).toBe(
      "name.desc.nullsfirst",
    );
  });

  it("the sortOrder option changes the null placement", () => {
    const sort = [
      { field: "a", order: "ASC" },
      { field: "b", order: "DESC" },
    ] as const;
    const order = (sortOrder: Parameters<typeof buildOrder>[2] = {}) =>
      buildOrder([...sort], ["id"], sortOrder);

    expect(order({ sortOrder: "AscendingNullsLastDescendingNullsFirst" })).toBe(
      "a.asc.nullslast,b.desc.nullsfirst",
    );
    expect(order({ sortOrder: "AscendingNullsFirstDescendingNullsLast" })).toBe(
      "a.asc.nullsfirst,b.desc.nullslast",
    );
    expect(
      order({ sortOrder: "AscendingNullsFirstDescendingNullsFirst" }),
    ).toBe("a.asc.nullsfirst,b.desc.nullsfirst");
    expect(order({ sortOrder: "AscendingNullsLastDescendingNullsLast" })).toBe(
      "a.asc.nullslast,b.desc.nullslast",
    );
  });

  it("meta.nullsfirst and meta.nullslast override the placement", () => {
    const sort = { field: "name", order: "ASC" } as const;

    expect(buildOrder(sort, ["id"], { meta: { nullsfirst: true } })).toBe(
      "name.asc.nullsfirst",
    );
    expect(
      buildOrder({ field: "name", order: "DESC" }, ["id"], {
        meta: { nullslast: true },
      }),
    ).toBe("name.desc.nullslast");
    expect(
      buildOrder(
        [
          { field: "a", order: "ASC" },
          { field: "b", order: "ASC" },
        ],
        ["id"],
        { meta: { nullsfirst: ["b"] } },
      ),
    ).toBe("a.asc.nullslast,b.asc.nullsfirst");
  });

  it("a sort array joins its keys with commas in order", () => {
    expect(
      buildOrder(
        [
          { field: "b", order: "DESC" },
          { field: "a", order: "ASC" },
        ],
        ["id"],
      ),
    ).toBe("b.desc.nullsfirst,a.asc.nullslast");
  });

  it("a sort on id expands to every primary key column", () => {
    expect(buildOrder({ field: "id", order: "DESC" }, ["org", "slug"])).toBe(
      "org.desc.nullsfirst,slug.desc.nullsfirst",
    );
    expect(
      buildOrder(
        [
          { field: "name", order: "ASC" },
          { field: "id", order: "ASC" },
        ],
        ["uuid"],
      ),
    ).toBe("name.asc.nullslast,uuid.asc.nullslast");
  });

  it("gives undefined when there is no sort", () => {
    expect(buildOrder(undefined, ["id"])).toBeUndefined();
    expect(buildOrder([], ["id"])).toBeUndefined();
  });
});

describe("buildSelect", () => {
  it("joins meta.columns and appends each meta.embed, starting from * when there are no columns", () => {
    expect(buildSelect(undefined)).toBe("*");
    expect(buildSelect({ columns: ["id", "name"] })).toBe("id,name");
    expect(buildSelect({ columns: ["id"], embed: ["author", "tags"] })).toBe(
      "id,author(*),tags(*)",
    );
    expect(buildSelect({ embed: ["author"] })).toBe("*,author(*)");
  });
});
