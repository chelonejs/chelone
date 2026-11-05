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

  it("InputProps without a type argument takes any string when no resource is registered", () => {
    acceptLooseInput({ source: "anything.at[0].all" });
  });

  it("InputProps spreads into useInput", () => {
    expectTypeOf(useInput).parameter(0).toEqualTypeOf<UseInputOptions>();
    const spread = (props: InputProps<Post>) =>
      useInput({ ...props, source: props.source });
    expectTypeOf(spread).returns.toEqualTypeOf<ReturnType<typeof useInput>>();
  });
});
