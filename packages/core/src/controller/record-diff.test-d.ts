import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import {
  type DiffStatus,
  diffRecords,
  type RecordDiffRow,
} from "./record-diff";

interface Post {
  id: number;
  title: string;
  author: { name: string };
}

const before: Post = { id: 1, title: "a", author: { name: "x" } };
const after: Post = { id: 1, title: "b", author: { name: "y" } };
const loose: LooseRecord = { id: 1 };

describe("diffRecords sources", () => {
  it("diffRecords accepts paths of the record", () => {
    const rows = diffRecords(before, after, ["title", "author.name"]);
    expectTypeOf(rows).toEqualTypeOf<RecordDiffRow[]>();
    expectTypeOf<RecordDiffRow["status"]>().toEqualTypeOf<DiffStatus>();
    expectTypeOf<DiffStatus>().toEqualTypeOf<
      "unchanged" | "added" | "removed" | "changed"
    >();
  });

  it("it rejects a path that is not on the record", () => {
    // @ts-expect-error not a path of Post
    diffRecords(before, after, ["headline"]);
  });

  it("a loose record takes any string", () => {
    diffRecords(loose, loose, ["anything.at[0].all"]);
  });
});
