import { describe, expect, it } from "vitest";
import type { Permission } from "./access-control";
import {
  getPermissionCell,
  isPermissionRowGranted,
  type PermissionMatrixValue,
  setPermissionRow,
  togglePermission,
} from "./permission-matrix";

describe("getPermissionCell", () => {
  it("is granted by an exact grant whose action is a string or an array", () => {
    expect(
      getPermissionCell(
        [{ resource: "posts", action: "list" }],
        "posts",
        "list",
      ),
    ).toBe("granted");
    expect(
      getPermissionCell(
        [{ resource: "posts", action: ["list", "edit"] }],
        "posts",
        "edit",
      ),
    ).toBe("granted");
  });

  it("is inherited from a resource wildcard, a prefix wildcard or an action wildcard", () => {
    expect(
      getPermissionCell([{ resource: "*", action: "list" }], "posts", "list"),
    ).toBe("inherited");
    expect(
      getPermissionCell(
        [{ resource: "posts.*", action: ["list"] }],
        "posts.comments",
        "list",
      ),
    ).toBe("inherited");
    expect(
      getPermissionCell([{ resource: "posts", action: "*" }], "posts", "edit"),
    ).toBe("inherited");
  });

  it("ignores a grant with a record predicate", () => {
    const grants: Permission[] = [
      { resource: "posts", action: "edit", record: () => true },
      { resource: "*", action: "list", record: () => true },
    ];
    expect(getPermissionCell(grants, "posts", "edit")).toBe("denied");
    expect(getPermissionCell(grants, "posts", "list")).toBe("denied");
  });

  it("is denied with no matching grant", () => {
    expect(getPermissionCell([], "posts", "list")).toBe("denied");
    expect(
      getPermissionCell(
        [{ resource: "users", action: "list" }],
        "posts",
        "list",
      ),
    ).toBe("denied");
    expect(
      getPermissionCell(
        [{ resource: "posts", action: "show" }],
        "posts",
        "list",
      ),
    ).toBe("denied");
  });
});

describe("togglePermission", () => {
  it("adds a denied action to the resource's existing grant", () => {
    const array = togglePermission(
      { admin: [{ resource: "posts", action: ["list"] }] },
      "admin",
      "posts",
      "edit",
    );
    expect(array).toEqual({
      admin: [{ resource: "posts", action: ["list", "edit"] }],
    });

    const string = togglePermission(
      { admin: [{ resource: "posts", action: "list" }] },
      "admin",
      "posts",
      "edit",
    );
    expect(string).toEqual({
      admin: [{ resource: "posts", action: ["list", "edit"] }],
    });
  });

  it("appends a new grant when the resource has none", () => {
    const value: PermissionMatrixValue = {
      admin: [{ resource: "users", action: ["list"] }],
    };
    expect(togglePermission(value, "admin", "posts", "list")).toEqual({
      admin: [
        { resource: "users", action: ["list"] },
        { resource: "posts", action: ["list"] },
      ],
    });
  });

  it("removes a granted action and drops a grant left empty", () => {
    const value: PermissionMatrixValue = {
      admin: [
        { resource: "posts", action: ["list", "edit"] },
        { resource: "posts", action: "edit" },
      ],
    };
    expect(togglePermission(value, "admin", "posts", "edit")).toEqual({
      admin: [{ resource: "posts", action: ["list"] }],
    });
  });

  it("returns the same value for an inherited cell", () => {
    const value: PermissionMatrixValue = {
      admin: [{ resource: "*", action: "*" }],
    };
    expect(togglePermission(value, "admin", "posts", "list")).toBe(value);
  });

  it("starts a role that is missing from the value", () => {
    expect(togglePermission({}, "editor", "posts", "list")).toEqual({
      editor: [{ resource: "posts", action: ["list"] }],
    });
  });

  it("keeps predicate grants, other resources and other roles as they were", () => {
    const predicate: Permission = {
      resource: "posts",
      action: ["edit"],
      record: () => true,
    };
    const other: Permission = { resource: "users", action: ["edit"] };
    const editorGrants: Permission[] = [{ resource: "posts", action: "list" }];
    const value: PermissionMatrixValue = {
      admin: [predicate, other, { resource: "posts", action: ["list"] }],
      editor: editorGrants,
    };

    const added = togglePermission(value, "admin", "posts", "edit");
    const [addedFirst, addedSecond, addedThird] = added.admin ?? [];
    expect(addedFirst).toBe(predicate);
    expect(addedSecond).toBe(other);
    expect(addedThird).toEqual({
      resource: "posts",
      action: ["list", "edit"],
    });
    expect(added.editor).toBe(editorGrants);

    const removed = togglePermission(
      {
        admin: [predicate, other, { resource: "posts", action: ["edit"] }],
        editor: editorGrants,
      },
      "admin",
      "posts",
      "edit",
    );
    expect(removed.admin).toEqual([predicate, other]);
    const [removedFirst, removedSecond] = removed.admin ?? [];
    expect(removedFirst).toBe(predicate);
    expect(removedSecond).toBe(other);
    expect(removed.editor).toBe(editorGrants);
  });

  it("does not mutate the value", () => {
    const grant: Permission = { resource: "posts", action: ["list"] };
    const grants = [grant];
    const value: PermissionMatrixValue = { admin: grants };

    togglePermission(value, "admin", "posts", "edit");
    togglePermission(value, "admin", "posts", "list");

    expect(value).toEqual({ admin: [{ resource: "posts", action: ["list"] }] });
    expect(value.admin).toBe(grants);
    expect(grants).toEqual([{ resource: "posts", action: ["list"] }]);
    expect(grant.action).toEqual(["list"]);
  });
});

describe("setPermissionRow", () => {
  it("grants or removes every listed action and skips inherited cells", () => {
    const value: PermissionMatrixValue = {
      admin: [
        { resource: "posts", action: ["list"] },
        { resource: "*", action: "delete" },
      ],
      editor: [],
    };
    const actions = ["list", "edit", "delete"];

    const granted = setPermissionRow(value, "admin", "posts", actions, true);
    expect(granted).toEqual({
      admin: [
        { resource: "posts", action: ["list", "edit"] },
        { resource: "*", action: "delete" },
      ],
      editor: [],
    });
    expect(granted.editor).toBe(value.editor);

    const removed = setPermissionRow(granted, "admin", "posts", actions, false);
    expect(removed.admin).toEqual([{ resource: "*", action: "delete" }]);
    expect(value.admin).toHaveLength(2);
  });
});

describe("isPermissionRowGranted", () => {
  it("counts inherited cells as granted", () => {
    const actions = ["list", "edit"];
    expect(
      isPermissionRowGranted(
        [
          { resource: "posts", action: "list" },
          { resource: "posts.*", action: "edit" },
          { resource: "*", action: "edit" },
        ],
        "posts",
        actions,
      ),
    ).toBe(true);
    expect(
      isPermissionRowGranted(
        [{ resource: "posts", action: "list" }],
        "posts",
        actions,
      ),
    ).toBe(false);
  });
});
