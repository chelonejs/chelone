/**
 * The array, reference, reference-array and search inputs take `source` as a
 * path of their record. The inputs have no `record` prop, so the record is
 * named by the type argument of their props: `ArrayInputProps<Post>`.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ArrayInputProps } from "./array-input";
import type { ReferenceArrayInputProps } from "./reference-array-input";
import type { ReferenceInputProps } from "./reference-input";
import type { SearchInputProps } from "./search-input";

type Post = {
  id: number;
  title: string;
  author_id: number;
  tag_ids: number[];
  items: { sku: string; qty: number }[];
};

declare function acceptArrayInput(props: ArrayInputProps<Post>): void;
declare function acceptReferenceInput(props: ReferenceInputProps<Post>): void;
declare function acceptReferenceArrayInput(
  props: ReferenceArrayInputProps<Post>,
): void;
declare function acceptSearchInput(props: SearchInputProps<Post>): void;

describe("array, reference and search input sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    acceptArrayInput({ source: "items", children: null });
    acceptArrayInput({ source: "items[0].sku", children: null });
    acceptReferenceInput({ source: "author_id", reference: "authors" });
    acceptReferenceArrayInput({ source: "tag_ids", reference: "tags" });
    acceptSearchInput({ source: "title" });

    // @ts-expect-error "itemz" is not a path of Post
    acceptArrayInput({ source: "itemz", children: null });
    // @ts-expect-error "author_idd" is not a path of Post
    acceptReferenceInput({ source: "author_idd", reference: "authors" });
    // @ts-expect-error "tag_idz" is not a path of Post
    acceptReferenceArrayInput({ source: "tag_idz", reference: "tags" });
    // @ts-expect-error "titel" is not a path of Post
    acceptSearchInput({ source: "titel" });
  });

  it("each React component above takes any string source when no record is named", () => {
    expectTypeOf<ArrayInputProps["source"]>().toBeString();
    expectTypeOf<ReferenceInputProps["source"]>().toBeString();
    expectTypeOf<ReferenceArrayInputProps["source"]>().toBeString();
    expectTypeOf<NonNullable<SearchInputProps["source"]>>().toBeString();
  });

  it("ReferenceInput and ReferenceArrayInput keep reference and lookupKey as string", () => {
    expectTypeOf<ReferenceInputProps["reference"]>().toEqualTypeOf<string>();
    expectTypeOf<ReferenceInputProps["lookupKey"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<
      ReferenceArrayInputProps["reference"]
    >().toEqualTypeOf<string>();
    expectTypeOf<ReferenceArrayInputProps["lookupKey"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});
