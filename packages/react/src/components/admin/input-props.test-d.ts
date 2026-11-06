import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { UseInputOptions } from "../../form-hooks";
import { useInput } from "../../form-hooks";
import type { InputProps } from "./input-props";

type Post = {
  id: number;
  title: string;
  author?: { name: string };
  items: { sku: string; qty: number }[];
  published_at?: string;
};

declare function acceptPostInput(props: InputProps<Post>): void;
declare function acceptLooseInput(props: InputProps): void;
declare function acceptTitleInput(props: InputProps<Post, "title">): void;
declare function acceptRowInput(props: InputProps<Post, "qty">): void;
declare function acceptFilterInput(
  props: InputProps<Post, "published_at_gte">,
): void;

describe("InputProps", () => {
  it("InputProps source is SourceProp of its record", () => {
    expectTypeOf<InputProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<InputProps<Post>["source"]>().toEqualTypeOf<
      SourceProp<Post>
    >();
  });

  it("InputProps<Post> accepts a path of Post, a path relative to an array item and a filter key", () => {
    acceptPostInput({ source: "title" });
    acceptPostInput({ source: "author.name" });
    acceptPostInput({ source: "items[0].sku" });
    acceptPostInput({ source: "sku" });
    acceptPostInput({ source: "published_at_gte" });
  });

  it("InputProps<Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "titel" is not a path of Post
    acceptPostInput({ source: "titel" });
  });

  it('InputProps<Post, "title"> types defaultValue as the value at the path', () => {
    expectTypeOf<
      Required<InputProps<Post, "title">>["defaultValue"]
    >().toEqualTypeOf<string>();
    acceptTitleInput({ source: "title", defaultValue: "Untitled" });
    // @ts-expect-error a number is not the value at "title"
    acceptTitleInput({ source: "title", defaultValue: 1 });
  });

  it("InputProps without a record keeps defaultValue as unknown", () => {
    expectTypeOf<InputProps["defaultValue"]>().toEqualTypeOf<unknown>();
  });

  it('InputProps<Post, "title"> types format and parse by the value at the path', () => {
    expectTypeOf<Required<InputProps<Post, "title">>["format"]>()
      .parameter(0)
      .toEqualTypeOf<string | undefined>();
    expectTypeOf<
      Required<InputProps<Post, "title">>["format"]
    >().returns.toBeUnknown();
    expectTypeOf<Required<InputProps<Post, "title">>["parse"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<
      Required<InputProps<Post, "title">>["parse"]
    >().returns.toEqualTypeOf<string>();
    acceptTitleInput({
      source: "title",
      format: (value) => value?.toUpperCase(),
      parse: (value) => String(value),
    });
    // @ts-expect-error an empty create form leaves `title` a hole: format must guard
    acceptTitleInput({ source: "title", format: (v) => v.toUpperCase() });
    // @ts-expect-error format receives the value at "title", not any value
    acceptTitleInput({ source: "title", format: (value: number) => value });
    // @ts-expect-error parse must return the value at "title"
    acceptTitleInput({ source: "title", parse: () => 1 });
  });

  it("InputProps keeps the transforms loose for a source that names no value of the record", () => {
    // A row path (`qty` under `items[]`) and a filter key are legal sources, but
    // neither is a path of the record, so nothing is known about their value.
    expectTypeOf<Required<InputProps<Post, "qty">>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<
      Required<InputProps<Post, "qty">>["parse"]
    >().returns.toBeUnknown();
    expectTypeOf<
      Required<InputProps<Post, "published_at_gte">>["parse"]
    >().returns.toBeUnknown();
    acceptRowInput({
      source: "qty",
      format: (value) => String(value),
      parse: (value) => Number(value),
    });
    acceptFilterInput({
      source: "published_at_gte",
      format: (value) => value,
      parse: (value) => value,
    });
  });

  it("InputProps<Post> types format over the values at every Post path", () => {
    acceptPostInput({
      source: "items[0].qty",
      format: (value) => String(value),
    });
    // @ts-expect-error no Post path holds a boolean
    acceptPostInput({ source: "title", format: (value: boolean) => value });
  });

  it("InputProps without a record keeps format and parse on unknown", () => {
    expectTypeOf<Required<InputProps>["format"]>().parameter(0).toBeUnknown();
    expectTypeOf<Required<InputProps>["format"]>().returns.toBeUnknown();
    expectTypeOf<Required<InputProps>["parse"]>().parameter(0).toBeUnknown();
    expectTypeOf<Required<InputProps>["parse"]>().returns.toBeUnknown();
    acceptLooseInput({
      source: "anything",
      format: (value) => value,
      parse: (value) => value,
    });
  });

  it("InputProps without a type argument takes any string when no resource is registered", () => {
    acceptLooseInput({ source: "anything.at[0].all" });
  });

  it("InputProps spreads into useInput", () => {
    expectTypeOf(useInput).parameter(0).toEqualTypeOf<UseInputOptions>();
    const looseSpread = (props: InputProps) => useInput({ ...props });
    expectTypeOf(looseSpread).returns.toEqualTypeOf<
      ReturnType<typeof useInput>
    >();
    // A typed record reaches `useInput` through its own generics: the loose
    // overload would hand `format` an `unknown` instead of the value at source.
    const typedSpread = (props: InputProps<Post>) =>
      useInput<Post>({ ...props, source: props.source });
    expectTypeOf(typedSpread).returns.toEqualTypeOf<
      ReturnType<typeof useInput>
    >();
  });
});
