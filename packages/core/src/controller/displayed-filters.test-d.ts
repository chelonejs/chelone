import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  DisplayedFilters,
  FilterPayload,
  LooseDisplayedFilters,
  SortPayload,
} from "../data/types";
import type {
  DisplayedFilters as BarrelDisplayedFilters,
  LooseDisplayedFilters as BarrelLooseDisplayedFilters,
} from "../index";
import type { LooseRecord } from "../resource/record";
import { defineResources, type RecordOf } from "../resource/registry";
import { createClientListController } from "./client-list-controller";
import {
  createListController,
  type ListControllerContext,
  type ListControllerState,
  type ListParamsPatch,
} from "./list-controller";
import type { ListParamsQuery, ListUrlState } from "./list-params";
import { createReferenceManyController } from "./reference-many-controller";
import type { SavedQueryValue } from "./saved-queries";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
type Post = RecordOf<typeof resources, "posts">;

declare const ctx: ListControllerContext<typeof resources>;

describe("DisplayedFilters<Post>", () => {
  it("takes the record's filter keys: plain, suffixed and q", () => {
    const plain: DisplayedFilters<Post> = { title: true };
    const search: DisplayedFilters<Post> = { q: true };
    const suffixed: DisplayedFilters<Post> = { title_gte: true };
    void [plain, search, suffixed];
  });

  it("rejects a name that is no filter key of the record", () => {
    const bad: DisplayedFilters<Post> = {
      // @ts-expect-error titel is not a filter key of Post
      titel: true,
    };
    void bad;
  });

  it("leaves every key optional, so showing one filter names only that one", () => {
    const one: DisplayedFilters<Post> = { title: true };
    void one;
    expectTypeOf<DisplayedFilters<Post>>().toEqualTypeOf<
      ListControllerState<Post>["displayedFilters"]
    >();
  });

  it("reaches the open key map an erased list context carries", () => {
    expectTypeOf<DisplayedFilters<Post>>().toExtend<LooseDisplayedFilters>();
  });
});

describe("bare DisplayedFilters", () => {
  it("is an open key map for an app that registers nothing", () => {
    expectTypeOf<DisplayedFilters>().toEqualTypeOf<{
      [key: string]: boolean | undefined;
    }>();
    const any: DisplayedFilters = { titel: true, anything: false };
    void any;
    expectTypeOf<LooseDisplayedFilters>().toEqualTypeOf<{
      [key: string]: boolean | undefined;
    }>();
    expectTypeOf<LooseDisplayedFilters>().toEqualTypeOf<DisplayedFilters>();
  });

  it("bare ListParamsPatch still takes any key", () => {
    const patch: ListParamsPatch = { displayedFilters: { titel: true } };
    void patch;
  });
});

describe("the list params take DisplayedFilters<TRecord>", () => {
  it("ListParamsPatch<Post> keys its displayedFilters by the record", () => {
    expectTypeOf<ListParamsPatch<Post>>().toEqualTypeOf<{
      filter?: FilterPayload<Post>;
      displayedFilters?: DisplayedFilters<Post>;
      sort?: SortPayload<Post> | SortPayload<Post>[];
      perPage?: number;
      page?: number;
    }>();
    const ok: ListParamsPatch<Post> = { displayedFilters: { title: true } };
    void ok;
    const bad: ListParamsPatch<Post> = {
      // @ts-expect-error titel is not a filter key of Post
      displayedFilters: { titel: true },
    };
    void bad;
  });

  it("the URL-shaped params and the URL state take them", () => {
    expectTypeOf<ListParamsQuery<Post>["displayedFilters"]>().toEqualTypeOf<
      DisplayedFilters<Post> | undefined
    >();
    expectTypeOf<ListUrlState<Post>["displayedFilters"]>().toEqualTypeOf<
      DisplayedFilters<Post>
    >();
  });

  it("SavedQueryValue<Post> takes them", () => {
    expectTypeOf<SavedQueryValue<Post>["displayedFilters"]>().toEqualTypeOf<
      DisplayedFilters<Post>
    >();
    const ok: SavedQueryValue<Post> = {
      filter: { title_gte: "A" },
      displayedFilters: { title: true },
      sort: [],
      perPage: 10,
    };
    void ok;
    const bad: SavedQueryValue<Post> = {
      filter: {},
      displayedFilters: {
        // @ts-expect-error titel is not a filter key of Post
        titel: true,
      },
      sort: [],
      perPage: 10,
    };
    void bad;
  });
});

describe("showFilter and hideFilter name a filter key", () => {
  it("a posts list controller rejects a name that is no filter key", () => {
    const list = createListController(ctx, "posts");
    list.showFilter("title");
    list.showFilter("title_gte", 1);
    list.showFilter("q", "");
    list.hideFilter("title");
    // @ts-expect-error "titel" is not a filter key of Post
    list.showFilter("titel");
    // @ts-expect-error "titel" is not a filter key of Post
    list.hideFilter("titel");
  });

  it("a client list controller does the same", () => {
    const list = createClientListController<Post>({});
    list.showFilter("title");
    list.hideFilter("title");
    // @ts-expect-error "titel" is not a filter key of Post
    list.showFilter("titel");
    // @ts-expect-error "titel" is not a filter key of Post
    list.hideFilter("titel");
  });

  it("a reference-many controller does the same", () => {
    const list = createReferenceManyController(ctx, "posts", {
      target: "author_id",
      id: 1,
    });
    list.showFilter("title");
    list.hideFilter("title");
    // @ts-expect-error "titel" is not a filter key of Post
    list.showFilter("titel");
    // @ts-expect-error "titel" is not a filter key of Post
    list.hideFilter("titel");
  });

  it("a controller of a loose record takes any name", () => {
    const list = createClientListController<LooseRecord>({});
    list.showFilter("titel");
    list.hideFilter("titel");
  });
});

describe("the barrel", () => {
  it("re-exports both displayed-filter types", () => {
    expectTypeOf<BarrelDisplayedFilters>().toEqualTypeOf<DisplayedFilters>();
    expectTypeOf<BarrelLooseDisplayedFilters>().toEqualTypeOf<
      LooseDisplayedFilters
    >();
  });
});
