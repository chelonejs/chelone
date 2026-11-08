import { describe, expectTypeOf, it } from "vitest";
import type { FilterPayload, SortPayload } from "../data/types";
import type { LooseRecord } from "../resource/record";
import type { CheloneStore } from "../store/store";
import type { ListParamsPatch } from "./list-controller";
import {
  createSavedQueriesController,
  extractValidSavedQueries,
  isSavedQueryActive,
  type SavedQueriesController,
  type SavedQueriesState,
  type SavedQuery,
  type SavedQueryValue,
} from "./saved-queries";

interface Post {
  id: number;
  title: string;
  views: number;
}

declare const ctx: { store: CheloneStore | undefined };

describe("SavedQueryValue<Post>", () => {
  it("types the filter and sort by the record", () => {
    expectTypeOf<SavedQueryValue<Post>["filter"]>().toEqualTypeOf<
      FilterPayload<Post>
    >();
    expectTypeOf<SavedQueryValue<Post>["sort"]>().toEqualTypeOf<
      SortPayload<Post>[]
    >();
  });

  it("rejects a misspelled filter key and sort field", () => {
    const value: SavedQueryValue<Post> = {
      filter: { title_gte: "A" },
      displayedFilters: {},
      sort: [{ field: "title", order: "ASC" }],
      perPage: 10,
    };
    expectTypeOf(value).toExtend<SavedQueryValue<Post>>();
    const badFilter: SavedQueryValue<Post> = {
      // @ts-expect-error titel_gte is not a Post filter key
      filter: { titel_gte: "A" },
      displayedFilters: {},
      sort: [],
      perPage: 10,
    };
    const badSort: SavedQueryValue<Post> = {
      filter: {},
      displayedFilters: {},
      // @ts-expect-error "titel" is not a Post field
      sort: [{ field: "titel", order: "ASC" }],
      perPage: 10,
    };
    expectTypeOf(badFilter).toExtend<SavedQueryValue<Post>>();
    expectTypeOf(badSort).toExtend<SavedQueryValue<Post>>();
  });

  it("assigns to ListParamsPatch<Post>", () => {
    expectTypeOf<SavedQueryValue<Post>>().toExtend<ListParamsPatch<Post>>();
  });
});

describe("bare saved queries", () => {
  it("accept any string key", () => {
    const value: SavedQueryValue = {
      filter: { anything_gte: 1 },
      displayedFilters: {},
      sort: [{ field: "anything", order: "DESC" }],
      perPage: 5,
    };
    const query: SavedQuery = { label: "any", value };
    expectTypeOf(query).toEqualTypeOf<SavedQuery<LooseRecord>>();
    expectTypeOf<SavedQueryValue>().toEqualTypeOf<
      SavedQueryValue<LooseRecord>
    >();
  });

  it("keeps the controller call with a plain string resource", () => {
    const controller = createSavedQueriesController(ctx, "posts");
    expectTypeOf(controller).toEqualTypeOf<SavedQueriesController>();
    expectTypeOf(controller.getSnapshot()).toEqualTypeOf<SavedQueriesState>();
  });

  it("keeps the helpers on the bare value", () => {
    expectTypeOf(extractValidSavedQueries(undefined)).toEqualTypeOf<
      SavedQuery[]
    >();
    expectTypeOf(isSavedQueryActive).toExtend<
      (query: SavedQueryValue, current: SavedQueryValue) => boolean
    >();
  });
});

describe("createSavedQueriesController<Post>", () => {
  it("returns a controller whose save takes a Post value", () => {
    const controller = createSavedQueriesController<Post>(ctx, "posts");
    expectTypeOf(controller).toEqualTypeOf<SavedQueriesController<Post>>();
    expectTypeOf(controller.save)
      .parameter(1)
      .toEqualTypeOf<SavedQueryValue<Post>>();
    expectTypeOf(controller.getSnapshot().queries).toEqualTypeOf<
      SavedQuery<Post>[]
    >();
    controller.save("bad", {
      // @ts-expect-error titel_gte is not a Post filter key
      filter: { titel_gte: "A" },
      displayedFilters: {},
      sort: [],
      perPage: 10,
    });
  });

  it("types the helpers by the record", () => {
    expectTypeOf(extractValidSavedQueries<Post>(undefined)).toEqualTypeOf<
      SavedQuery<Post>[]
    >();
    expectTypeOf(isSavedQueryActive<Post>).parameters.toEqualTypeOf<
      [SavedQueryValue<Post>, SavedQueryValue<Post>]
    >();
  });
});
