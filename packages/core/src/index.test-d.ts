import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  CheloneLocation,
  Exporter,
  LooseRecord,
  NavigateOpts,
  PathMatch,
  RouterPort,
  Unsubscribe,
} from "./index";
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

it("re-exports the P6 router types from the root", () => {
  expectTypeOf<
    CheloneLocation["searchParams"]
  >().toEqualTypeOf<URLSearchParams>();
  expectTypeOf<NavigateOpts["state"]>().not.toBeAny();
  expectTypeOf<PathMatch["params"]>().toEqualTypeOf<Record<string, string>>();
  expectTypeOf<RouterPort["navigate"]>().toBeFunction();
  expectTypeOf<Unsubscribe>().toEqualTypeOf<() => void>();
});

it("re-exports the Exporter type from the root", () => {
  expectTypeOf<Exporter>().toBeFunction();
  expectTypeOf<Exporter>().parameters.toEqualTypeOf<
    [data: LooseRecord[], dataProvider: DataProvider, resource: string]
  >();
  expectTypeOf<Exporter>().returns.toEqualTypeOf<void | Promise<void>>();
});
