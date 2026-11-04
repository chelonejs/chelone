import { describe, expectTypeOf, it } from "vitest";
import { useInput } from "./use-input";

type Post = { headline: string; views: number; author: { name: string } };

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

type Invoice = { total: number; customer: { email: string } };

describe("useInput value typing", () => {
  it("useInput types format with the value at its source", () => {
    const format = (value: number) => value.toFixed(2);
    expectTypeOf(useInput<Invoice, "total">).toBeCallableWith({
      source: "total",
      format,
    });
    expectTypeOf(useInput<Invoice, "customer.email">).toBeCallableWith({
      source: "customer.email",
      format: (value) => value.toLowerCase(),
    });
  });

  it("useInput types parse to return the value at its source", () => {
    const parse = (input: unknown) => Number(input);
    expectTypeOf(useInput<Invoice, "total">).toBeCallableWith({
      source: "total",
      defaultValue: 0,
      parse,
    });
    expectTypeOf(useInput<Invoice, "total">).toBeCallableWith({
      source: "total",
      // @ts-expect-error parse must return a number for "total"
      parse: (input: unknown) => String(input),
    });
  });

  it("useInput rejects a format that takes the wrong value type", () => {
    expectTypeOf(useInput<Invoice, "customer.email">).toBeCallableWith({
      source: "customer.email",
      // @ts-expect-error the email is a string, not a number
      format: (value: number) => value,
    });
  });

  it("useInput without a record takes unknown values", () => {
    expectTypeOf(useInput).toBeCallableWith({
      source: "anything",
      defaultValue: Symbol("seed"),
      format: (value: unknown) => String(value),
      parse: (input: unknown) => input,
    });
  });
});
