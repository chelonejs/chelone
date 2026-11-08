import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { UseInfiniteListControllerReturn } from "../controllers/use-infinite-list-controller";
import type { UseListControllerReturn } from "../controllers/use-list-controller";
import type { ListContextValue, useListContext } from "../list/list-context";
import type { useList } from "../list/use-list";
import { makeListContext } from "./list-context";

/** A test's own record type, pinned by the caller. */
type TagRecord = { id: number; name: string };

describe("makeListContext", () => {
  it("returns a whole ListContextValue, so a test provides it with no cast", () => {
    expectTypeOf(makeListContext()).toEqualTypeOf<ListContextValue>();
    expectTypeOf(
      makeListContext({ selectedIds: [1, 2], total: 0 }),
    ).toEqualTypeOf<ListContextValue>();
  });

  it("is generic over the record type the harness's rows carry", () => {
    // A test with its own record interface pins it and gets its own rows back,
    // still assignable to what `provideListContext` takes.
    expectTypeOf(makeListContext<TagRecord>().data).toEqualTypeOf<
      TagRecord[] | undefined
    >();
    expectTypeOf(
      makeListContext<TagRecord>({ data: [{ id: 1, name: "red" }] }),
    ).toMatchTypeOf<ListContextValue>();
    // The record type is pinned by the caller, never inferred from an override:
    // a bare call and one with rows are both the plain `ListContextValue`.
    const rows = [{ id: 1, name: "red" }];
    expectTypeOf(makeListContext()).toEqualTypeOf<ListContextValue>();
    expectTypeOf(
      makeListContext({ data: rows }),
    ).toEqualTypeOf<ListContextValue>();
    // @ts-expect-error a pinned record type is not the plain one's rows
    makeListContext<TagRecord>({ data: [{ id: 1, name: 2 }] });
  });

  it("takes an override of any field, each with the field's own type", () => {
    // A test's own row array flows in as a variable: `LooseRecord` checks the
    // id, and a fresh literal would be held to `LooseRecord` exactly.
    const rows = [{ id: 1, name: "red" }];
    expectTypeOf(
      makeListContext({
        page: 3,
        perPage: 25,
        sort: [{ field: "name", order: "DESC" }],
        filter: { name: "red" },
        displayedFilters: { name: true },
        selectedIds: ["a", 2],
        data: rows,
        total: 1,
        pageInfo: { hasNextPage: false },
        isPending: true,
        isFetching: true,
        error: new Error("boom"),
        hasNextPage: false,
        hasPreviousPage: true,
        defaultPerPage: 25,
        setPage: (page) => {
          expectTypeOf(page).toEqualTypeOf<number>();
        },
        setPerPage: () => {},
        setSort: () => {},
        setFilters: () => {},
        setParams: () => {},
        showFilter: () => {},
        hideFilter: () => {},
        select: () => {},
        toggleItem: () => {},
        unselectAll: () => {},
        selectAll: async () => {},
        refetch: () => {},
      }),
    ).toEqualTypeOf<ListContextValue>();
  });

  it("rejects an override that is not the field", () => {
    // @ts-expect-error page is a number, not a string
    makeListContext({ page: "3" });
    // @ts-expect-error sort is a payload array, not a bare field name
    makeListContext({ sort: "name" });
    // @ts-expect-error every record needs an id
    makeListContext({ data: [{ name: "no id" }] });
    // @ts-expect-error selectAll resolves void, so a sync one is not it
    makeListContext({ selectAll: () => {} });
    // @ts-expect-error not a field of ListContextValue (ra's old name)
    makeListContext({ onSelect: () => {} });
  });

  it("a live list controller is already a ListContextValue — a harness needs no cast", () => {
    // `ListContextValue` erases only the filter members, and `data` is
    // covariant, so a live controller feeds `provideListContext` as it is, and
    // so does an infinite one (extra fields, same surface) and `useList`.
    expectTypeOf<
      ReturnType<typeof useListContext<{ id: number; title: string }>>
    >().toMatchTypeOf<ListContextValue>();
    expectTypeOf<
      ReturnType<typeof useList<{ id: number; title: string }>>
    >().toMatchTypeOf<ListContextValue>();
    expectTypeOf<
      UseListControllerReturn<{ id: number; title: string }>
    >().toMatchTypeOf<ListContextValue>();
    expectTypeOf<
      UseInfiniteListControllerReturn<{ id: number; title: string }>
    >().toMatchTypeOf<ListContextValue>();
  });
});
