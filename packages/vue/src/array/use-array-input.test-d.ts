import { describe, expectTypeOf, it } from "vitest";
import { useArrayInput } from "./use-array-input";

type Post = { number: string; lines: { sku: string }[] };

describe("useArrayInput source typing", () => {
  it("useArrayInput<Post> accepts a path of Post", () => {
    const input = useArrayInput<Post>;
    expectTypeOf(input).toBeCallableWith({ source: "lines" });
  });

  it("useArrayInput<Post> rejects a source that is not a path of Post", () => {
    const input = useArrayInput<Post>;
    // @ts-expect-error "line" is not a path of Post
    expectTypeOf(input).toBeCallableWith({ source: "line" });
  });

  it("useArrayInput without a type argument takes any string", () => {
    const input = useArrayInput;
    expectTypeOf(input).toBeCallableWith({ source: "whatever" });
  });
});
