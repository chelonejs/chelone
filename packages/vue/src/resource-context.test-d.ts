import { describe, expectTypeOf, it } from "vitest";
import { useRequiredResource } from "./resource-context";

describe("useRequiredResource", () => {
  it("useRequiredResource returns the name it is given", () => {
    expectTypeOf(
      useRequiredResource<"posts">("useListController"),
    ).toEqualTypeOf<"posts">();
    expectTypeOf(
      useRequiredResource<"posts">("useListController", { resource: "posts" }),
    ).toEqualTypeOf<"posts">();
  });

  it("useRequiredResource is a string with no type argument", () => {
    expectTypeOf(
      useRequiredResource("SavedQueriesList"),
    ).toEqualTypeOf<string>();
  });

  it("useRequiredResource rejects a type argument that is not a string", () => {
    // @ts-expect-error a resource name is a string
    useRequiredResource<42>("useListController");
  });
});
