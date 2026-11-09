/**
 * The array, reference, reference-array and search inputs take `source` as a
 * path of the record, which is `string` until an app registers its resources.
 * `ReferenceInput` and `ReferenceArrayInput` take `reference` as a registered
 * resource name, which is `string` until an app registers its resources.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ArrayInputProps } from "./array-input.vue";
import type ReferenceArrayInput from "./reference-array-input.vue";
import type ReferenceInput from "./reference-input.vue";
import type SearchInput from "./search-input.vue";

describe("array, reference and search input sources", () => {
  it("the ArrayInput source prop is SourceProp", () => {
    expectTypeOf<ArrayInputProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ReferenceInput source prop is SourceProp", () => {
    // A generic SFC is a function whose first parameter is its props.
    type Props = Parameters<typeof ReferenceInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["reference"]>().toEqualTypeOf<string>();
  });

  it("the ReferenceArrayInput source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceArrayInput>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["reference"]>().toEqualTypeOf<string>();
  });

  it("the SearchInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof SearchInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });
});
