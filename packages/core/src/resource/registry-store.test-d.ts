import { describe, expectTypeOf, it } from "vitest";
import {
  computeDefinition,
  createResourceRegistry,
  type ResourceDefinition,
  type ResourceDefinitionMap,
  type ResourceRegistry,
} from "./registry-store";

describe("registry-store types", () => {
  it("ResourceDefinition has the parity §0a-8 shape (icon/recordRepresentation/options optional)", () => {
    expectTypeOf<ResourceDefinition>().toMatchTypeOf<{
      name: string;
      hasList: boolean;
      hasCreate: boolean;
      hasEdit: boolean;
      hasShow: boolean;
    }>();
    expectTypeOf<ResourceDefinition["icon"]>().toEqualTypeOf<unknown>();
    expectTypeOf<ResourceDefinition["options"]>().toEqualTypeOf<
      Record<string, unknown> | undefined
    >();
  });

  it("getAll returns a name-keyed map of definitions", () => {
    const registry = createResourceRegistry();
    expectTypeOf(registry.getAll()).toEqualTypeOf<ResourceDefinitionMap>();
    expectTypeOf(registry.get("x")).toEqualTypeOf<
      ResourceDefinition | undefined
    >();
  });

  it("createResourceRegistry returns the ResourceRegistry contract", () => {
    expectTypeOf(
      createResourceRegistry,
    ).returns.toEqualTypeOf<ResourceRegistry>();
    expectTypeOf<ResourceRegistry["register"]>()
      .parameter(0)
      .toEqualTypeOf<ResourceDefinition>();
    expectTypeOf<ResourceRegistry["unregister"]>()
      .parameter(0)
      .toEqualTypeOf<string>();
    expectTypeOf<ResourceRegistry["subscribe"]>().returns.toEqualTypeOf<
      () => void
    >();
  });

  it("computeDefinition accepts framework-neutral component props and returns a ResourceDefinition", () => {
    const def = computeDefinition({ name: "posts", list: () => null });
    expectTypeOf(def).toEqualTypeOf<ResourceDefinition>();
    // components are `unknown` (framework-neutral): any value is accepted
    computeDefinition({ name: "posts", list: 123, edit: "x" });
  });
});
