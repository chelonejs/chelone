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

declare function acceptPostInput(props: InputProps<unknown, Post>): void;
declare function acceptLooseInput(props: InputProps): void;

describe("InputProps", () => {
  it("InputProps source is SourceProp of its record", () => {
    expectTypeOf<InputProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<InputProps<unknown, Post>["source"]>().toEqualTypeOf<
      SourceProp<Post>
    >();
  });

  it("InputProps<unknown, Post> accepts a path of Post, a path relative to an array item and a filter key", () => {
    acceptPostInput({ source: "title" });
    acceptPostInput({ source: "author.name" });
    acceptPostInput({ source: "items[0].sku" });
    acceptPostInput({ source: "sku" });
    acceptPostInput({ source: "published_at_gte" });
  });

  it("InputProps<unknown, Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "titel" is not a path of Post
    acceptPostInput({ source: "titel" });
  });

  it("InputProps without a type argument takes any string when no resource is registered", () => {
    acceptLooseInput({ source: "anything.at[0].all" });
  });

  it("InputProps spreads into useInput", () => {
    expectTypeOf(useInput).parameter(0).toEqualTypeOf<UseInputOptions>();
    const spread = (props: InputProps<unknown, Post>) =>
      useInput({ ...props, source: props.source });
    expectTypeOf(spread).returns.toEqualTypeOf<ReturnType<typeof useInput>>();
  });
});
