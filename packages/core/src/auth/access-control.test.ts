import { describe, expect, it } from "vitest";
import { canAccessWithPermissions, type Permission } from "./access-control";

describe("canAccessWithPermissions", () => {
  it("denies by default (empty permissions)", () => {
    expect(
      canAccessWithPermissions([], { action: "list", resource: "posts" }),
    ).toBe(false);
  });

  it("matches exact action + resource", () => {
    const perms: Permission[] = [
      { action: ["list", "show"], resource: "posts" },
    ];
    expect(
      canAccessWithPermissions(perms, { action: "list", resource: "posts" }),
    ).toBe(true);
    expect(
      canAccessWithPermissions(perms, { action: "edit", resource: "posts" }),
    ).toBe(false);
    expect(
      canAccessWithPermissions(perms, { action: "list", resource: "users" }),
    ).toBe(false);
  });

  it("supports * wildcards on action and resource", () => {
    expect(
      canAccessWithPermissions([{ action: "*", resource: "posts" }], {
        action: "delete",
        resource: "posts",
      }),
    ).toBe(true);
    expect(
      canAccessWithPermissions([{ action: "read", resource: "*" }], {
        action: "read",
        resource: "anything",
      }),
    ).toBe(true);
  });

  it("supports prefix wildcards on resource (posts.*)", () => {
    const perms: Permission[] = [{ action: "read", resource: "posts.*" }];
    expect(
      canAccessWithPermissions(perms, {
        action: "read",
        resource: "posts.title",
      }),
    ).toBe(true);
    expect(
      canAccessWithPermissions(perms, { action: "read", resource: "posts" }),
    ).toBe(false);
    expect(
      canAccessWithPermissions(perms, {
        action: "read",
        resource: "users.name",
      }),
    ).toBe(false);
  });

  it("record predicate gates when a record is provided", () => {
    const own: Permission[] = [
      {
        action: "edit",
        resource: "posts",
        record: (r) => (r as { author: string }).author === "rin",
      },
    ];
    expect(
      canAccessWithPermissions(own, {
        action: "edit",
        resource: "posts",
        record: { author: "rin" },
      }),
    ).toBe(true);
    expect(
      canAccessWithPermissions(own, {
        action: "edit",
        resource: "posts",
        record: { author: "eve" },
      }),
    ).toBe(false);
    // no record given → predicate permission does NOT grant blanket access
    expect(
      canAccessWithPermissions(own, { action: "edit", resource: "posts" }),
    ).toBe(false);
  });

  it("any matching permission grants (OR semantics)", () => {
    const perms: Permission[] = [
      { action: "read", resource: "users" },
      { action: "*", resource: "posts" },
    ];
    expect(
      canAccessWithPermissions(perms, { action: "edit", resource: "posts" }),
    ).toBe(true);
  });
});
