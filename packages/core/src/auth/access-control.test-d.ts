import { describe, expectTypeOf, it } from "vitest";
import type { ResourceRecord } from "../resource/record";
import { canAccessWithPermissions, type Permission } from "./access-control";
import type { AuthProvider, CanAccessParams } from "./types";

/** A registered record: an `id` plus the fields a record-level grant reads. */
interface Post extends ResourceRecord {
  id: number;
  author: string;
}

const verbs = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
};

describe("Permission", () => {
  it("a Permission<Post> predicate receives Post", () => {
    const own: Permission<Post> = {
      action: "edit",
      resource: "posts",
      record: (record) => {
        expectTypeOf(record).toEqualTypeOf<Post>();
        return record.author === "rin";
      },
    };
    expectTypeOf(own.record).toEqualTypeOf<
      ((record: Post) => boolean) | undefined
    >();
  });

  it("a Permission<Post> predicate rejects a field Post does not have", () => {
    const perms: Permission<Post>[] = [
      {
        action: "edit",
        resource: "posts",
        // @ts-expect-error Post has no `title`
        record: (record) => record.title === "hello",
      },
    ];
    expectTypeOf(perms).toEqualTypeOf<Permission<Post>[]>();
  });

  it("the default Permission reads a ResourceRecord", () => {
    expectTypeOf<Permission>().toEqualTypeOf<Permission<ResourceRecord>>();
    expectTypeOf<Permission["record"]>().toEqualTypeOf<
      ((record: ResourceRecord) => boolean) | undefined
    >();
  });
});

describe("canAccessWithPermissions", () => {
  it("infers TRecord from the permissions the caller passes", () => {
    const perms: Permission<Post>[] = [
      { action: "edit", resource: "posts", record: (r) => r.author === "rin" },
    ];
    expectTypeOf(
      canAccessWithPermissions(perms, {
        action: "edit",
        resource: "posts",
        record: { id: 1, author: "rin" },
      }),
    ).toEqualTypeOf<boolean>();
  });

  it("rejects a record with no id at the call site", () => {
    const perms: Permission<Post>[] = [{ action: "edit", resource: "posts" }];
    const granted = canAccessWithPermissions(perms, {
      action: "edit",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a Post
      record: { author: "rin" },
    });
    expectTypeOf(granted).toEqualTypeOf<boolean>();
  });
});

describe("CanAccessParams", () => {
  it("defaults to a ResourceRecord, which AuthProvider.canAccess keeps", () => {
    expectTypeOf<CanAccessParams>().toEqualTypeOf<
      CanAccessParams<ResourceRecord>
    >();
    expectTypeOf<NonNullable<AuthProvider["canAccess"]>>()
      .parameter(0)
      .toEqualTypeOf<CanAccessParams<ResourceRecord>>();
  });

  it("rejects a record with no id", () => {
    const missing: CanAccessParams = {
      action: "show",
      resource: "posts",
      // @ts-expect-error a record with no `id` is not a record
      record: { title: "hi" },
    };
    expectTypeOf(missing).toEqualTypeOf<CanAccessParams>();
  });

  it("gives an authProvider implementation the record's fields", () => {
    const provider: AuthProvider = {
      ...verbs,
      canAccess: async ({ action, record }) => {
        expectTypeOf(record).toEqualTypeOf<ResourceRecord | undefined>();
        return action === "edit" && record?.id === 1;
      },
    };
    expectTypeOf(provider.canAccess).toEqualTypeOf<
      | ((params: CanAccessParams<ResourceRecord>) => Promise<boolean>)
      | undefined
    >();
  });
});
