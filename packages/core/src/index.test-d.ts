import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type {
  AnySourcePath,
  AnySourcePathOf,
  CheloneLocation,
  Exporter,
  FilterSourceKey,
  LooseRecord,
  NavigateOpts,
  PathMatch,
  Register,
  RegisteredRecord,
  RegisteredResourceName,
  RegisteredResources,
  ResourceMap,
  RouterPort,
  RowSourcePath,
  SourceKey,
  SourcePath,
  SourceProp,
  SourceValue,
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

it("re-exports the Register and source-path types from the root", () => {
  const typed = defineResources({
    posts: { schema: z.object({ id: z.number(), title: z.string() }) },
    comments: {},
  });
  expectTypeOf<Register>().toBeObject();
  expectTypeOf<keyof Register>().toEqualTypeOf<never>();
  expectTypeOf<RegisteredResources>().toEqualTypeOf<ResourceMap>();
  expectTypeOf<RegisteredResourceName>().toEqualTypeOf<string>();
  expectTypeOf<RegisteredRecord<string>>().toEqualTypeOf<LooseRecord>();
  expectTypeOf<AnySourcePath>().toEqualTypeOf<string>();
  expectTypeOf<AnySourcePathOf<typeof typed>>().toEqualTypeOf<string>();
  expectTypeOf<SourceProp>().toEqualTypeOf<AnySourcePath>();
  expectTypeOf<SourcePath<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<RowSourcePath<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<FilterSourceKey<LooseRecord>>().toEqualTypeOf<
    "q" | `${string}_${string}`
  >();
  expectTypeOf<SourceKey<LooseRecord>>().toEqualTypeOf<string>();
  expectTypeOf<SourceValue<LooseRecord, "anything">>().toEqualTypeOf<unknown>();
});

it("re-exports the Exporter type from the root", () => {
  expectTypeOf<Exporter>().toBeFunction();
  expectTypeOf<Exporter>().parameters.toEqualTypeOf<
    [data: LooseRecord[], dataProvider: DataProvider, resource: string]
  >();
  expectTypeOf<Exporter>().returns.toEqualTypeOf<void | Promise<void>>();
});
