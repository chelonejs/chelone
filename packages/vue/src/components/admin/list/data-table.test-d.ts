import type { LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type DataTable from "./data-table.vue";
import type { DataTableProps } from "./data-table.vue";

interface Post {
  id: number;
  title: string;
}

type PostProps = DataTableProps<Post>;
type PostSlots = NonNullable<Parameters<typeof DataTable<Post>>[1]>["slots"];

describe("DataTable callbacks", () => {
  it("rowClass receives the table's record", () => {
    expectTypeOf<PostProps["rowClass"]>().toEqualTypeOf<
      | ((record: Post, rowIndex: number) => string | false | undefined)
      | undefined
    >();
    expectTypeOf<PostProps["isRowExpandable"]>().toEqualTypeOf<
      ((record: Post) => boolean) | undefined
    >();
    expectTypeOf<
      Parameters<Exclude<NonNullable<PostProps["rowClick"]>, string | false>>[0]
    >().toEqualTypeOf<Post>();
    expectTypeOf<
      Parameters<NonNullable<PostSlots["expand"]>>[0]["record"]
    >().toEqualTypeOf<Post>();
  });

  it("a callback that reads a field the record lacks is rejected", () => {
    const props: PostProps[] = [
      // @ts-expect-error `Post` has no `author`
      { rowClass: (record) => record.author },
    ];
    expectTypeOf(props).not.toBeAny();
  });

  it("a DataTable with no type argument still takes a loose callback", () => {
    expectTypeOf<DataTableProps["rowClass"]>().toEqualTypeOf<
      | ((record: LooseRecord, rowIndex: number) => string | false | undefined)
      | undefined
    >();
    const props: DataTableProps = {
      rowClass: (record) => String(record.title),
      isRowExpandable: (record) => record.id !== 0,
    };
    expectTypeOf(props).not.toBeAny();
  });
});
