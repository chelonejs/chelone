/**
 * Type-level pins for the W1-T5 resource layer: the `<Resource>` static
 * contract, the `ResourceContextValue`, and the registry hook signatures are
 * `any`-free and shaped as the parity contract requires.
 */

import type { ResourceDefinition } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import {
  useResourceDefinition,
  useResourceDefinitions,
} from "./registry-hooks";
import { Resource, type ResourceProps } from "./resource";
import type { ResourceContextValue } from "./resource-context";
import { useResourceContext } from "./resource-context";

describe("Resource static contract", () => {
  it("registerResource returns a core ResourceDefinition", () => {
    expectTypeOf(
      Resource.registerResource,
    ).returns.toEqualTypeOf<ResourceDefinition>();
  });

  it("registerResource accepts (ResourceProps, permissions)", () => {
    expectTypeOf<
      Parameters<typeof Resource.registerResource>[0]
    >().toEqualTypeOf<ResourceProps>();
    // permissions is unknown (never any).
    expectTypeOf<
      Parameters<typeof Resource.registerResource>[1]
    >().toEqualTypeOf<unknown>();
  });

  it("chelName marker is the literal 'Resource'", () => {
    expectTypeOf(Resource.chelName).toEqualTypeOf<"Resource">();
  });
});

describe("ResourceContext + hooks", () => {
  it("ResourceContextValue is string | undefined (never any)", () => {
    expectTypeOf<ResourceContextValue>().toEqualTypeOf<string | undefined>();
  });

  it("useResourceContext returns string | undefined", () => {
    expectTypeOf(useResourceContext).returns.toEqualTypeOf<
      string | undefined
    >();
  });

  it("useResourceDefinitions returns a name→definition map", () => {
    expectTypeOf(useResourceDefinitions).returns.toEqualTypeOf<{
      [name: string]: ResourceDefinition;
    }>();
  });

  it("useResourceDefinition returns a (partial) ResourceDefinition", () => {
    expectTypeOf(useResourceDefinition).returns.toEqualTypeOf<
      Partial<ResourceDefinition>
    >();
  });
});
