/**
 * The array, record, function and wrapper fields read or forward one record
 * field, so their `source` is a path into the record and takes `SourceProp`.
 * `RecordField` and `FunctionField` are generic in their record; with the
 * default record the path is any `string`. A generic component is a function
 * whose first parameter is its props, so those two read it with `Parameters`.
 */

import type { SourceProp, SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type ArrayField from "./array-field.vue";
import type FunctionField from "./function-field.vue";
import type RecordField from "./record-field.vue";
import type WrapperField from "./wrapper-field.vue";

type Post = {
  id: number;
  title: string;
  tags: string[];
};

describe("composite field sources", () => {
  it("the ArrayField source prop is SourceProp", () => {
    type Props = Parameters<typeof ArrayField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ArrayField defaultValue for Post is the value type of a Post path", () => {
    type Props = Parameters<typeof ArrayField<Post>>[0];
    expectTypeOf<Props["defaultValue"]>().toEqualTypeOf<
      SourceValue<Post, SourceProp<Post>> | undefined
    >();
  });

  it("the RecordField source prop is SourceProp", () => {
    type Props = Parameters<typeof RecordField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("the FunctionField source prop is SourceProp", () => {
    type Props = Parameters<typeof FunctionField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("the WrapperField source prop is SourceProp", () => {
    type Props = InstanceType<typeof WrapperField>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });
});
