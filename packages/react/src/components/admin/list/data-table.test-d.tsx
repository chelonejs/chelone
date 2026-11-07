import type { Identifier, LooseRecord } from "@chelone/core";
import type { ComponentProps, ComponentType } from "react";
import { describe, expectTypeOf, it } from "vitest";
import {
  DataTable,
  type DataTableExpandProps,
  type DataTableProps,
} from "./data-table";

interface Post {
  id: number;
  title: string;
}

type PostProps = ComponentProps<typeof DataTable<Post>>;

describe("DataTable callbacks", () => {
  it("rowClassName receives the table's record", () => {
    expectTypeOf<PostProps["rowClassName"]>().toEqualTypeOf<
      ((record: Post, rowIndex: number) => string | undefined) | undefined
    >();
    expectTypeOf<PostProps["isRowExpandable"]>().toEqualTypeOf<
      ((record: Post) => boolean) | undefined
    >();
    expectTypeOf<PostProps["rowClick"]>().toEqualTypeOf<
      | string
      | false
      | ((record: Post, id: Identifier) => string | false)
      | undefined
    >();
    expectTypeOf<DataTableExpandProps<Post>["record"]>().toEqualTypeOf<Post>();
    expectTypeOf<PostProps["expand"]>().toEqualTypeOf<
      React.ReactElement | ComponentType<DataTableExpandProps<Post>> | undefined
    >();
  });

  it("the record type is inferred from a typed callback", () => {
    const element = (
      <DataTable rowClassName={(record: Post) => record.title}>
        {null}
      </DataTable>
    );
    expectTypeOf(element).not.toBeAny();
  });

  it("a DataTable with no type argument still takes a loose callback", () => {
    expectTypeOf<DataTableProps["rowClassName"]>().toEqualTypeOf<
      | ((record: LooseRecord, rowIndex: number) => string | undefined)
      | undefined
    >();
    const element = (
      <DataTable
        rowClassName={(record: LooseRecord) => String(record.title)}
        isRowExpandable={(record) => record.id !== 0}
      >
        {null}
      </DataTable>
    );
    expectTypeOf(element).not.toBeAny();
  });
});
