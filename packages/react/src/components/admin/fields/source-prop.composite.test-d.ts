/**
 * The array, record, function and wrapper fields read or forward one record
 * field, so their `source` is a path into the record and takes
 * `SourceProp<RecordType>`.
 */

import { describe, it } from "vitest";
import type { ArrayFieldProps } from "./array-field";
import type { FunctionFieldProps } from "./function-field";
import type { RecordFieldProps } from "./record-field";
import type { WrapperFieldProps } from "./wrapper-field";

type Post = {
  id: number;
  title: string;
  tags: { id: number }[];
};

declare const post: Post;

describe("composite field sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    const array: ArrayFieldProps<Post>[] = [
      { record: post, source: "tags" },
      // @ts-expect-error "tagz" is not a path of Post
      { record: post, source: "tagz" },
    ];

    const record: RecordFieldProps<Post>[] = [
      { record: post, source: "title" },
      // @ts-expect-error "titel" is not a path of Post
      { record: post, source: "titel" },
    ];

    const fn: FunctionFieldProps<Post>[] = [
      { record: post, source: "title", render: () => null },
      // @ts-expect-error "titel" is not a path of Post
      { record: post, source: "titel", render: () => null },
    ];

    const wrapper: WrapperFieldProps<Post>[] = [
      { record: post, source: "title", children: null },
      // @ts-expect-error "titel" is not a path of Post
      { record: post, source: "titel", children: null },
    ];

    void [array, record, fn, wrapper];
  });
});
