/**
 * A reference field's `source` is a path into the current record: the FK for
 * `ReferenceField` and `ReferenceArrayField`, the key the reverse lookup matches
 * for the other three. All take `SourceProp<RecordType>`. `target` names a field
 * of the referenced resource and stays a plain `string`.
 */

import { describe, it } from "vitest";
import type { ReferenceArrayFieldProps } from "./reference-array-field";
import type { ReferenceFieldProps } from "./reference-field";
import type { ReferenceManyCountProps } from "./reference-many-count";
import type { ReferenceManyFieldProps } from "./reference-many-field";
import type { ReferenceOneFieldProps } from "./reference-one-field";

type Post = {
  id: number;
  author_id: number;
  tag_ids: number[];
  author?: { id: number };
};

declare const post: Post;

describe("reference field sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    const field: ReferenceFieldProps<Post>[] = [
      { record: post, source: "author_id", reference: "authors" },
      { record: post, source: "author.id", reference: "authors" },
      // @ts-expect-error "autor_id" is not a path of Post
      { record: post, source: "autor_id", reference: "authors" },
    ];

    const arrayField: ReferenceArrayFieldProps<Post>[] = [
      { record: post, source: "tag_ids", reference: "tags" },
      // @ts-expect-error "tag_id" is not a path of Post
      { record: post, source: "tag_id", reference: "tags" },
    ];

    const oneField: ReferenceOneFieldProps<Post>[] = [
      { record: post, source: "id", reference: "bios", target: "author_id" },
      // @ts-expect-error "idd" is not a path of Post
      { record: post, source: "idd", reference: "bios", target: "author_id" },
    ];

    const manyField: ReferenceManyFieldProps<Post>[] = [
      { record: post, source: "id", reference: "comments", target: "post_id" },
      // @ts-expect-error "idd" is not a path of Post
      { record: post, source: "idd", reference: "comments", target: "post_id" },
    ];

    const manyCount: ReferenceManyCountProps<Post>[] = [
      { record: post, source: "id", reference: "comments", target: "post_id" },
      // @ts-expect-error "idd" is not a path of Post
      { record: post, source: "idd", reference: "comments", target: "post_id" },
    ];

    void [field, arrayField, oneField, manyField, manyCount];
  });
});
