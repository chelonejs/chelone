import type {
  DataProvider,
  RegisteredResources,
  ResourceMap,
} from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  type SupabaseDataProviderOptions,
  supabaseDataProvider,
} from "./index";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  logs: {},
});
type Resources = typeof resources;

const connection = {
  instanceUrl: "https://example.supabase.co",
  apiKey: "key",
};

describe("supabaseDataProvider", () => {
  it("checks primary key resource names and keeps the DataProvider return type", () => {
    const provider = supabaseDataProvider<Resources>({
      ...connection,
      primaryKeys: { posts: ["id"] },
    });
    expectTypeOf(provider).toEqualTypeOf<DataProvider>();

    supabaseDataProvider<Resources>({
      ...connection,
      // @ts-expect-error psots is not a registered resource
      primaryKeys: { psots: ["id"] },
    });
  });

  it("checks key columns against the resource record", () => {
    supabaseDataProvider<Resources>({
      ...connection,
      // @ts-expect-error idd is not a field of posts
      primaryKeys: { posts: ["idd"] },
    });
  });

  it("exports generic options that accept readonly compound keys", () => {
    const columns: readonly ["id", "title"] = ["id", "title"];
    const options: SupabaseDataProviderOptions<Resources> = {
      ...connection,
      primaryKeys: { posts: columns },
    };
    expectTypeOf(supabaseDataProvider(options)).toEqualTypeOf<DataProvider>();
    expectTypeOf(options.primaryKeys).toEqualTypeOf<
      | { posts?: readonly ("id" | "title")[]; logs?: readonly string[] }
      | undefined
    >();
  });

  it("accepts plain string columns for a resource without a schema", () => {
    supabaseDataProvider<Resources>({
      ...connection,
      primaryKeys: { logs: ["anything"] },
    });
  });

  it("keeps loose primary keys when nothing is registered", () => {
    expectTypeOf<RegisteredResources>().toEqualTypeOf<ResourceMap>();
    expectTypeOf<SupabaseDataProviderOptions>().toEqualTypeOf<
      SupabaseDataProviderOptions<ResourceMap>
    >();
    expectTypeOf(
      supabaseDataProvider({
        ...connection,
        primaryKeys: { anything: ["x"] },
      }),
    ).toEqualTypeOf<DataProvider>();
  });
});
