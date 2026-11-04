/**
 * Type-level pins for the W1-T5 resource layer: the `<Resource>` static
 * contract, the `ResourceContextValue`, and the registry hook signatures are
 * `any`-free and shaped as the parity contract requires.
 */

import type { ResourceDefinition } from "@chelone/core";
import type { ReactElement } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { EditGuesser } from "../components/admin/guessers/edit-guesser";
import { ListGuesser } from "../components/admin/guessers/list-guesser";
import { ShowGuesser } from "../components/admin/guessers/show-guesser";
import {
  useResourceDefinition,
  useResourceDefinitions,
} from "./registry-hooks";
import {
  Resource,
  type ResourceProps,
  type ResourceViewChild,
} from "./resource";
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

/**
 * The view slots (`list`, `create`, `edit`, `show`) render their component with
 * no props, so any component whose props are all optional fits — that is what
 * makes `<Resource name="posts" list={ListGuesser} />` type-check.
 */
describe("Resource view slots", () => {
  it("takes a component whose props are all optional", () => {
    expectTypeOf(ListGuesser).toMatchTypeOf<ResourceViewChild>();
    expectTypeOf(EditGuesser).toMatchTypeOf<ResourceViewChild>();
    expectTypeOf(ShowGuesser).toMatchTypeOf<ResourceViewChild>();
  });

  it("takes the guessers as the list, edit and show views", () => {
    // The shape the guessers page and the guesser doc comments show.
    const props: ResourceProps = {
      name: "posts",
      list: ListGuesser,
      edit: EditGuesser,
      show: ShowGuesser,
    };
    expectTypeOf(props).toEqualTypeOf<ResourceProps>();
  });

  it("takes a component with no props and an element", () => {
    expectTypeOf(() => null).toMatchTypeOf<ResourceViewChild>();
    expectTypeOf<ReactElement>().toMatchTypeOf<ResourceViewChild>();
  });

  it("refuses a component with a required prop", () => {
    const NeedsId = (_props: { id: string }) => null;
    // @ts-expect-error `id` is required, and the slot renders the view with no props
    const view: ResourceViewChild = NeedsId;
    expectTypeOf(view).toEqualTypeOf<ResourceViewChild>();
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
