import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { SortPayload } from "../data/types";
import { defineResources, type RecordOf } from "../resource/registry";
import { createClientListController } from "./client-list-controller";
import {
  createListController,
  type ListControllerContext,
  type ListControllerOptions,
  type ListControllerState,
  type ListParamsPatch,
} from "./list-controller";
import { createReferenceManyController } from "./reference-many-controller";
import { createReferenceOneController } from "./reference-one-controller";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number(),
      author_id: z.number(),
    }),
  },
});
type Post = RecordOf<typeof resources, "posts">;

declare const ctx: ListControllerContext<typeof resources>;

describe("a list controller keys its sort by the record", () => {
  it("createListController rejects a misspelt sort field and accepts a real one", () => {
    createListController(ctx, "posts", {
      sort: { field: "title", order: "ASC" },
    });
    createListController(ctx, "posts", {
      sort: [{ field: "title", order: "ASC" }],
    });
    createListController(ctx, "posts", {
      // @ts-expect-error "titel" is not a field of Post
      sort: { field: "titel", order: "ASC" },
    });
  });

  it("ListParamsPatch<Post> takes the record's own sort fields", () => {
    const ok: ListParamsPatch<Post> = {
      sort: { field: "title", order: "ASC" },
    };
    void ok;
    const bad: ListParamsPatch<Post> = {
      // @ts-expect-error "titel" is not a field of Post
      sort: { field: "titel", order: "ASC" },
    };
    void bad;
  });

  it("setSort takes the record's own sort fields", () => {
    const list = createListController(ctx, "posts");
    list.setSort({ field: "title", order: "ASC" });
    list.setSort([{ field: "title", order: "DESC" }]);
    // @ts-expect-error "titel" is not a field of Post
    list.setSort({ field: "titel", order: "ASC" });
  });

  it("createClientListController<Post> rejects a misspelt sort field", () => {
    createClientListController<Post>({
      sort: { field: "title", order: "ASC" },
    });
    createClientListController<Post>({
      // @ts-expect-error "titel" is not a field of Post
      sort: { field: "titel", order: "ASC" },
    });
    const list = createClientListController<Post>({});
    list.setSort({ field: "title", order: "ASC" });
    // @ts-expect-error "titel" is not a field of Post
    list.setSort({ field: "titel", order: "ASC" });
  });

  it("createReferenceManyController sorts the referenced rows by their record", () => {
    createReferenceManyController(ctx, "posts", {
      target: "author_id",
      id: 1,
      sort: { field: "title", order: "ASC" },
    });
    createReferenceManyController(ctx, "posts", {
      target: "author_id",
      id: 1,
      // @ts-expect-error "titel" is not a field of Post
      sort: { field: "titel", order: "ASC" },
    });
  });

  it("createReferenceOneController sorts the referenced rows by their record", () => {
    createReferenceOneController(ctx, "posts", {
      target: "author_id",
      id: 1,
      sort: { field: "title", order: "ASC" },
    });
    createReferenceOneController(ctx, "posts", {
      target: "author_id",
      id: 1,
      // @ts-expect-error "titel" is not a field of Post
      sort: { field: "titel", order: "ASC" },
    });
  });

  it("the state's sort is keyed by the record; a bare state takes any field", () => {
    expectTypeOf<ListControllerState<Post>["sort"]>().toEqualTypeOf<
      SortPayload<Post>[]
    >();
    expectTypeOf<ListControllerState["sort"]>().toEqualTypeOf<SortPayload[]>();
    const bare: ListControllerState["sort"] = [
      { field: "anything", order: "ASC" },
    ];
    void bare;
  });

  it("a bare sort option still typechecks", () => {
    const bare: SortPayload = { field: "title", order: "ASC" };
    const options: ListControllerOptions = { sort: bare };
    void options;
    createClientListController({ sort: bare });
  });
});
