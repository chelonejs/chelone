import { describe, expectTypeOf, it } from "vitest";
import { useInput } from "./use-input";

type Post = { headline: string; author: { name: string } };

describe("useInput source typing", () => {
  it("useInput<Post> accepts a path of Post", () => {
    const input = useInput<Post>;
    expectTypeOf(input).toBeCallableWith({ source: "author.name" });
  });

  it("useInput<Post> rejects a source that is not a path of Post", () => {
    const input = useInput<Post>;
    // @ts-expect-error "autor.name" is not a path of Post
    expectTypeOf(input).toBeCallableWith({ source: "autor.name" });
  });

  it("useInput without a type argument takes any string", () => {
    const input = useInput;
    expectTypeOf(input).toBeCallableWith({ source: "whatever" });
  });
});
