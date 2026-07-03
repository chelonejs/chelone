/**
 * W1-T6 type tests: `<Admin>`'s config props are typed, the slot statics are
 * present, and `partitionChildren` returns the fully-typed partition shape.
 *
 * `.test-d.ts` files cannot use JSX (they are `.ts`); nodes are built with
 * `createElement` and assertions are type-level only.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { RouterAdapter } from "../router/adapter";
import type { AdminProps } from "./admin";
import { Admin } from "./admin";
import type { AdminChildren, PartitionedChildren } from "./partition";
import { partitionChildren } from "./partition";
import {
  AdminDashboard,
  AdminTitle,
  type CustomRoutesComponent,
  type SlotComponent,
} from "./slots";

describe("AdminProps", () => {
  it("requires dataProvider + queryClient, everything else optional", () => {
    expectTypeOf<AdminProps>().toHaveProperty("dataProvider");
    expectTypeOf<AdminProps>().toHaveProperty("queryClient");
    // Optional config props exist on the type.
    expectTypeOf<AdminProps["basename"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AdminProps["requireAuth"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<AdminProps["router"]>().toEqualTypeOf<
      RouterAdapter | undefined
    >();
  });

  it("accepts a minimal valid props object", () => {
    const props: AdminProps = {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient(),
    };
    assertType<AdminProps>(props);
  });

  it("exposes every page-slot override prop", () => {
    expectTypeOf<AdminProps["dashboard"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<AdminProps["layout"]>().toEqualTypeOf<ReactNode | undefined>();
    expectTypeOf<AdminProps["title"]>().toEqualTypeOf<ReactNode | undefined>();
  });
});

describe("Admin slot statics", () => {
  it("exposes the 11 page-slot markers + CustomRoutes as statics", () => {
    expectTypeOf(Admin.Title).toEqualTypeOf<typeof AdminTitle>();
    expectTypeOf(Admin.Dashboard).toEqualTypeOf<typeof AdminDashboard>();
    expectTypeOf(Admin).toHaveProperty("Title");
    expectTypeOf(Admin).toHaveProperty("Layout");
    expectTypeOf(Admin).toHaveProperty("LoginPage");
    expectTypeOf(Admin).toHaveProperty("Dashboard");
    expectTypeOf(Admin).toHaveProperty("CatchAll");
    expectTypeOf(Admin).toHaveProperty("Error");
    expectTypeOf(Admin).toHaveProperty("Ready");
    expectTypeOf(Admin).toHaveProperty("AuthCallback");
    expectTypeOf(Admin).toHaveProperty("Loading");
    expectTypeOf(Admin).toHaveProperty("AccessDenied");
    expectTypeOf(Admin).toHaveProperty("AuthenticationError");
    expectTypeOf(Admin).toHaveProperty("CustomRoutes");
  });

  it("a page slot is a SlotComponent; CustomRoutes is a CustomRoutesComponent", () => {
    expectTypeOf(AdminDashboard).toMatchTypeOf<SlotComponent>();
    expectTypeOf(Admin.CustomRoutes).toMatchTypeOf<CustomRoutesComponent>();
  });
});

describe("partitionChildren", () => {
  it("returns a fully-typed PartitionedChildren", () => {
    const parts = partitionChildren(createElement(AdminDashboard, null, "x"));
    expectTypeOf(parts).toEqualTypeOf<PartitionedChildren>();
    expectTypeOf(parts.resources).toBeArray();
    expectTypeOf(parts.slots.dashboard).toEqualTypeOf<ReactNode | undefined>();
  });

  it("AdminChildren covers both a node and a (permissions) => node | Promise<node>", () => {
    const asNode: AdminChildren = createElement(AdminTitle, null, "app");
    assertType<AdminChildren>(asNode);
    const asFn: AdminChildren = (_permissions: unknown) =>
      createElement(AdminTitle, null, "app");
    assertType<AdminChildren>(asFn);
    const asAsyncFn: AdminChildren = async (_permissions: unknown) =>
      createElement(AdminTitle, null, "app") as ReactNode;
    assertType<AdminChildren>(asAsyncFn);
  });
});
