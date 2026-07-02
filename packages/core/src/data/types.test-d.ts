import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import type { DataProvider } from "./types";

const postSchema = z.object({ id: z.number(), title: z.string() });
type Post = z.infer<typeof postSchema>;

const resources = defineResources({
  posts: { schema: postSchema },
  comments: {},
});

describe("DataProvider inference", () => {
  const dp = {} as DataProvider<typeof resources>;

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
});
