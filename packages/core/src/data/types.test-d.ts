import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { LooseRecord } from "../resource/record";
import { defineResources } from "../resource/registry";
import type {
  DataProvider,
  FilterPayload,
  GetListParams,
  GetManyReferenceParams,
  LooseSortPayload,
  SortPayload,
} from "./types";

const postSchema = z.object({ id: z.number(), title: z.string() });
type Post = z.infer<typeof postSchema>;

const resources = defineResources({
  posts: { schema: postSchema },
  comments: {},
});

/** A provider of this registry, with no runtime behind it: a type test only calls it. */
declare const dp: DataProvider<typeof resources>;

describe("DataProvider inference", () => {
  it("getList returns the resource's record type", async () => {
    const result = await dp.getList("posts", {});
    expectTypeOf(result.data).toEqualTypeOf<Post[]>();
  });

  it("getOne returns a single typed record", async () => {
    const result = await dp.getOne("posts", { id: 1 });
    expectTypeOf(result.data).toEqualTypeOf<Post>();
  });

  it("a schema-less resource yields LooseRecord fields as unknown", async () => {
    const result = await dp.getOne("comments", { id: 1 });
    expectTypeOf(result.data.id).toEqualTypeOf<string | number>();
    expectTypeOf(result.data.body).toEqualTypeOf<unknown>();
  });

  it("rejects unknown resource names", () => {
    // @ts-expect-error "widgets" is not in the registry
    void dp.getOne("widgets", { id: 1 });
  });

  it("create data is typed by the resource's record", () => {
    void dp.create("posts", { data: { title: "ok" } });
    // @ts-expect-error title must be string
    void dp.create("posts", { data: { title: 123 } });
  });

  it("update data rejects unknown fields", () => {
    // @ts-expect-error unknown field rejected
    void dp.update("posts", { id: 1, data: { unknownField: true } });
  });

  it("delete previousData is the typed record", () => {
    expectTypeOf<
      Parameters<typeof dp.delete<"posts">>[1]["previousData"]
    >().toEqualTypeOf<{ id: number; title: string } | undefined>();
  });

  it("getMany returns typed records", async () => {
    const result = await dp.getMany("posts", { ids: [1, 2] });
    expectTypeOf(result.data).toEqualTypeOf<Post[]>();
  });

  it("getManyReference returns typed records with list result shape", async () => {
    const result = await dp.getManyReference("posts", {
      target: "author_id",
      id: 1,
    });
    expectTypeOf(result.data).toEqualTypeOf<Post[]>();
    expectTypeOf(result.pageInfo).toEqualTypeOf<
      import("./types").PageInfo | undefined
    >();
  });

  it("updateMany/deleteMany return identifier arrays", async () => {
    const u = await dp.updateMany("posts", { ids: [1], data: { title: "x" } });
    const d = await dp.deleteMany("posts", { ids: [1] });
    expectTypeOf(u.data).toEqualTypeOf<Array<string | number>>();
    expectTypeOf(d.data).toEqualTypeOf<Array<string | number>>();
  });

  it("pagination is a discriminated union: page and cursor modes both accepted", async () => {
    await dp.getList("posts", { pagination: { page: 1, perPage: 10 } });
    await dp.getList("posts", { pagination: { cursor: null, limit: 10 } });
    // @ts-expect-error mixing the two modes is rejected
    await dp.getList("posts", { pagination: { page: 1, limit: 10 } });
  });
});

describe("FilterPayload", () => {
  it("bare FilterPayload stays string-keyed for an app that registers nothing", () => {
    // type-escape: naming the open key map is the assertion
    expectTypeOf<FilterPayload>().toEqualTypeOf<{ [key: string]: unknown }>();
    const filter: FilterPayload = { titel_gte: "x", anything: 1 };
    expectTypeOf(filter).toEqualTypeOf<FilterPayload>();
  });

  it("the wire params keep the loose filter: a provider is not generic over the record", () => {
    expectTypeOf<GetListParams["filter"]>().toEqualTypeOf<
      FilterPayload | undefined
    >();
    expectTypeOf<GetManyReferenceParams["filter"]>().toEqualTypeOf<
      FilterPayload | undefined
    >();
    expectTypeOf<
      Parameters<typeof dp.getList<"posts">>[1]
    >().toEqualTypeOf<GetListParams>();
    expectTypeOf<
      Parameters<typeof dp.getManyReference<"posts">>[1]
    >().toEqualTypeOf<GetManyReferenceParams>();
  });
});

declare function acceptPostSort(sort: SortPayload<Post>): void;
declare function acceptLooseSort(sort: SortPayload): void;

describe("SortPayload", () => {
  it("SortPayload<Post> takes the record's own paths", () => {
    expectTypeOf<SortPayload<Post>["field"]>().toEqualTypeOf<"id" | "title">();
    acceptPostSort({ field: "title", order: "ASC" });
    // @ts-expect-error "titel" is not a field of Post
    acceptPostSort({ field: "titel", order: "ASC" });
    // @ts-expect-error a sort field is a record path, not a filter key
    acceptPostSort({ field: "title_gte", order: "ASC" });
  });

  it("bare SortPayload stays a plain field for an app that registers nothing", () => {
    expectTypeOf<SortPayload>().toEqualTypeOf<SortPayload<LooseRecord>>();
    expectTypeOf<SortPayload>().toEqualTypeOf<LooseSortPayload>();
    acceptLooseSort({ field: "titel", order: "ASC" });
  });

  it("a typed sort assigns to the loose sort a verb takes", () => {
    expectTypeOf<SortPayload<Post>>().toMatchTypeOf<LooseSortPayload>();
  });

  it("a typed sort reaches a verb with no cast", () => {
    const postSort: SortPayload<Post> = { field: "title", order: "ASC" };
    void dp.getList("posts", { sort: postSort });
    void dp.getManyReference("posts", {
      target: "author_id",
      id: 1,
      sort: [postSort],
    });
  });

  it("the wire params keep the loose sort: a provider is not generic over the record", () => {
    expectTypeOf<GetListParams["sort"]>().toEqualTypeOf<
      LooseSortPayload | LooseSortPayload[] | undefined
    >();
    expectTypeOf<GetManyReferenceParams["sort"]>().toEqualTypeOf<
      LooseSortPayload | LooseSortPayload[] | undefined
    >();
  });
});
