/**
 * The update buttons and `<CanAccess>` take any record: a type the app wrote as
 * an interface has no index signature, so a `LooseRecord` bound would refuse it.
 * The Vue twin of `@chelone/react`'s `buttons/update-record-props.test-d.tsx`.
 */

import type { LooseRecord, ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { CanAccessProps } from "../auth/can-access.vue";
import type { BulkUpdateButtonProps } from "./bulk-update-button.vue";
import type UpdateButton from "./update-button.vue";
import type { UpdateButtonProps } from "./update-button.vue";

interface Post {
  id: number;
  title: string;
  views: number;
}

describe("update buttons record props", () => {
  it("onSuccess receives the button's record type", () => {
    // A mounted button takes the `success` event as an `onSuccess` prop.
    type Handler<T extends ResourceRecord> = NonNullable<
      Parameters<typeof UpdateButton<T>>[0]["onSuccess"]
    >;
    expectTypeOf<Parameters<Handler<Post>>[0]>().toEqualTypeOf<Post>();
    expectTypeOf<
      Parameters<Handler<LooseRecord>>[0]
    >().toEqualTypeOf<LooseRecord>();
    expectTypeOf<UpdateButtonProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
  });

  it("data follows the button's record type", () => {
    expectTypeOf<UpdateButtonProps<Post>["data"]>().toEqualTypeOf<
      Partial<Post>
    >();
    expectTypeOf<BulkUpdateButtonProps<Post>["data"]>().toEqualTypeOf<
      Partial<Post> | undefined
    >();
  });

  it("a misspelled field in data fails", () => {
    const update: UpdateButtonProps<Post> = {
      // @ts-expect-error `view` is not a field of Post
      data: { view: 0 },
    };
    const bulk: BulkUpdateButtonProps<Post> = {
      // @ts-expect-error `view` is not a field of Post
      data: { view: 0 },
    };
    expectTypeOf([update, bulk]).not.toBeAny();
  });

  it("CanAccess takes a record typed by an interface", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
    const post: Post = { id: 1, title: "a", views: 2 };
    const gate: CanAccessProps = {
      action: "edit",
      resource: "posts",
      record: post,
    };
    expectTypeOf(gate).toEqualTypeOf<CanAccessProps>();
  });
});
