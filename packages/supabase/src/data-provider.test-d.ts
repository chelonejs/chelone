import type { DataProvider } from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { supabaseDataProvider } from "./index";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
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
});
