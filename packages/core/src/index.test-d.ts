import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import { type DataProvider, defineResources, type RecordOf } from "./index";

it("re-exports defineResources and inference types from the root", () => {
  const resources = defineResources({
    posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  });
  expectTypeOf<RecordOf<typeof resources, "posts">>().toEqualTypeOf<{
    id: number;
    title: string;
  }>();
  expectTypeOf<DataProvider<typeof resources>>().not.toBeNever();
});
