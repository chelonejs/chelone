import { describe, expectTypeOf, it } from "vitest";
import { createInspector, type InspectorSelection } from "./inspector";

describe("createInspector types", () => {
  it("select takes the editor type the inspector was created with", () => {
    const inspector = createInspector<{ name: string }>();
    inspector.select({ key: "a", editor: { name: "x" } });
    expectTypeOf(inspector.select)
      .parameter(0)
      .toEqualTypeOf<InspectorSelection<{ name: string }>>();
    expectTypeOf(
      inspector.store.getSnapshot().selected,
    ).toEqualTypeOf<InspectorSelection<{
      name: string;
    }> | null>();
  });

  it("a different editor type is rejected", () => {
    const inspector = createInspector<{ name: string }>();
    // @ts-expect-error editor must be { name: string }
    inspector.select({ key: "a", editor: 3 });
  });
});
