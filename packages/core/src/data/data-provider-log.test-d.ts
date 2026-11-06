import { describe, expectTypeOf, it } from "vitest";
import { defineResources } from "../resource/registry";
import type { MicroStore } from "../store/micro-store";
import {
  createDataProviderLog,
  type DataProviderLogEntry,
} from "./data-provider-log";
import type { DataProvider } from "./types";

const resources = defineResources({ posts: {} });

interface CustomProvider extends DataProvider<typeof resources> {
  publish(resource: "posts", id: number): Promise<{ published: boolean }>;
  readonly label: string;
}

declare const dp: CustomProvider;

describe("createDataProviderLog types", () => {
  it("wrap returns the provider type it was given, custom methods included", () => {
    const log = createDataProviderLog();
    const wrapped = log.wrap(dp);

    expectTypeOf(wrapped).toEqualTypeOf<CustomProvider>();
    expectTypeOf(wrapped.publish).parameters.toEqualTypeOf<["posts", number]>();
    expectTypeOf(wrapped.publish).returns.toEqualTypeOf<
      Promise<{ published: boolean }>
    >();
    expectTypeOf(wrapped.label).toEqualTypeOf<string>();

    // @ts-expect-error "widgets" is not in the registry
    wrapped.getOne("widgets", { id: 1 });
  });

  it("the store holds a readonly list of entries", () => {
    const log = createDataProviderLog();

    expectTypeOf(log.store).toEqualTypeOf<
      MicroStore<{ entries: readonly DataProviderLogEntry[] }>
    >();
  });
});
