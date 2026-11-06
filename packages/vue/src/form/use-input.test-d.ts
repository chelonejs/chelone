import type {
  FormContextHandle,
  FormContextHandleOf,
  ResourceFormHandle,
  SourceValue,
  UnboundFormHandle,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { readFormHandle, useFormHandle } from "./form-context";
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
    const format = (value: number | null | undefined) => String(value);
    expectTypeOf(useInput<Invoice, "total">).toBeCallableWith({
      source: "total",
      format,
    });
    expectTypeOf(useInput<Invoice, "customer.email">).toBeCallableWith({
      source: "customer.email",
      format: (value) => value?.toLowerCase(),
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

interface PostRecord {
  title: string;
  views: number;
  author: { name: string };
}

/**
 * Registering resources is global to the whole type-check run, so these tests
 * cannot register `Post`: they run `readFormHandle`, the function `useFormHandle`
 * calls on the injected handle, over an explicit map.
 */
type PostHandles = FormContextHandleOf<{
  posts: PostRecord;
  tags: { label: string };
}>;

declare const handles: PostHandles;

describe("useFormHandle", () => {
  it("with nothing registered, the context is the unbound handle", () => {
    expectTypeOf(useFormHandle()).toEqualTypeOf<FormContextHandle>();
    expectTypeOf(useFormHandle()).toEqualTypeOf<UnboundFormHandle>();
  });

  it("useFormHandle(name) is that resource's handle or undefined", () => {
    expectTypeOf(useFormHandle("posts")).toEqualTypeOf<
      ResourceFormHandle<"posts"> | undefined
    >();
  });

  it("the named handle types its field values", () => {
    const handle = readFormHandle(handles, "posts");
    expectTypeOf(handle).toEqualTypeOf<
      ResourceFormHandle<"posts", Partial<PostRecord>> | undefined
    >();
    if (!handle) return;
    expectTypeOf(handle.getFieldValue("title")).not.toBeUnknown();
    expectTypeOf(handle.getFieldValue("author.name")).toEqualTypeOf<
      SourceValue<Partial<PostRecord>, "author.name">
    >();
    // @ts-expect-error "titel" is not a path of a post
    handle.getFieldValue("titel");
    // @ts-expect-error a number is not the value at `title`
    handle.setFieldValue("title", 5);
  });

  it("a resource the union does not name is a type error", () => {
    // @ts-expect-error "comments" is not a resource of the union
    readFormHandle(handles, "comments");
  });
});

describe("useInput value and setValue", () => {
  it("the value is what format returns; setValue takes it or an event", () => {
    const input = useInput<Invoice, "total", string>({
      source: "total",
      format: (value) => (value ?? 0).toFixed(2),
      parse: (text) => Number(text),
    });
    expectTypeOf(input.value.value).toEqualTypeOf<string>();
    expectTypeOf(input.setValue).parameter(0).toEqualTypeOf<Event | string>();
  });

  it("without a format the value is unknown", () => {
    const input = useInput({ source: "anything" });
    expectTypeOf(input.value.value).toBeUnknown();
  });
});
