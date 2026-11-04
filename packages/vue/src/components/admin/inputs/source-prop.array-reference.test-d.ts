/**
 * The array, reference, reference-array and search inputs take `source` as a
 * path of the record, which is `string` until an app registers its resources.
 * `ReferenceInput` and `ReferenceArrayInput` keep `reference` as `string`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type ArrayInput from "./array-input.vue";
import type ReferenceArrayInput from "./reference-array-input.vue";
import type ReferenceInput from "./reference-input.vue";
import type SearchInput from "./search-input.vue";

describe("array, reference and search input sources", () => {
  it("the ArrayInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof ArrayInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ReferenceInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof ReferenceInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["reference"]>().toEqualTypeOf<string>();
  });

  it("the ReferenceArrayInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof ReferenceArrayInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["reference"]>().toEqualTypeOf<string>();
  });

  it("the SearchInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof SearchInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });
});
