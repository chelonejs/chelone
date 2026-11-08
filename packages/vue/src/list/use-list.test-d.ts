import {
  type DisplayedFilters,
  defineResources,
  type LooseRecord,
  type RecordOf,
  type SortPayload,
} from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import type { MaybeRefOrGetter } from "vue";
import { z } from "zod";
import type { UseListControllerReturn } from "../controllers/use-list-controller";
import { useReferenceManyFieldController } from "../controllers/use-reference-many-field-controller";
import { useReferenceOneFieldController } from "../controllers/use-reference-one-field-controller";
import { type ListContextValue, provideListContext } from "./list-context";
import { type UseListOptions, useList } from "./use-list";

declare const maybeError: Error | undefined;
declare const rowController: UseListControllerReturn<Row>;

it("the list error option is Error or null", () => {
  expectTypeOf<UseListOptions["error"]>().toEqualTypeOf<
    MaybeRefOrGetter<Error | null> | undefined
  >();
  useList({ error: new Error("boom") });
  useList({ error: null });
  useList({ error: () => null });
  // @ts-expect-error a string is not an Error
  useList({ error: "boom" });
  // core reads undefined as "no change", so a getter may not return it
  // @ts-expect-error undefined would leave a stale error in place
  useList({ error: () => maybeError });
});

interface Row {
  id: number;
  name: string;
}

it("the list filter is keyed by the record's filter keys", () => {
  useList<Row>({ filter: { name: "red", name_gte: "r", q: "search" } });
  // @ts-expect-error "nmae" is no path of Row, suffixed or not
  useList<Row>({ filter: { nmae: "red" } });
});

const resources = defineResources({
  authors: { schema: z.object({ id: z.number(), name: z.string() }) },
});

it("the list sort is keyed by the record's sort fields", () => {
  useList<Row>({ sort: { field: "name", order: "ASC" } });
  // @ts-expect-error "nmae" is no path of Row
  useList<Row>({ sort: { field: "nmae", order: "ASC" } });
  // a bare sort still types for a loose record
  const bareSort: SortPayload = { field: "anything", order: "ASC" };
  useList<LooseRecord>({ sort: bareSort });
});

it("a list controller's sort state is keyed by its record", () => {
  expectTypeOf<UseListControllerReturn<Row>["sort"]>().toEqualTypeOf<
    SortPayload<Row>[]
  >();
});

it("a list controller of one record still mounts in a list context", () => {
  expectTypeOf<UseListControllerReturn<Row>>().toExtend<ListContextValue>();
  expectTypeOf<ReturnType<typeof useList<Row>>>().toExtend<ListContextValue>();
  provideListContext(rowController);
});

it("a list controller keys its displayed filters by the record", () => {
  expectTypeOf<
    UseListControllerReturn<Row>["displayedFilters"]
  >().toEqualTypeOf<DisplayedFilters<Row>>();
  rowController.showFilter("name");
  rowController.showFilter("name_gte", "red");
  rowController.hideFilter("name");
  // @ts-expect-error "nmae" is no filter key of Row
  rowController.showFilter("nmae");
  // @ts-expect-error "nmae" is no filter key of Row
  rowController.hideFilter("nmae");
  // The erased context still takes the typed map.
  expectTypeOf<ReturnType<typeof useList<Row>>>().toExtend<ListContextValue>();
});

it("the reference controllers sort by the referenced record", () => {
  useReferenceManyFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
    sort: { field: "name", order: "ASC" },
  });
  useReferenceManyFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
    // @ts-expect-error "nmae" is no path of an author
    sort: { field: "nmae", order: "ASC" },
  });
  useReferenceOneFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
    sort: [{ field: "name", order: "DESC" }],
  });
  useReferenceOneFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
    // @ts-expect-error "nmae" is no path of an author
    sort: [{ field: "nmae", order: "DESC" }],
  });
});

it("the reference-many controller's setSort takes the referenced record's fields", () => {
  const many = useReferenceManyFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
  });
  many.setSort({ field: "name", order: "ASC" });
  // @ts-expect-error "nmae" is no path of an author
  many.setSort({ field: "nmae", order: "ASC" });
});

it("the reference-many controller keys its filters by the referenced record", () => {
  const many = useReferenceManyFieldController<typeof resources, "authors">({
    reference: "authors",
    target: "article_id",
  });
  expectTypeOf(many.displayedFilters).toEqualTypeOf<
    DisplayedFilters<RecordOf<typeof resources, "authors">>
  >();
  many.showFilter("name");
  many.showFilter("name_gte", "red");
  many.hideFilter("name");
  // @ts-expect-error "nmae" is no filter key of an author
  many.showFilter("nmae");
  // @ts-expect-error "nmae" is no filter key of an author
  many.hideFilter("nmae");
  many.setFilters({ name: "red" }, { name: true });
  // @ts-expect-error "nmae" is no filter key of an author
  many.setFilters({ name: "red" }, { nmae: true });
});
