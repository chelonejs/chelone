import { describe, expectTypeOf, it } from "vitest";
import { buildObject } from "./build-object";

interface Post {
  id: number;
  title: string;
}

describe("buildObject", () => {
  it("returns the object type the caller names", () => {
    const post = buildObject<Post>([
      ["id", 1],
      ["title", "a"],
    ]);
    expectTypeOf(post).toEqualTypeOf<Post>();
    expectTypeOf(post.title).toEqualTypeOf<string>();
  });

  it("refuses a type argument that is no object", () => {
    // @ts-expect-error buildObject builds an object, not a number
    buildObject<number>([["id", 1]]);
  });
});
