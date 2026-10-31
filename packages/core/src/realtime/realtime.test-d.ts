import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { DataProvider } from "../data/types";
import { defineResources } from "../resource/registry";
import { addEventsForMutations } from "./add-events-for-mutations";
import type { RealtimeDataProvider } from "./types";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

describe("realtime types", () => {
  it("a RealtimeDataProvider is assignable to DataProvider", () => {
    expectTypeOf<RealtimeDataProvider<Resources>>().toExtend<
      DataProvider<Resources>
    >();
    expectTypeOf<DataProvider<Resources>>().not.toExtend<
      RealtimeDataProvider<Resources>
    >();
  });

  it("addEventsForMutations keeps the RealtimeDataProvider type", () => {
    const dp = {} as RealtimeDataProvider<Resources>;
    expectTypeOf(addEventsForMutations(dp, dp)).toEqualTypeOf<
      RealtimeDataProvider<Resources>
    >();

    const plain = {} as DataProvider<Resources>;
    expectTypeOf(addEventsForMutations(plain, dp)).toEqualTypeOf<
      DataProvider<Resources>
    >();
  });
});
