import { describe, expectTypeOf, it } from "vitest";
import {
  type ComputeDefinitionProps,
  computeDefinition,
  createResourceRegistry,
  type ResourceComponent,
  type ResourceDefinition,
  type ResourceDefinitionMap,
  type ResourceIcon,
  type ResourceRegistry,
  type ResourceRepresentation,
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
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<ResourceDefinition["icon"]>().toEqualTypeOf<unknown>();
    type Representation = ResourceDefinition["recordRepresentation"];
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<Representation>().toEqualTypeOf<unknown>();
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

  it("with nothing registered a resource name is any string, and lookups take any string", () => {
    expectTypeOf<ResourceDefinition["name"]>().toEqualTypeOf<string>();
    expectTypeOf<ComputeDefinitionProps["name"]>().toEqualTypeOf<string>();
    const registry = createResourceRegistry();
    registry.get("x");
    registry.unregister("x");
    expectTypeOf<ResourceRegistry["get"]>()
      .parameter(0)
      .toEqualTypeOf<string>();
    expectTypeOf<ResourceDefinitionMap>().toEqualTypeOf<{
      [name: string]: ResourceDefinition;
    }>();
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
    // with no augmentation the slots are `unknown`: any value is accepted
    computeDefinition({ name: "posts", list: 123, edit: "x" });
  });

  it("with no augmentation every ResourceSlots type is unknown", () => {
    // No file in this package augments `ResourceSlots`: augmentation is global
    // to a TypeScript program, and these must resolve for adapter-less callers.
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<ResourceIcon>().toEqualTypeOf<unknown>();
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<ResourceRepresentation>().toEqualTypeOf<unknown>();
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<ResourceComponent>().toEqualTypeOf<unknown>();
    // type-escape: pins the fallback an unaugmented program gets
    expectTypeOf<ComputeDefinitionProps["list"]>().toEqualTypeOf<unknown>();
  });
});
