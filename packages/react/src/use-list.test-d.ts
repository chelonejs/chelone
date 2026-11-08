import {
  defineResources,
  type FilterPayload,
  type Identifier,
  type ListParamsPatch,
  type LooseRecord,
  type SortPayload,
} from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { ListContextValue } from "./form";
import {
  useReferenceManyFieldController,
  useReferenceOneFieldController,
} from "./reference-hooks";
import type { UseListOptions, UseListResult } from "./use-list";
import { useList } from "./use-list";

interface Row {
  id: number;
  name: string;
}

declare const result: UseListResult<Row>;

it("useList returns a UseListResult assignable to ListContextValue", () => {
  // Drop-in for <ListContextProvider value={...}> — same erased shape.
  expectTypeOf<UseListResult<Row>>().toExtend<ListContextValue>();
  expectTypeOf(result.data).toEqualTypeOf<Row[] | undefined>();
  expectTypeOf(result.total).toEqualTypeOf<number | undefined>();
  expectTypeOf(result.page).toBeNumber();
  expectTypeOf(result.perPage).toBeNumber();
  expectTypeOf(result.sort).toEqualTypeOf<SortPayload<Row>[]>();
  // The hook is generic over the record, so its filter is keyed by the record.
  expectTypeOf(result.filter).toEqualTypeOf<FilterPayload<Row>>();
  expectTypeOf(result.selectedIds).toEqualTypeOf<Identifier[]>();
  expectTypeOf(result.isPending).toBeBoolean();
});

it("useList options accept data/sort/filter/page/perPage + async flags", () => {
  expectTypeOf<UseListOptions<Row>>().toMatchTypeOf<{
    data?: Row[];
    sort?: SortPayload<Row> | SortPayload<Row>[];
    filter?: FilterPayload;
    page?: number;
    perPage?: number;
    isPending?: boolean;
    isFetching?: boolean;
    error?: unknown;
  }>();
});

it("useList selection + param actions are present", () => {
  expectTypeOf(result.setPage).toBeFunction();
  expectTypeOf(result.setSort).toBeFunction();
  expectTypeOf(result.setFilters).toBeFunction();
  expectTypeOf(result.select).toBeFunction();
  expectTypeOf(result.toggleItem).toBeFunction();
  expectTypeOf(result.unselectAll).toBeFunction();
  expectTypeOf(result.selectAll).returns.resolves.toBeVoid();
});

it("useList exposes setParams taking a ListParamsPatch", () => {
  expectTypeOf(result.setParams).toBeFunction();
  expectTypeOf(result.setParams).parameters.toEqualTypeOf<
    [ListParamsPatch<Row>]
  >();
  expectTypeOf(result.setParams).returns.toBeVoid();
  expectTypeOf<ListParamsPatch>().toEqualTypeOf<{
    filter?: FilterPayload;
    displayedFilters?: Record<string, boolean>;
    sort?: SortPayload | SortPayload[];
    perPage?: number;
    page?: number;
  }>();
});

it("useList is callable with just data", () => {
  expectTypeOf(useList<Row>).toBeCallableWith({ data: [] });
});

it("a list controller keys its sort by the record and still mounts in a list context", () => {
  expectTypeOf<UseListResult<Row>["sort"]>().toEqualTypeOf<
    SortPayload<Row>[]
  >();
  expectTypeOf<UseListResult<Row>>().toExtend<ListContextValue>();
  useList<Row>({ data: [], sort: { field: "name", order: "ASC" } });
  // @ts-expect-error "nmae" is no path of Row
  useList<Row>({ data: [], sort: { field: "nmae", order: "ASC" } });
  // a bare sort still types for a loose record
  const bareSort: SortPayload = { field: "anything", order: "ASC" };
  useList<LooseRecord>({ data: [], sort: bareSort });
  result.setSort({ field: "name", order: "ASC" });
  // @ts-expect-error "nmae" is no path of Row
  result.setSort({ field: "nmae", order: "ASC" });
});

const resources = defineResources({
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
});

it("the reference hooks sort by the referenced record", () => {
  useReferenceManyFieldController<typeof resources, "comments">({
    reference: "comments",
    target: "post_id",
    sort: { field: "body", order: "ASC" },
  });
  useReferenceManyFieldController<typeof resources, "comments">({
    reference: "comments",
    target: "post_id",
    // @ts-expect-error "bdoy" is no path of a comment
    sort: { field: "bdoy", order: "ASC" },
  });
  useReferenceOneFieldController<typeof resources, "comments">({
    reference: "comments",
    target: "post_id",
    sort: [{ field: "body", order: "DESC" }],
  });
  useReferenceOneFieldController<typeof resources, "comments">({
    reference: "comments",
    target: "post_id",
    // @ts-expect-error "bdoy" is no path of a comment
    sort: [{ field: "bdoy", order: "DESC" }],
  });
});
