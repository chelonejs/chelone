import { describe, expectTypeOf, it } from "vitest";
import {
  type ClientListControllerOptions,
  type ClientListLoadingState,
  createClientListController,
} from "./client-list-controller";
import type { ListControllerState } from "./list-controller";
import type { ShowControllerState } from "./record-controllers";
import type { ReferenceOneControllerState } from "./reference-one-controller";

interface Post {
  id: number;
  title: string;
}

describe("controller state errors", () => {
  it("list, show and reference-one states carry the query's Error", () => {
    expectTypeOf<
      ListControllerState<Post>["error"]
    >().toEqualTypeOf<Error | null>();
    expectTypeOf<
      ShowControllerState<Post>["error"]
    >().toEqualTypeOf<Error | null>();
    expectTypeOf<
      ReferenceOneControllerState<Post>["error"]
    >().toEqualTypeOf<Error | null>();
  });

  it("client list options and loading state take an Error or null", () => {
    expectTypeOf<ClientListControllerOptions<Post>["error"]>().toEqualTypeOf<
      Error | null | undefined
    >();
    expectTypeOf<ClientListLoadingState["error"]>().toEqualTypeOf<
      Error | null | undefined
    >();
    createClientListController<Post>({ error: new Error("boom") });
    createClientListController<Post>({ error: null });
  });

  it("a client list rejects an error that is not an Error", () => {
    // @ts-expect-error a string is not an Error
    createClientListController<Post>({ error: "boom" });
  });
});
