import { describe, expectTypeOf, it } from "vitest";
import type { DataProvider } from "../data/types";
import { InertDataProvider } from "./data-provider";

describe("InertDataProvider", () => {
  it("is a whole DataProvider", () => {
    expectTypeOf<InertDataProvider>().toExtend<DataProvider>();
  });

  it("lets a subclass override a verb with a result that satisfies the contract", () => {
    class Api extends InertDataProvider {
      override async getList() {
        return { data: [], total: 0 };
      }
    }
    expectTypeOf<Api>().toExtend<DataProvider>();
  });

  it("rejects a subclass whose override returns the wrong type", () => {
    class Api extends InertDataProvider {
      // @ts-expect-error getList resolves to a list result, not a string
      override async getList() {
        return "nope";
      }
    }
    expectTypeOf<Api>().not.toExtend<DataProvider>();
  });
});
