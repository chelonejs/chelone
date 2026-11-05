import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { UseListControllerResult } from "../controller-hooks";
import type { ListContextValue } from "../form";
import type { UseListResult } from "../use-list";
import { makeListContext } from "./list-context";

interface PostRecord {
  id: number;
  title: string;
}

describe("makeListContext", () => {
  it("returns a whole ListContextValue, so a test passes it with no cast", () => {
    expectTypeOf(makeListContext()).toEqualTypeOf<ListContextValue>();
    expectTypeOf(
      makeListContext({ selectedIds: [1, 2], total: 0 }),
    ).toEqualTypeOf<ListContextValue>();
  });

  it("is generic over the record type the harness's rows carry", () => {
    // A test with its own record interface pins it and gets its own rows back,
    // still assignable to what a `<ListContextProvider>` takes.
    expectTypeOf(makeListContext<PostRecord>().data).toEqualTypeOf<
      PostRecord[] | undefined
    >();
    expectTypeOf(
      makeListContext<PostRecord>({ data: [{ id: 1, title: "One" }] }),
    ).toMatchTypeOf<ListContextValue>();
    // The record type is pinned by the caller, never inferred from an override:
    // a bare call and one with rows are both the plain `ListContextValue`.
    const rows = [{ id: 1, title: "One" }];
    expectTypeOf(makeListContext()).toEqualTypeOf<ListContextValue>();
    expectTypeOf(
      makeListContext({ data: rows }),
    ).toEqualTypeOf<ListContextValue>();
    // @ts-expect-error a pinned record type is not the plain one's rows
    makeListContext<PostRecord>({ data: [{ id: 1, title: 2 }] });
  });

  it("takes an override of any field, each with the field's own type", () => {
    // A test's own row array flows in as a variable: `ResourceRecord` checks the
    // id, and a fresh literal would be held to `ResourceRecord` exactly.
    const rows = [{ id: 1, title: "One" }];
    expectTypeOf(
      makeListContext({
        page: 3,
        perPage: 25,
        sort: [{ field: "title", order: "DESC" }],
        filter: { author: "ann" },
        displayedFilters: { author: true },
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
    makeListContext({ sort: "title" });
    // @ts-expect-error every record needs an id
    makeListContext({ data: [{ title: "no id" }] });
    // @ts-expect-error selectAll resolves void, so a sync one is not it
    makeListContext({ selectAll: () => {} });
    // @ts-expect-error not a field of ListContextValue (ra's old name)
    makeListContext({ onSelect: () => {} });
  });

  it("a live list controller is already a ListContextValue — a harness needs no cast", () => {
    // The record type is the only difference, and `data` is covariant, so a
    // `useList`/`useListController` result feeds a `<ListContextProvider>` as it
    // is. This is what the button/field/table harnesses pass.
    expectTypeOf<
      UseListResult<{ id: number; title: string }>
    >().toMatchTypeOf<ListContextValue>();
    expectTypeOf<
      UseListControllerResult<LooseRecord>
    >().toMatchTypeOf<ListContextValue>();
  });
});
