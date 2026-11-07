/**
 * The update buttons and `<CanAccess>` take any record: a type the app wrote as
 * an interface has no index signature, so a `LooseRecord` bound would refuse it.
 */

import type { LooseRecord, ResourceRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { CanAccess, type CanAccessProps } from "../auth/can-access";
import {
  BulkUpdateButton,
  type BulkUpdateButtonProps,
} from "./bulk-update-button";
import { UpdateButton, type UpdateButtonProps } from "./update-button";

interface Post {
  id: number;
  title: string;
  views: number;
}

describe("update buttons record props", () => {
  it("onSuccess receives the button's record type", () => {
    expectTypeOf<UpdateButtonProps<Post>["onSuccess"]>().toEqualTypeOf<
      ((data: Post) => void) | undefined
    >();
    expectTypeOf<UpdateButtonProps["onSuccess"]>().toEqualTypeOf<
      ((data: LooseRecord) => void) | undefined
    >();
    <UpdateButton<Post>
      data={{ views: 0 }}
      onSuccess={(post) => expectTypeOf(post).toEqualTypeOf<Post>()}
    />;
  });

  it("record and data follow the button's record type", () => {
    expectTypeOf<UpdateButtonProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<UpdateButtonProps<Post>["data"]>().toEqualTypeOf<
      Partial<Post>
    >();
    expectTypeOf<BulkUpdateButtonProps<Post>["data"]>().toEqualTypeOf<
      Partial<Post> | undefined
    >();
  });

  it("a misspelled field in data fails", () => {
    // @ts-expect-error `view` is not a field of Post
    <UpdateButton<Post> data={{ view: 0 }} />;
    // @ts-expect-error `view` is not a field of Post
    <BulkUpdateButton<Post> data={{ view: 0 }} />;
  });

  it("a bare button takes a loose record", () => {
    <UpdateButton data={{ anything: 1 }} />;
    <BulkUpdateButton data={{ anything: 1 }} />;
  });

  it("CanAccess takes a record typed by an interface", () => {
    expectTypeOf<CanAccessProps["record"]>().toEqualTypeOf<
      ResourceRecord | undefined
    >();
    const post: Post = { id: 1, title: "a", views: 2 };
    <CanAccess action="edit" resource="posts" record={post}>
      {null}
    </CanAccess>;
  });
});
