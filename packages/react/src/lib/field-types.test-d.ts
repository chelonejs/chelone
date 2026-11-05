import type { SourceProp } from "@chelone/core";
import type { ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { FieldProps } from "./field-types";
import { genericMemo } from "./gen-memo";

type Post = {
  id: number;
  title: string;
  author?: { name: string };
  items: { sku: string; qty: number }[];
  published_at?: string;
};

declare function acceptPostField(props: FieldProps<Post>): void;
declare function acceptLooseField(props: FieldProps): void;

describe("FieldProps", () => {
  it("FieldProps source is SourceProp of its record", () => {
    expectTypeOf<FieldProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<FieldProps<Post>["source"]>().toEqualTypeOf<
      SourceProp<Post>
    >();
  });

  it("FieldProps<Post> accepts a path of Post, a path relative to an array item and a filter key", () => {
    acceptPostField({ source: "title" });
    acceptPostField({ source: "author.name" });
    acceptPostField({ source: "items[0].sku" });
    acceptPostField({ source: "sku" });
    acceptPostField({ source: "published_at_gte" });
  });

  it("FieldProps<Post> rejects a source that is not a path of Post", () => {
    // @ts-expect-error "titel" is not a path of Post
    acceptPostField({ source: "titel" });
  });

  it("FieldProps without a type argument takes any string when no resource is registered", () => {
    acceptLooseField({ source: "anything.at[0].all" });
  });
});

describe("genericMemo", () => {
  it("genericMemo keeps a generic component's type parameter", () => {
    function Row<TRecord extends object>(props: {
      record: TRecord;
      pick: (record: TRecord) => string;
    }): ReactNode {
      return props.pick(props.record);
    }
    const MemoRow = genericMemo(Row);

    MemoRow({ record: { id: 1 }, pick: (record) => String(record.id) });
    // @ts-expect-error `pick` reads the record the caller passed, which has no `name`
    MemoRow({ record: { id: 1 }, pick: (record) => record.name });
  });
});
