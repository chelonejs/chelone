/**
 * A reference field's `source` is a path into the current record: the FK for
 * `ReferenceField` and `ReferenceArrayField`, the key the reverse lookup matches
 * for the other three. All take `SourceProp`. `target` names a field of the
 * referenced resource and stays a plain `string`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type ReferenceArrayField from "./reference-array-field.vue";
import type ReferenceField from "./reference-field.vue";
import type ReferenceManyCount from "./reference-many-count.vue";
import type ReferenceManyField from "./reference-many-field.vue";
import type ReferenceOneField from "./reference-one-field.vue";

describe("reference field sources", () => {
  it("the ReferenceField source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ReferenceArrayField source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceArrayField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ReferenceOneField source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceOneField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("the ReferenceManyField source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceManyField>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });

  it("the ReferenceManyCount source prop is SourceProp", () => {
    type Props = Parameters<typeof ReferenceManyCount>[0];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp | undefined>();
  });
});
